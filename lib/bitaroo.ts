import { z } from "zod";

const BITAROO_API_BASE = "https://api.bitaroo.com.au/v1";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

const BalanceSchema = z.object({
  assetSymbol: z.string(),
  available: z.string(),
  locked: z.string(),
  balance: z.string(),
});

const BalancesResponseSchema = z.array(BalanceSchema);

const OrderbookSchema = z.object({
  bids: z.array(z.tuple([z.string(), z.string()])),
  asks: z.array(z.tuple([z.string(), z.string()])),
});

const OrderSchema = z.object({
  orderId: z.number(),
  orderType: z.enum(["market", "limit"]),
  side: z.enum(["buy", "sell"]),
  price: z.string(),
  amount: z.string(),
  filled: z.string(),
  status: z.enum(["open", "closed", "cancelled"]),
  createdAt: z.string(),
});

const OrdersResponseSchema = z.array(OrderSchema);

const TradeSchema = z.object({
  tradeId: z.number(),
  orderId: z.number(),
  price: z.string(),
  amount: z.string(),
  fee: z.string(),
  side: z.enum(["buy", "sell"]),
  timestamp: z.string(),
});

const TradesResponseSchema = z.array(TradeSchema);

const CreateOrderResponseSchema = z.object({
  orderId: z.number(),
});

const CancelOrderResponseSchema = z.object({
  success: z.boolean(),
});

export type BitarooBalance = z.infer<typeof BalanceSchema>;
export type BitarooOrderbook = z.infer<typeof OrderbookSchema>;
export type BitarooOrder = z.infer<typeof OrderSchema>;
export type BitarooTrade = z.infer<typeof TradeSchema>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

export interface CreateOrderParams {
  orderType: "market" | "limit";
  side: "buy" | "sell";
  amount: string;
  price?: string;
  tif?: "gtc" | "ioc" | "fok" | "moc";
}

export class BitarooApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "BitarooApiError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

function sanitizeErrorMessage(status: number, rawMessage: string): string {
  if (status === 401 || rawMessage.includes("wrong-token")) {
    return "Invalid API credentials";
  }
  if (status === 403) {
    return "API key lacks required permissions";
  }
  if (status === 429) {
    return "Rate limit exceeded";
  }
  if (status >= 500) {
    return "Bitaroo service temporarily unavailable";
  }
  if (status === 400) {
    return "Invalid request parameters";
  }
  return "API request failed";
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

  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return null;
}

class BitarooClient {
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema: z.ZodType<T>
  ): Promise<T> {
    const url = `${BITAROO_API_BASE}${endpoint}`;
    let lastError: Error | null = null;
    const hasBody = options.method === "POST" || options.method === "PUT" || options.method === "PATCH";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        };
        if (hasBody) {
          (headers as Record<string, string>)["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const rawError = await response.text();
          const isRetryable = isRetryableStatus(response.status);

          if (isRetryable && attempt < MAX_RETRIES - 1) {
            const retryAfterMs = getRetryAfterMs(response);
            const delayMs =
              retryAfterMs ?? INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
            await sleep(delayMs);
            continue;
          }

          throw new BitarooApiError(
            sanitizeErrorMessage(response.status, rawError),
            response.status,
            isRetryable
          );
        }

        const data = await response.json();
        const parsed = schema.safeParse(data);

        if (!parsed.success) {
          console.error(
            "Bitaroo API response validation failed:",
            parsed.error.issues
          );
          throw new BitarooApiError(
            "Invalid response format from Bitaroo API",
            undefined,
            false
          );
        }

        return parsed.data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof BitarooApiError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          lastError = new BitarooApiError(
            "Request timed out",
            undefined,
            true
          );
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
          lastError = new BitarooApiError(
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

    throw lastError ?? new BitarooApiError("Request failed after retries");
  }

  async getBalances(): Promise<BitarooBalance[]> {
    return this.request("/balances", {}, BalancesResponseSchema);
  }

  async getBalance(asset: "AUD" | "BTC"): Promise<BitarooBalance | null> {
    const balances = await this.getBalances();
    return (
      balances.find(
        (b) => b.assetSymbol.toLowerCase() === asset.toLowerCase()
      ) || null
    );
  }

  async getOrderbook(): Promise<BitarooOrderbook> {
    return this.request("/orderbook", {}, OrderbookSchema);
  }

  async getCurrentPrice(): Promise<{ bid: string; ask: string; mid: string }> {
    const orderbook = await this.getOrderbook();

    const bestBid = orderbook.bids.length > 0 ? orderbook.bids[0][0] : "0";
    const bestAsk = orderbook.asks.length > 0 ? orderbook.asks[0][0] : "0";

    const bidNum = parseFloat(bestBid);
    const askNum = parseFloat(bestAsk);
    const midNum = (bidNum + askNum) / 2;

    return {
      bid: bestBid,
      ask: bestAsk,
      mid: midNum.toFixed(2),
    };
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    return this.request(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      CreateOrderResponseSchema
    );
  }

  async createBuyOrder(
    amountBTC: string,
    price?: string
  ): Promise<CreateOrderResponse> {
    const params: CreateOrderParams = {
      orderType: price ? "limit" : "market",
      side: "buy",
      amount: amountBTC,
    };

    if (price) {
      params.price = price;
      params.tif = "gtc";
    }

    return this.createOrder(params);
  }

  async buyWithAUD(
    amountAUD: string,
    slippagePercent: number = 1
  ): Promise<CreateOrderResponse> {
    const { ask } = await this.getCurrentPrice();
    const askNum = parseFloat(ask);
    const amountNum = parseFloat(amountAUD);

    const priceWithSlippage = askNum * (1 + slippagePercent / 100);
    const btcAmount = amountNum / priceWithSlippage;

    return this.createOrder({
      orderType: "limit",
      side: "buy",
      amount: btcAmount.toFixed(8),
      price: priceWithSlippage.toFixed(2),
      tif: "ioc",
    });
  }

  async getOrders(options?: {
    activeOnly?: boolean;
    historyOnly?: boolean;
  }): Promise<BitarooOrder[]> {
    const params = new URLSearchParams();
    if (options?.activeOnly) params.set("activeOnly", "true");
    if (options?.historyOnly) params.set("historyOnly", "true");

    const query = params.toString();
    const endpoint = query ? `/orders?${query}` : "/orders";

    return this.request(endpoint, {}, OrdersResponseSchema);
  }

  async getOrder(orderId: number): Promise<BitarooOrder> {
    return this.request(`/orders?orderId=${orderId}`, {}, OrderSchema);
  }

  async cancelOrder(orderId: number): Promise<{ success: boolean }> {
    return this.request(
      `/orders/${orderId}`,
      { method: "DELETE" },
      CancelOrderResponseSchema
    );
  }

  async getTrades(): Promise<BitarooTrade[]> {
    return this.request("/trades", {}, TradesResponseSchema);
  }

  async testConnection(): Promise<boolean> {
    await this.getBalances();
    return true;
  }
}

export function createBitarooClient(
  apiKey: string,
  timeoutMs?: number
): BitarooClient {
  return new BitarooClient(apiKey, timeoutMs);
}

export type { BitarooClient };
