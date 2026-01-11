import { calculateDCAAmount, DCAConfig } from "./dca";
import {
  calculateValueAveraging,
  ValueAveragingConfig,
  calculateTargetPortfolioValue,
  calculatePeriodsSinceStart,
} from "./value-averaging";
import { calculateMovingAverageStrategy, MovingAverageConfig } from "./moving-average";
import { calculateRSIStrategy, RSIConfig, getDefaultRSIThresholds } from "./rsi";
import { MarketData } from "../market-data";

export type StrategyType = "dca" | "value_averaging" | "moving_average" | "rsi";

export interface StrategyConfig {
  amountAUD?: number;
  frequency?: "daily" | "weekly" | "monthly";
  targetGrowthAUD?: number;
  baseAmountAUD?: number;
  multiplierBelow200MA?: number;
  rsiThresholds?: {
    below30: number;
    below40: number;
    below50: number;
  };
}

export interface StrategyExecutionResult {
  strategyType: StrategyType;
  amountAUD: number;
  shouldBuy: boolean;
  reason: string;
  marketData: {
    price: number;
    ma200: number | null;
    rsi14: number | null;
  };
}

export interface PortfolioContext {
  currentBTCBalance: number;
  totalInvestedAUD: number;
  startDate: Date;
}

export function executeStrategy(
  strategyType: StrategyType,
  config: StrategyConfig,
  marketData: MarketData,
  portfolioContext?: PortfolioContext
): StrategyExecutionResult {
  const baseResult = {
    strategyType,
    shouldBuy: true,
    marketData: {
      price: marketData.price,
      ma200: marketData.ma200,
      rsi14: marketData.rsi14,
    },
  };

  switch (strategyType) {
    case "dca": {
      const dcaConfig: DCAConfig = {
        amountAUD: config.amountAUD || 100,
        frequency: config.frequency || "weekly",
      };
      const result = calculateDCAAmount(dcaConfig);
      return {
        ...baseResult,
        amountAUD: result.amountAUD,
        reason: result.reason,
      };
    }

    case "value_averaging": {
      if (!portfolioContext) {
        return {
          ...baseResult,
          amountAUD: config.targetGrowthAUD || 100,
          shouldBuy: true,
          reason: "No portfolio context available. Using target growth as purchase amount.",
        };
      }

      const vaConfig: ValueAveragingConfig = {
        targetGrowthAUD: config.targetGrowthAUD || 100,
        frequency: config.frequency || "weekly",
      };

      const periods = calculatePeriodsSinceStart(
        portfolioContext.startDate,
        vaConfig.frequency
      );
      const targetValue = calculateTargetPortfolioValue(
        portfolioContext.totalInvestedAUD,
        vaConfig.targetGrowthAUD,
        periods
      );
      const currentValue = portfolioContext.currentBTCBalance * marketData.price;

      const result = calculateValueAveraging(vaConfig, currentValue, targetValue);
      return {
        ...baseResult,
        amountAUD: result.amountAUD,
        shouldBuy: result.shouldBuy,
        reason: result.reason,
      };
    }

    case "moving_average": {
      const maConfig: MovingAverageConfig = {
        baseAmountAUD: config.baseAmountAUD || 100,
        multiplierBelow200MA: config.multiplierBelow200MA || 2,
      };
      const result = calculateMovingAverageStrategy(
        maConfig,
        marketData.price,
        marketData.ma200
      );
      return {
        ...baseResult,
        amountAUD: result.amountAUD,
        reason: result.reason,
      };
    }

    case "rsi": {
      const rsiConfig: RSIConfig = {
        baseAmountAUD: config.baseAmountAUD || 100,
        rsiThresholds: config.rsiThresholds || getDefaultRSIThresholds(),
      };
      const result = calculateRSIStrategy(rsiConfig, marketData.rsi14);
      return {
        ...baseResult,
        amountAUD: result.amountAUD,
        reason: result.reason,
      };
    }

    default:
      throw new Error(`Unknown strategy type: ${strategyType}`);
  }
}

export function combineStrategies(
  strategies: { type: StrategyType; config: StrategyConfig; weight: number }[],
  marketData: MarketData,
  portfolioContext?: PortfolioContext
): StrategyExecutionResult {
  const results = strategies.map((s) => ({
    result: executeStrategy(s.type, s.config, marketData, portfolioContext),
    weight: s.weight,
  }));

  const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
  const weightedAmount = results.reduce(
    (sum, { result, weight }) => sum + result.amountAUD * (weight / totalWeight),
    0
  );

  const reasons = results.map(
    ({ result, weight }) =>
      `[${result.strategyType} ${((weight / totalWeight) * 100).toFixed(0)}%] ${result.reason}`
  );

  return {
    strategyType: "dca",
    amountAUD: weightedAmount,
    shouldBuy: weightedAmount > 0,
    reason: reasons.join("\n"),
    marketData: {
      price: marketData.price,
      ma200: marketData.ma200,
      rsi14: marketData.rsi14,
    },
  };
}

export type { DCAConfig } from "./dca";
export type { ValueAveragingConfig } from "./value-averaging";
export type { MovingAverageConfig } from "./moving-average";
export type { RSIConfig } from "./rsi";
export { getDefaultRSIThresholds } from "./rsi";
