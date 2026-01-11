import { describe, test, expect } from "bun:test";
import {
  calculateValueAveraging,
  calculateTargetPortfolioValue,
  calculatePeriodsSinceStart,
} from "../lib/strategies/value-averaging";

describe("Value Averaging Strategy", () => {
  describe("calculateValueAveraging", () => {
    test("calculates required purchase when below target", () => {
      const result = calculateValueAveraging(
        { targetGrowthAUD: 100, frequency: "weekly" },
        800,
        1000
      );

      expect(result.amountAUD).toBe(200);
      expect(result.shouldBuy).toBe(true);
      expect(result.reason).toContain("$200.00");
    });

    test("returns zero when current value meets target", () => {
      const result = calculateValueAveraging(
        { targetGrowthAUD: 100, frequency: "weekly" },
        1000,
        1000
      );

      expect(result.amountAUD).toBe(0);
      expect(result.shouldBuy).toBe(false);
    });

    test("returns zero when current value exceeds target", () => {
      const result = calculateValueAveraging(
        { targetGrowthAUD: 100, frequency: "weekly" },
        1200,
        1000
      );

      expect(result.amountAUD).toBe(0);
      expect(result.shouldBuy).toBe(false);
      expect(result.reason).toContain("exceeds target");
    });

    test("handles large deficits", () => {
      const result = calculateValueAveraging(
        { targetGrowthAUD: 100, frequency: "weekly" },
        500,
        2000
      );

      expect(result.amountAUD).toBe(1500);
      expect(result.shouldBuy).toBe(true);
    });
  });

  describe("calculateTargetPortfolioValue", () => {
    test("calculates target after 0 periods", () => {
      const result = calculateTargetPortfolioValue(1000, 100, 0);
      expect(result).toBe(1000);
    });

    test("calculates target after 1 period", () => {
      const result = calculateTargetPortfolioValue(1000, 100, 1);
      expect(result).toBe(1100);
    });

    test("calculates target after 10 periods", () => {
      const result = calculateTargetPortfolioValue(1000, 100, 10);
      expect(result).toBe(2000);
    });

    test("handles zero initial investment", () => {
      const result = calculateTargetPortfolioValue(0, 100, 5);
      expect(result).toBe(500);
    });
  });

  describe("calculatePeriodsSinceStart", () => {
    test("calculates daily periods", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      const result = calculatePeriodsSinceStart(startDate, "daily");
      expect(result).toBe(10);
    });

    test("calculates weekly periods", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      const result = calculatePeriodsSinceStart(startDate, "weekly");
      expect(result).toBe(3);
    });

    test("returns 0 for same day start", () => {
      const result = calculatePeriodsSinceStart(new Date(), "daily");
      expect(result).toBe(0);
    });
  });
});
