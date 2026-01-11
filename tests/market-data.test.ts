import { describe, test, expect } from "bun:test";
import { calculateSMA, calculateRSI, calculate200DayMA } from "../lib/market-data";

describe("Market Data Calculations", () => {
  describe("calculateSMA", () => {
    test("calculates simple moving average correctly", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateSMA(prices, 5);

      expect(result).toBe(30);
    });

    test("uses only the last N prices", () => {
      const prices = [100, 10, 20, 30, 40, 50];
      const result = calculateSMA(prices, 5);

      expect(result).toBe(30);
    });

    test("returns null when not enough data", () => {
      const prices = [10, 20, 30];
      const result = calculateSMA(prices, 5);

      expect(result).toBeNull();
    });

    test("handles single price with period 1", () => {
      const prices = [100];
      const result = calculateSMA(prices, 1);

      expect(result).toBe(100);
    });

    test("handles decimal prices", () => {
      const prices = [10.5, 20.5, 30.5];
      const result = calculateSMA(prices, 3);

      expect(result).toBeCloseTo(20.5, 5);
    });
  });

  describe("calculate200DayMA", () => {
    test("returns null when less than 200 prices", () => {
      const prices = Array(199).fill(100);
      const result = calculate200DayMA(prices);

      expect(result).toBeNull();
    });

    test("calculates 200-day MA with exactly 200 prices", () => {
      const prices = Array(200).fill(100);
      const result = calculate200DayMA(prices);

      expect(result).toBe(100);
    });

    test("uses last 200 prices only", () => {
      const prices = [
        ...Array(100).fill(50),
        ...Array(200).fill(100),
      ];
      const result = calculate200DayMA(prices);

      expect(result).toBe(100);
    });
  });

  describe("calculateRSI", () => {
    test("returns 100 when all gains", () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      const result = calculateRSI(prices, 14);

      expect(result).toBe(100);
    });

    test("returns low RSI when all losses", () => {
      const prices = [100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85];
      const result = calculateRSI(prices, 14);

      expect(result).toBe(0);
    });

    test("returns ~50 RSI for balanced gains/losses", () => {
      const prices = [100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101];
      const result = calculateRSI(prices, 14);

      expect(result).toBeCloseTo(50, 0);
    });

    test("returns null when not enough data", () => {
      const prices = [10, 11, 12];
      const result = calculateRSI(prices, 14);

      expect(result).toBeNull();
    });

    test("handles flat prices", () => {
      const prices = Array(20).fill(100);
      const result = calculateRSI(prices, 14);

      expect(result).toBe(100);
    });
  });
});
