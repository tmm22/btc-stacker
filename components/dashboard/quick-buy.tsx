"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAUD } from "@/lib/utils";
import { Zap } from "lucide-react";

interface QuickBuyProps {
  currentPrice: number;
  availableAUD: number;
  onBuy: (amountAUD: number) => Promise<void>;
}

export function QuickBuy({ currentPrice, availableAUD, onBuy }: QuickBuyProps) {
  const [amount, setAmount] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);

  const quickAmounts = [25, 50, 100, 250];
  const estimatedBTC = amount / currentPrice;

  const handleBuy = async () => {
    if (amount <= 0 || amount > availableAUD) return;
    setIsLoading(true);
    try {
      await onBuy(amount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Quick Buy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((amt) => (
            <Button
              key={amt}
              variant={amount === amt ? "default" : "outline"}
              size="sm"
              onClick={() => setAmount(amt)}
            >
              ${amt}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min={10}
            max={availableAUD}
            step={10}
            placeholder="Custom amount"
          />
          <p className="text-sm text-gray-400">
            Available: {formatAUD(availableAUD)}
          </p>
        </div>

        <div className="rounded-lg bg-gray-800 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">You pay</span>
            <span className="text-white">{formatAUD(amount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">You receive (est.)</span>
            <span className="text-orange-500">{estimatedBTC.toFixed(8)} BTC</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Rate</span>
            <span className="text-white">{formatAUD(currentPrice)}/BTC</span>
          </div>
        </div>

        <Button
          onClick={handleBuy}
          disabled={isLoading || amount <= 0 || amount > availableAUD}
          className="w-full"
        >
          {isLoading ? "Processing..." : `Buy Bitcoin`}
        </Button>
      </CardContent>
    </Card>
  );
}
