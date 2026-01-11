import { describe, test, expect } from "bun:test";
import {
  calculateMovingAverageStrategy,
  getTieredMAMultiplier,
} from "../lib/strategies/moving-average";

describe("Moving Average Strategy", () => {
  describe("calculateMovingAverageStrategy", () => {
    test("applies multiplier when price is below MA", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        90000,
        100000
      );

      expect(result.amountAUD).toBe(200);
      expect(result.multiplierApplied).toBe(2);
      expect(result.reason).toContain("BELOW");
    });

    test("uses base amount when price is above MA", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        110000,
        100000
      );

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
      expect(result.reason).toContain("above");
    });

    test("uses base amount when price equals MA", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        100000,
        100000
      );

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
    });

    test("handles null MA gracefully", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        90000,
        null
      );

      expect(result.amountAUD).toBe(100);
      expect(result.multiplierApplied).toBe(1);
      expect(result.priceVsMAPercent).toBeNull();
      expect(result.reason).toContain("not available");
    });

    test("calculates correct percentage below MA", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        80000,
        100000
      );

      expect(result.priceVsMAPercent).toBe(-20);
    });

    test("calculates correct percentage above MA", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 100, multiplierBelow200MA: 2 },
        120000,
        100000
      );

      expect(result.priceVsMAPercent).toBe(20);
    });

    test("applies custom multiplier", () => {
      const result = calculateMovingAverageStrategy(
        { baseAmountAUD: 50, multiplierBelow200MA: 3 },
        80000,
        100000
      );

      expect(result.amountAUD).toBe(150);
      expect(result.multiplierApplied).toBe(3);
    });
  });

  describe("getTieredMAMultiplier", () => {
    const tiers = [
      { percentBelow: 5, multiplier: 1.5 },
      { percentBelow: 10, multiplier: 2 },
      { percentBelow: 20, multiplier: 3 },
    ];

    test("returns 1 when price is above MA", () => {
      const result = getTieredMAMultiplier(110000, 100000, tiers);
      expect(result).toBe(1);
    });

    test("returns 1 when price equals MA", () => {
      const result = getTieredMAMultiplier(100000, 100000, tiers);
      expect(result).toBe(1);
    });

    test("returns first tier multiplier", () => {
      const result = getTieredMAMultiplier(93000, 100000, tiers);
      expect(result).toBe(1.5);
    });

    test("returns second tier multiplier", () => {
      const result = getTieredMAMultiplier(88000, 100000, tiers);
      expect(result).toBe(2);
    });

    test("returns highest tier multiplier for deep discount", () => {
      const result = getTieredMAMultiplier(75000, 100000, tiers);
      expect(result).toBe(3);
    });

    test("returns 1 when MA is null", () => {
      const result = getTieredMAMultiplier(90000, null, tiers);
      expect(result).toBe(1);
    });
  });
});
