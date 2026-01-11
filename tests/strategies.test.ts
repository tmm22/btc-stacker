import { describe, test, expect } from "bun:test";
import { executeStrategy, combineStrategies } from "../lib/strategies";
import type { MarketData } from "../lib/market-data";

describe("Strategy Orchestrator", () => {
  const mockMarketData: MarketData = {
    price: 100000,
    ma200: 110000,
    rsi14: 35,
    timestamp: Date.now(),
  };

  describe("executeStrategy", () => {
    test("executes DCA strategy", () => {
      const result = executeStrategy(
        "dca",
        { amountAUD: 100, frequency: "weekly" },
        mockMarketData
      );

      expect(result.strategyType).toBe("dca");
      expect(result.amountAUD).toBe(100);
      expect(result.shouldBuy).toBe(true);
    });

    test("executes moving_average strategy with price below MA", () => {
      const result = executeStrategy(
        "moving_average",
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        mockMarketData
      );

      expect(result.strategyType).toBe("moving_average");
      expect(result.amountAUD).toBe(200);
      expect(result.shouldBuy).toBe(true);
    });

    test("executes RSI strategy with oversold condition", () => {
      const result = executeStrategy(
        "rsi",
        {
          baseAmountAUD: 100,
          rsiThresholds: { below30: 2, below40: 1.5, below50: 1.2 },
        },
        mockMarketData
      );

      expect(result.strategyType).toBe("rsi");
      expect(result.amountAUD).toBe(150);
      expect(result.shouldBuy).toBe(true);
    });

    test("includes market data in result", () => {
      const result = executeStrategy(
        "dca",
        { amountAUD: 100 },
        mockMarketData
      );

      expect(result.marketData.price).toBe(100000);
      expect(result.marketData.ma200).toBe(110000);
      expect(result.marketData.rsi14).toBe(35);
    });

    test("throws on unknown strategy", () => {
      expect(() =>
        executeStrategy(
          "unknown" as never,
          {},
          mockMarketData
        )
      ).toThrow("Unknown strategy type");
    });
  });

  describe("combineStrategies", () => {
    test("combines strategies with equal weights", () => {
      const result = combineStrategies(
        [
          { type: "dca", config: { amountAUD: 100 }, weight: 1 },
          { type: "dca", config: { amountAUD: 200 }, weight: 1 },
        ],
        mockMarketData
      );

      expect(result.amountAUD).toBe(150);
    });

    test("combines strategies with different weights", () => {
      const result = combineStrategies(
        [
          { type: "dca", config: { amountAUD: 100 }, weight: 1 },
          { type: "dca", config: { amountAUD: 200 }, weight: 3 },
        ],
        mockMarketData
      );

      expect(result.amountAUD).toBe(175);
    });

    test("combines different strategy types", () => {
      const result = combineStrategies(
        [
          { type: "dca", config: { amountAUD: 100 }, weight: 1 },
          {
            type: "moving_average",
            config: { baseAmountAUD: 100, multiplierBelow200MA: 2 },
            weight: 1,
          },
        ],
        mockMarketData
      );

      expect(result.amountAUD).toBe(150);
      expect(result.reason).toContain("dca");
      expect(result.reason).toContain("moving_average");
    });
  });
});
