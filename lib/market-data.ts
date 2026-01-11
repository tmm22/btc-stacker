import { createBitarooClient } from "./bitaroo";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

export interface MarketData {
  price: number;
  ma200: number | null;
  rsi14: number | null;
  timestamp: number;
}

export interface PriceHistory {
  prices: [number, number][];
}

export async function fetchBitcoinPriceFromBitaroo(
  apiKey: string
): Promise<number> {
  const client = createBitarooClient(apiKey);
  const { mid } = await client.getCurrentPrice();
  return mid;
}

export async function fetchBitcoinPriceAUD(): Promise<number> {
  const response = await fetch(
    `${COINGECKO_API_BASE}/simple/price?ids=bitcoin&vs_currencies=aud`
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  return data.bitcoin.aud;
}

export async function fetchHistoricalPrices(days: number = 200): Promise<number[]> {
  const response = await fetch(
    `${COINGECKO_API_BASE}/coins/bitcoin/market_chart?vs_currency=aud&days=${days}&interval=daily`
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data: PriceHistory = await response.json();
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

export function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) {
    return null;
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const relevantChanges = changes.slice(-(period));

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
