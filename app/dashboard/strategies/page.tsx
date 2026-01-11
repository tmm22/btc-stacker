"use client";

import { useState, useEffect } from "react";
import { StrategyCard } from "@/components/dashboard/strategy-card";

type StrategyType = "dca" | "value_averaging" | "moving_average" | "rsi";

interface StrategyConfig {
  enabled: boolean;
  amountAUD?: number;
  frequency?: string;
  targetGrowthAUD?: number;
  baseAmountAUD?: number;
  multiplierBelow200MA?: number;
  rsiThresholds?: {
    below30: number;
    below40: number;
    below50: number;
  };
}

interface MarketData {
  price: number;
  ma200: number | null;
  rsi14: number | null;
}

const defaultConfigs: Record<StrategyType, StrategyConfig> = {
  dca: {
    enabled: true,
    amountAUD: 100,
    frequency: "weekly",
  },
  value_averaging: {
    enabled: false,
    targetGrowthAUD: 100,
    frequency: "weekly",
  },
  moving_average: {
    enabled: false,
    baseAmountAUD: 100,
    multiplierBelow200MA: 2,
  },
  rsi: {
    enabled: false,
    baseAmountAUD: 100,
    rsiThresholds: {
      below30: 2,
      below40: 1.5,
      below50: 1.2,
    },
  },
};

export default function StrategiesPage() {
  const [configs, setConfigs] = useState<Record<StrategyType, StrategyConfig>>(defaultConfigs);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [executing, setExecuting] = useState<StrategyType | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("strategyConfigs");
    if (saved) {
      try {
        setConfigs(JSON.parse(saved));
      } catch {
        // Use defaults
      }
    }

    fetchMarketData();
  }, []);

  useEffect(() => {
    localStorage.setItem("strategyConfigs", JSON.stringify(configs));
  }, [configs]);

  const fetchMarketData = async () => {
    try {
      const res = await fetch("/api/bitaroo/market");
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err);
    }
  };

  const handleConfigChange = (type: StrategyType, config: StrategyConfig) => {
    setConfigs((prev) => ({
      ...prev,
      [type]: config,
    }));
  };

  const handleExecute = async (type: StrategyType) => {
    const encryptedKey = localStorage.getItem("encryptedApiKey");
    if (!encryptedKey) {
      setMessage({ type: "error", text: "Please configure your API key in Settings first" });
      return;
    }

    setExecuting(type);
    setMessage(null);

    try {
      const res = await fetch("/api/strategies/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Encrypted-Api-Key": encryptedKey,
        },
        body: JSON.stringify({
          strategyType: type,
          config: configs[type],
          dryRun: false,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Execution failed");
      }

      if (result.executed) {
        setMessage({
          type: "success",
          text: `Successfully bought $${result.result.amountAUD.toFixed(2)} AUD worth of Bitcoin!`,
        });
      } else {
        setMessage({
          type: "success",
          text: result.message || "Strategy evaluated - no purchase needed",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Execution failed",
      });
    } finally {
      setExecuting(null);
    }
  };

  const strategyTypes: StrategyType[] = ["dca", "value_averaging", "moving_average", "rsi"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Accumulation Strategies</h1>
        <p className="text-gray-400">
          Configure and execute proven Bitcoin buying strategies
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-900/50 border border-green-800 text-green-200"
              : "bg-red-900/50 border border-red-800 text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {strategyTypes.map((type) => (
          <StrategyCard
            key={type}
            type={type}
            config={configs[type]}
            onConfigChange={(config) => handleConfigChange(type, config)}
            onExecute={() => handleExecute(type)}
            isExecuting={executing === type}
            marketData={marketData || undefined}
          />
        ))}
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Strategy Guide</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <h3 className="font-medium text-orange-500">Dollar Cost Averaging (DCA)</h3>
            <p className="text-gray-400">
              The simplest and most consistent approach. Buy a fixed amount regularly,
              regardless of price. Reduces timing risk and emotional decisions.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-purple-500">Value Averaging</h3>
            <p className="text-gray-400">
              Adjusts purchase amounts to meet portfolio growth targets. Buys more when
              prices drop, less when prices rise. Can outperform DCA in volatile markets.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-green-500">200-Day Moving Average</h3>
            <p className="text-gray-400">
              Increases purchases when Bitcoin trades below its 200-day moving average.
              Historically, buying below the 200MA has been profitable long-term.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-orange-500">RSI Strategy</h3>
            <p className="text-gray-400">
              Uses the Relative Strength Index to identify oversold conditions.
              Buys more aggressively when RSI indicates the market is oversold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
