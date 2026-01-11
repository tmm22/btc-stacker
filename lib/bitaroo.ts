const BITAROO_API_BASE = "https://api.bitaroo.com.au/v1";

export interface BitarooBalance {
  asset: string;
  available: string;
  locked: string;
  total: string;
}

export interface BitarooOrderbook {
  bids: [string, string][];
  asks: [string, string][];
}

export interface BitarooOrder {
  orderId: number;
  orderType: "market" | "limit";
  side: "buy" | "sell";
  price: string;
  amount: string;
  filled: string;
  status: "open" | "closed" | "cancelled";
  createdAt: string;
}

export interface BitarooTrade {
  tradeId: number;
  orderId: number;
  price: string;
  amount: string;
  fee: string;
  side: "buy" | "sell";
  timestamp: string;
}

export interface CreateOrderParams {
  orderType: "market" | "limit";
  side: "buy" | "sell";
  amount: string;
  price?: string;
  tif?: "gtc" | "ioc" | "fok" | "moc";
}

export interface CreateOrderResponse {
  orderId: number;
}

class BitarooClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BITAROO_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitaroo API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getBalances(): Promise<BitarooBalance[]> {
    return this.request<BitarooBalance[]>("/balances");
  }

  async getBalance(asset: "AUD" | "BTC"): Promise<BitarooBalance | null> {
    const balances = await this.getBalances();
    return balances.find((b) => b.asset === asset) || null;
  }

  async getOrderbook(): Promise<BitarooOrderbook> {
    return this.request<BitarooOrderbook>("/orderbook");
  }

  async getCurrentPrice(): Promise<{ bid: number; ask: number; mid: number }> {
    const orderbook = await this.getOrderbook();

    const bestBid = orderbook.bids.length > 0 ? parseFloat(orderbook.bids[0][0]) : 0;
    const bestAsk = orderbook.asks.length > 0 ? parseFloat(orderbook.asks[0][0]) : 0;

    return {
      bid: bestBid,
      ask: bestAsk,
      mid: (bestBid + bestAsk) / 2,
    };
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    return this.request<CreateOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async createBuyOrder(
    amountBTC: number,
    price?: number
  ): Promise<CreateOrderResponse> {
    const params: CreateOrderParams = {
      orderType: price ? "limit" : "market",
      side: "buy",
      amount: amountBTC.toFixed(8),
    };

    if (price) {
      params.price = price.toFixed(2);
      params.tif = "gtc";
    }

    return this.createOrder(params);
  }

  async buyWithAUD(
    amountAUD: number,
    slippagePercent: number = 1
  ): Promise<CreateOrderResponse> {
    const { ask } = await this.getCurrentPrice();
    const priceWithSlippage = ask * (1 + slippagePercent / 100);
    const btcAmount = amountAUD / priceWithSlippage;

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

    return this.request<BitarooOrder[]>(endpoint);
  }

  async getOrder(orderId: number): Promise<BitarooOrder> {
    return this.request<BitarooOrder>(`/orders?orderId=${orderId}`);
  }

  async cancelOrder(orderId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  async getTrades(): Promise<BitarooTrade[]> {
    return this.request<BitarooTrade[]>("/trades");
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getBalances();
      return true;
    } catch {
      return false;
    }
  }
}

export function createBitarooClient(apiKey: string): BitarooClient {
  return new BitarooClient(apiKey);
}

export type { BitarooClient };
