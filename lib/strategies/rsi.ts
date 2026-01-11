export interface RSIConfig {
  baseAmountAUD: number;
  rsiThresholds: {
    below30: number;
    below40: number;
    below50: number;
  };
}

export interface RSIResult {
  amountAUD: number;
  reason: string;
  multiplierApplied: number;
  currentRSI: number | null;
  condition: "extreme_oversold" | "oversold" | "mild_oversold" | "neutral";
}

export function calculateRSIStrategy(
  config: RSIConfig,
  rsi: number | null
): RSIResult {
  if (rsi === null) {
    return {
      amountAUD: config.baseAmountAUD,
      multiplierApplied: 1,
      currentRSI: null,
      condition: "neutral",
      reason: `RSI not available. Using base amount: $${config.baseAmountAUD.toFixed(2)} AUD`,
    };
  }

  let multiplier: number;
  let condition: RSIResult["condition"];

  if (rsi < 30) {
    multiplier = config.rsiThresholds.below30;
    condition = "extreme_oversold";
  } else if (rsi < 40) {
    multiplier = config.rsiThresholds.below40;
    condition = "oversold";
  } else if (rsi < 50) {
    multiplier = config.rsiThresholds.below50;
    condition = "mild_oversold";
  } else {
    multiplier = 1;
    condition = "neutral";
  }

  const amountAUD = config.baseAmountAUD * multiplier;

  const conditionLabels = {
    extreme_oversold: "EXTREME OVERSOLD",
    oversold: "OVERSOLD",
    mild_oversold: "MILDLY OVERSOLD",
    neutral: "NEUTRAL",
  };

  return {
    amountAUD,
    multiplierApplied: multiplier,
    currentRSI: rsi,
    condition,
    reason: `RSI is ${rsi.toFixed(1)} (${conditionLabels[condition]}). Buying $${amountAUD.toFixed(2)} AUD (${multiplier}x multiplier)`,
  };
}

export function getDefaultRSIThresholds(): RSIConfig["rsiThresholds"] {
  return {
    below30: 2.0,
    below40: 1.5,
    below50: 1.2,
  };
}
