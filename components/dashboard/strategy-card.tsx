"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatAUD } from "@/lib/utils";
import { Zap, Settings2, TrendingDown, Activity } from "lucide-react";

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

interface StrategyCardProps {
  type: StrategyType;
  config: StrategyConfig;
  onConfigChange: (config: StrategyConfig) => void;
  onExecute: () => void;
  isExecuting?: boolean;
  marketData?: {
    price: number;
    ma200: number | null;
    rsi14: number | null;
  };
}

const strategyInfo = {
  dca: {
    name: "Dollar Cost Averaging",
    description: "Buy a fixed amount at regular intervals",
    icon: Zap,
    color: "text-blue-500",
  },
  value_averaging: {
    name: "Value Averaging",
    description: "Adjust purchases to meet target portfolio growth",
    icon: Settings2,
    color: "text-purple-500",
  },
  moving_average: {
    name: "200-Day Moving Average",
    description: "Buy more when price is below the 200-day MA",
    icon: TrendingDown,
    color: "text-green-500",
  },
  rsi: {
    name: "RSI Strategy",
    description: "Increase purchases when RSI indicates oversold",
    icon: Activity,
    color: "text-orange-500",
  },
};

export function StrategyCard({
  type,
  config,
  onConfigChange,
  onExecute,
  isExecuting,
  marketData,
}: StrategyCardProps) {
  const info = strategyInfo[type];
  const Icon = info.icon;

  const [localConfig, setLocalConfig] = useState(config);

  const handleChange = (key: string, value: number | string | boolean | object) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <Card className={!config.enabled ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-gray-800 p-2 ${info.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{info.name}</CardTitle>
            <p className="text-sm text-gray-400">{info.description}</p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => handleChange("enabled", checked)}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {type === "dca" && (
          <>
            <div className="space-y-2">
              <Label>Amount (AUD)</Label>
              <Input
                type="number"
                value={localConfig.amountAUD || 100}
                onChange={(e) =>
                  handleChange("amountAUD", parseFloat(e.target.value) || 0)
                }
                min={10}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <select
                value={localConfig.frequency || "weekly"}
                onChange={(e) => handleChange("frequency", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </>
        )}

        {type === "value_averaging" && (
          <>
            <div className="space-y-2">
              <Label>Target Growth per Period (AUD)</Label>
              <Input
                type="number"
                value={localConfig.targetGrowthAUD || 100}
                onChange={(e) =>
                  handleChange("targetGrowthAUD", parseFloat(e.target.value) || 0)
                }
                min={10}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <select
                value={localConfig.frequency || "weekly"}
                onChange={(e) => handleChange("frequency", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </>
        )}

        {type === "moving_average" && (
          <>
            <div className="space-y-2">
              <Label>Base Amount (AUD)</Label>
              <Input
                type="number"
                value={localConfig.baseAmountAUD || 100}
                onChange={(e) =>
                  handleChange("baseAmountAUD", parseFloat(e.target.value) || 0)
                }
                min={10}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Multiplier When Below 200MA</Label>
              <Input
                type="number"
                value={localConfig.multiplierBelow200MA || 2}
                onChange={(e) =>
                  handleChange("multiplierBelow200MA", parseFloat(e.target.value) || 1)
                }
                min={1}
                max={5}
                step={0.5}
              />
            </div>
            {marketData?.ma200 && (
              <div className="rounded-lg bg-gray-800 p-3 text-sm">
                <p className="text-gray-400">Current Status</p>
                <p className="text-white">
                  Price: {formatAUD(marketData.price)} | 200MA:{" "}
                  {formatAUD(marketData.ma200)}
                </p>
                <p
                  className={
                    marketData.price < marketData.ma200
                      ? "text-green-500"
                      : "text-gray-400"
                  }
                >
                  {marketData.price < marketData.ma200
                    ? `${((1 - marketData.price / marketData.ma200) * 100).toFixed(1)}% below MA - Multiplier active!`
                    : "Above MA - Using base amount"}
                </p>
              </div>
            )}
          </>
        )}

        {type === "rsi" && (
          <>
            <div className="space-y-2">
              <Label>Base Amount (AUD)</Label>
              <Input
                type="number"
                value={localConfig.baseAmountAUD || 100}
                onChange={(e) =>
                  handleChange("baseAmountAUD", parseFloat(e.target.value) || 0)
                }
                min={10}
                step={10}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">RSI {"<"} 30</Label>
                <Input
                  type="number"
                  value={localConfig.rsiThresholds?.below30 || 2}
                  onChange={(e) =>
                    handleChange("rsiThresholds", {
                      ...localConfig.rsiThresholds,
                      below30: parseFloat(e.target.value) || 1,
                    })
                  }
                  min={1}
                  max={5}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RSI {"<"} 40</Label>
                <Input
                  type="number"
                  value={localConfig.rsiThresholds?.below40 || 1.5}
                  onChange={(e) =>
                    handleChange("rsiThresholds", {
                      ...localConfig.rsiThresholds,
                      below40: parseFloat(e.target.value) || 1,
                    })
                  }
                  min={1}
                  max={5}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RSI {"<"} 50</Label>
                <Input
                  type="number"
                  value={localConfig.rsiThresholds?.below50 || 1.2}
                  onChange={(e) =>
                    handleChange("rsiThresholds", {
                      ...localConfig.rsiThresholds,
                      below50: parseFloat(e.target.value) || 1,
                    })
                  }
                  min={1}
                  max={5}
                  step={0.1}
                />
              </div>
            </div>
            {marketData?.rsi14 && (
              <div className="rounded-lg bg-gray-800 p-3 text-sm">
                <p className="text-gray-400">Current RSI: {marketData.rsi14.toFixed(1)}</p>
                <p
                  className={
                    marketData.rsi14 < 30
                      ? "text-green-500"
                      : marketData.rsi14 < 40
                      ? "text-yellow-500"
                      : "text-gray-400"
                  }
                >
                  {marketData.rsi14 < 30
                    ? "Extreme Oversold - Max multiplier!"
                    : marketData.rsi14 < 40
                    ? "Oversold - Elevated buying"
                    : marketData.rsi14 < 50
                    ? "Mild oversold"
                    : "Neutral conditions"}
                </p>
              </div>
            )}
          </>
        )}

        <Button
          onClick={onExecute}
          disabled={!config.enabled || isExecuting}
          className="w-full"
        >
          {isExecuting ? "Executing..." : "Execute Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
