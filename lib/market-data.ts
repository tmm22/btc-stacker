import { z } from "zod";
import { createBitarooClient } from "./bitaroo";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const CACHE_TTL_MS = 60000;

const SimplePriceSchema = z.object({
  bitcoin: z.object({
    aud: z.number(),
  }),
});

const MarketChartSchema = z.object({
  prices: z.array(z.tuple([z.number(), z.number()])),
});

export interface MarketData {
  price: number;
  ma200: number | null;
  rsi14: number | null;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<unknown>> = new Map();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export class MarketDataError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;

  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  return null;
}

async function fetchWithRetry<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: { cacheKey?: string; timeoutMs?: number }
): Promise<T> {
  const { cacheKey, timeoutMs = DEFAULT_TIMEOUT_MS } = options ?? {};

  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const isRetryable = isRetryableStatus(response.status);

        if (isRetryable && attempt < MAX_RETRIES - 1) {
          const retryAfterMs = getRetryAfterMs(response);
          const delayMs =
            retryAfterMs ?? INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delayMs);
          continue;
        }

        let message = "Market data request failed";
        if (response.status === 429) {
          message = "Rate limit exceeded - please try again later";
        } else if (response.status >= 500) {
          message = "Market data service temporarily unavailable";
        }

        throw new MarketDataError(message, response.status, isRetryable);
      }

      const data = await response.json();
      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error(
          "Market data API response validation failed:",
          parsed.error.issues
        );
        throw new MarketDataError(
          "Invalid response format from market data API",
          undefined,
          false
        );
      }

      if (cacheKey) {
        setCache(cacheKey, parsed.data);
      }

      return parsed.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof MarketDataError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new MarketDataError("Request timed out", undefined, true);
        if (attempt < MAX_RETRIES - 1) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.name === "TypeError" ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND") ||
            error.message.includes("network")));

      if (isNetworkError) {
        lastError = new MarketDataError(
          "Network connection failed",
          undefined,
          true
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      throw error;
    }
  }

  throw lastError ?? new MarketDataError("Request failed after retries");
}

export async function fetchBitcoinPriceFromBitaroo(
  apiKey: string
): Promise<number> {
  const client = createBitarooClient(apiKey);
  const { mid } = await client.getCurrentPrice();
  return parseFloat(mid);
}

export async function fetchBitcoinPriceAUD(): Promise<number> {
  const url = `${COINGECKO_API_BASE}/simple/price?ids=bitcoin&vs_currencies=aud`;
  const data = await fetchWithRetry(url, SimplePriceSchema, {
    cacheKey: "btc_price_aud",
  });
  return data.bitcoin.aud;
}

export async function fetchHistoricalPrices(
  days: number = 200,
  currency: string = "aud",
  interval: string = "daily"
): Promise<number[]> {
  const url = `${COINGECKO_API_BASE}/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}&interval=${interval}`;
  const cacheKey = `historical_prices_${currency}_${days}_${interval}`;
  const data = await fetchWithRetry(url, MarketChartSchema, { cacheKey });
  return data.prices.map(([, price]) => price);
}

export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }

  const relevantPrices = prices.slice(-period);
  const sum = relevantPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

export function calculate200DayMA(prices: number[]): number | null {
  return calculateSMA(prices, 200);
}

export function calculateRSI(
  prices: number[],
  period: number = 14
): number | null {
  if (prices.length < period + 1) {
    return null;
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const relevantChanges = changes.slice(-period);

  let gains = 0;
  let losses = 0;

  for (const change of relevantChanges) {
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

export async function fetchMarketData(apiKey?: string): Promise<MarketData> {
  const [currentPrice, historicalPrices] = await Promise.all([
    apiKey ? fetchBitcoinPriceFromBitaroo(apiKey) : fetchBitcoinPriceAUD(),
    fetchHistoricalPrices(200),
  ]);

  const allPrices = [...historicalPrices, currentPrice];

  return {
    price: currentPrice,
    ma200: calculate200DayMA(allPrices),
    rsi14: calculateRSI(allPrices, 14),
    timestamp: Date.now(),
  };
}

export function isPriceBelowMA(
  currentPrice: number,
  ma200: number | null
): boolean {
  if (ma200 === null) return false;
  return currentPrice < ma200;
}

export function getPriceToMAPercentage(
  currentPrice: number,
  ma200: number | null
): number | null {
  if (ma200 === null) return null;
  return ((currentPrice - ma200) / ma200) * 100;
}

export function getRSICondition(
  rsi: number | null
): "oversold" | "neutral" | "overbought" | null {
  if (rsi === null) return null;
  if (rsi < 30) return "oversold";
  if (rsi > 70) return "overbought";
  return "neutral";
}

export function clearCache(): void {
  cache.clear();
}
