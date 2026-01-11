import { describe, test, expect } from "bun:test";
import { calculateDCAAmount, getNextDCADate, frequencyToCron } from "../lib/strategies/dca";

describe("DCA Strategy", () => {
  describe("calculateDCAAmount", () => {
    test("returns configured amount for daily frequency", () => {
      const result = calculateDCAAmount({
        amountAUD: 100,
        frequency: "daily",
      });

      expect(result.amountAUD).toBe(100);
      expect(result.reason).toContain("$100.00");
      expect(result.reason).toContain("daily");
    });

    test("returns configured amount for weekly frequency", () => {
      const result = calculateDCAAmount({
        amountAUD: 250,
        frequency: "weekly",
      });

      expect(result.amountAUD).toBe(250);
      expect(result.reason).toContain("$250.00");
      expect(result.reason).toContain("weekly");
    });

    test("returns configured amount for monthly frequency", () => {
      const result = calculateDCAAmount({
        amountAUD: 500,
        frequency: "monthly",
      });

      expect(result.amountAUD).toBe(500);
      expect(result.reason).toContain("monthly");
    });

    test("handles decimal amounts", () => {
      const result = calculateDCAAmount({
        amountAUD: 99.99,
        frequency: "weekly",
      });

      expect(result.amountAUD).toBe(99.99);
    });
  });

  describe("getNextDCADate", () => {
    test("returns now if no lastRun provided", () => {
      const result = getNextDCADate(null, "daily");
      const now = new Date();

      expect(result.getTime()).toBeCloseTo(now.getTime(), -3);
    });

    test("adds 1 day for daily frequency", () => {
      const lastRun = new Date();
      lastRun.setHours(9, 0, 0, 0);
      const result = getNextDCADate(lastRun, "daily");

      const expected = new Date(lastRun);
      expected.setDate(expected.getDate() + 1);

      expect(result.getDate()).toBe(expected.getDate());
    });

    test("adds 7 days for weekly frequency", () => {
      const lastRun = new Date();
      lastRun.setHours(9, 0, 0, 0);
      const result = getNextDCADate(lastRun, "weekly");

      const expected = new Date(lastRun);
      expected.setDate(expected.getDate() + 7);

      expect(result.getDate()).toBe(expected.getDate());
    });

    test("adds 1 month for monthly frequency", () => {
      const lastRun = new Date();
      lastRun.setHours(9, 0, 0, 0);
      const result = getNextDCADate(lastRun, "monthly");

      const expected = new Date(lastRun);
      expected.setMonth(expected.getMonth() + 1);

      expect(result.getMonth()).toBe(expected.getMonth());
    });

    test("returns now if calculated next date is in the past", () => {
      const lastRun = new Date("2020-01-01");
      const result = getNextDCADate(lastRun, "daily");
      const now = new Date();

      expect(result.getTime()).toBeCloseTo(now.getTime(), -3);
    });
  });

  describe("frequencyToCron", () => {
    test("generates daily cron expression", () => {
      expect(frequencyToCron("daily")).toBe("0 9 * * *");
    });

    test("generates weekly cron expression", () => {
      expect(frequencyToCron("weekly")).toBe("0 9 * * 1");
    });

    test("generates monthly cron expression", () => {
      expect(frequencyToCron("monthly")).toBe("0 9 1 * *");
    });
  });
});
