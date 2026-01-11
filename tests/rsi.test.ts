import { describe, test, expect } from "bun:test";
import {
  calculateRSIStrategy,
  getDefaultRSIThresholds,
} from "../lib/strategies/rsi";

describe("RSI Strategy", () => {
  describe("calculateRSIStrategy", () => {
    const defaultConfig = {
      baseAmountAUD: 100,
      rsiThresholds: getDefaultRSIThresholds(),
    };

    test("applies 2x multiplier when RSI < 30", () => {
      const result = calculateRSIStrategy(defaultConfig, 25);

      expect(result.amountAUD).toBe(200);
      expect(result.multiplierApplied).toBe(2);
      expect(result.condition).toBe("extreme_oversold");
      expect(result.reason).toContain("EXTREME OVERSOLD");
    });

    test("applies 1.5x multiplier when RSI is 30-40", () => {
      const result = calculateRSIStrategy(defaultConfig, 35);

      expect(result.amountAUD).toBe(150);
      expect(result.multiplierApplied).toBe(1.5);
      expect(result.condition).toBe("oversold");
    });

    test("applies 1.2x multiplier when RSI is 40-50", () => {
      const result = calculateRSIStrategy(defaultConfig, 45);

      expect(result.amountAUD).toBe(120);
      expect(result.multiplierApplied).toBe(1.2);
      expect(result.condition).toBe("mild_oversold");
    });

    test("uses base amount when RSI >= 50", () => {
      const result = calculateRSIStrategy(defaultConfig, 55);

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
      expect(result.condition).toBe("neutral");
    });

    test("uses base amount when RSI is 70 (overbought)", () => {
      const result = calculateRSIStrategy(defaultConfig, 70);

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
      expect(result.condition).toBe("neutral");
    });

    test("handles null RSI gracefully", () => {
      const result = calculateRSIStrategy(defaultConfig, null);

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
      expect(result.currentRSI).toBeNull();
      expect(result.condition).toBe("neutral");
      expect(result.reason).toContain("not available");
    });

    test("handles RSI at exact thresholds", () => {
      expect(calculateRSIStrategy(defaultConfig, 30).condition).toBe("oversold");
      expect(calculateRSIStrategy(defaultConfig, 40).condition).toBe("mild_oversold");
      expect(calculateRSIStrategy(defaultConfig, 50).condition).toBe("neutral");
    });

    test("applies custom thresholds", () => {
      const customConfig = {
        baseAmountAUD: 100,
        rsiThresholds: {
          below30: 3,
          below40: 2,
          below50: 1.5,
        },
      };

      const result = calculateRSIStrategy(customConfig, 25);
      expect(result.amountAUD).toBe(300);
      expect(result.multiplierApplied).toBe(3);
    });

    test("correctly reports current RSI", () => {
      const result = calculateRSIStrategy(defaultConfig, 42.5);
      expect(result.currentRSI).toBe(42.5);
    });
  });

  describe("getDefaultRSIThresholds", () => {
    test("returns correct default values", () => {
      const thresholds = getDefaultRSIThresholds();

      expect(thresholds.below30).toBe(2);
      expect(thresholds.below40).toBe(1.5);
      expect(thresholds.below50).toBe(1.2);
    });
  });
});
