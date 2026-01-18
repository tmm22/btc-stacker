import { describe, test, expect, mock } from "bun:test";
import { createBitarooClient } from "../lib/bitaroo";

describe("Bitaroo API Client", () => {
  describe("createBitarooClient", () => {
    test("creates client with API key", () => {
      const client = createBitarooClient("test-key.test-secret");
      expect(client).toBeDefined();
    });
  });

  describe("getCurrentPrice", () => {
    test("calculates mid price from orderbook", async () => {
      const mockOrderbook = {
        bids: [["100000", "1"]],
        asks: [["100100", "1"]],
      };

      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrderbook),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        const result = await client.getCurrentPrice();

        expect(result.bid).toBe("100000");
        expect(result.ask).toBe("100100");
        expect(result.mid).toBe("100050.00");
      } finally {
        global.fetch = originalFetch;
      }
    });

    test("handles empty orderbook", async () => {
      const mockOrderbook = {
        bids: [],
        asks: [],
      };

      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrderbook),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        const result = await client.getCurrentPrice();

        expect(result.bid).toBe("0");
        expect(result.ask).toBe("0");
        expect(result.mid).toBe("0.00");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("buyWithAUD", () => {
    test("calculates correct BTC amount with slippage", async () => {
      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      let capturedBody: string | undefined;

      global.fetch = mock((url: string, options?: RequestInit) => {
        if (url.includes("/orderbook")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                bids: [["100000", "1"]],
                asks: [["100000", "1"]],
              }),
          } as Response);
        }

        if (options?.method === "POST") {
          capturedBody = options.body as string;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ orderId: "12345" }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Not found"),
        } as Response);
      }) as unknown as typeof fetch;

      try {
        const result = await client.buyWithAUD("100", 1);

        expect(result.orderId).toBe(12345);
        expect(capturedBody).toBeDefined();

        const body = JSON.parse(capturedBody!);
        expect(body.orderType).toBe("limit");
        expect(body.side).toBe("buy");
        expect(parseFloat(body.price)).toBeCloseTo(101000, -2);
        expect(parseFloat(body.amount)).toBeCloseTo(0.00099, 4);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("testConnection", () => {
    test("returns true on successful balance fetch", async () => {
      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        const result = await client.testConnection();
        expect(result).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test("throws on failed balance fetch", async () => {
      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized"),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        await expect(client.testConnection()).rejects.toThrow();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("getBalance", () => {
    test("returns specific asset balance", async () => {
      const mockBalances = [
        {
          assetSymbol: "aud",
          available: "1000.00",
          locked: "0",
          balance: "1000.00",
        },
        {
          assetSymbol: "btc",
          available: "0.5",
          locked: "0.1",
          balance: "0.6",
        },
      ];

      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalances),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        const audBalance = await client.getBalance("AUD");
        const btcBalance = await client.getBalance("BTC");

        expect(audBalance?.available).toBe("1000.00");
        expect(btcBalance?.balance).toBe("0.6");
      } finally {
        global.fetch = originalFetch;
      }
    });

    test("returns null for missing asset", async () => {
      const client = createBitarooClient("test.key");

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      ) as unknown as typeof fetch;

      try {
        const result = await client.getBalance("AUD");
        expect(result).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
