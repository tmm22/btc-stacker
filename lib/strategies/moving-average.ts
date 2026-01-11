export interface MovingAverageConfig {
  baseAmountAUD: number;
  multiplierBelow200MA: number;
}

export interface MovingAverageResult {
  amountAUD: number;
  reason: string;
  multiplierApplied: number;
  priceVsMAPercent: number | null;
}

export function calculateMovingAverageStrategy(
  config: MovingAverageConfig,
  currentPrice: number,
  ma200: number | null
): MovingAverageResult {
  if (ma200 === null) {
    return {
      amountAUD: config.baseAmountAUD,
      multiplierApplied: 1,
      priceVsMAPercent: null,
      reason: `200-day MA not available. Using base amount: $${config.baseAmountAUD.toFixed(2)} AUD`,
    };
  }

  const priceVsMAPercent = ((currentPrice - ma200) / ma200) * 100;
  const isBelowMA = currentPrice < ma200;

  if (isBelowMA) {
    const amountAUD = config.baseAmountAUD * config.multiplierBelow200MA;
    return {
      amountAUD,
      multiplierApplied: config.multiplierBelow200MA,
      priceVsMAPercent,
      reason: `Price ($${currentPrice.toFixed(0)}) is ${Math.abs(priceVsMAPercent).toFixed(1)}% BELOW 200-day MA ($${ma200.toFixed(0)}). Buying $${amountAUD.toFixed(2)} AUD (${config.multiplierBelow200MA}x multiplier)`,
    };
  }

  return {
    amountAUD: config.baseAmountAUD,
    multiplierApplied: 1,
    priceVsMAPercent,
    reason: `Price ($${currentPrice.toFixed(0)}) is ${priceVsMAPercent.toFixed(1)}% above 200-day MA ($${ma200.toFixed(0)}). Buying base amount: $${config.baseAmountAUD.toFixed(2)} AUD`,
  };
}

export function getTieredMAMultiplier(
  currentPrice: number,
  ma200: number | null,
  tiers: { percentBelow: number; multiplier: number }[]
): number {
  if (ma200 === null) return 1;

  const percentBelow = ((ma200 - currentPrice) / ma200) * 100;

  if (percentBelow <= 0) return 1;

  const sortedTiers = [...tiers].sort((a, b) => b.percentBelow - a.percentBelow);

  for (const tier of sortedTiers) {
    if (percentBelow >= tier.percentBelow) {
      return tier.multiplier;
    }
  }

  return 1;
}
