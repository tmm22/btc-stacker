export interface ValueAveragingConfig {
  targetGrowthAUD: number;
  frequency: "daily" | "weekly" | "monthly";
}

export interface ValueAveragingResult {
  amountAUD: number;
  reason: string;
  shouldBuy: boolean;
}

export function calculateValueAveraging(
  config: ValueAveragingConfig,
  currentPortfolioValueAUD: number,
  targetPortfolioValueAUD: number
): ValueAveragingResult {
  const requiredAmount = targetPortfolioValueAUD - currentPortfolioValueAUD;

  if (requiredAmount <= 0) {
    return {
      amountAUD: 0,
      shouldBuy: false,
      reason: `Portfolio value ($${currentPortfolioValueAUD.toFixed(2)}) meets or exceeds target ($${targetPortfolioValueAUD.toFixed(2)}). No purchase needed.`,
    };
  }

  return {
    amountAUD: requiredAmount,
    shouldBuy: true,
    reason: `Value Averaging: Need to buy $${requiredAmount.toFixed(2)} AUD to reach target of $${targetPortfolioValueAUD.toFixed(2)}`,
  };
}

export function calculateTargetPortfolioValue(
  initialInvestment: number,
  targetGrowthAUD: number,
  periodsSinceStart: number
): number {
  return initialInvestment + targetGrowthAUD * periodsSinceStart;
}

export function calculatePeriodsSinceStart(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly"
): number {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case "daily":
      return Math.floor(diffDays);
    case "weekly":
      return Math.floor(diffDays / 7);
    case "monthly":
      const months =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      return Math.max(0, months);
  }
}
