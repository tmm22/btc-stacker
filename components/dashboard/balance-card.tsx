"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD, formatBTC, formatSats } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Bitcoin } from "lucide-react";

interface BalanceCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: "wallet" | "bitcoin";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function BalanceCard({
  title,
  value,
  subValue,
  icon,
  trend,
  trendValue,
}: BalanceCardProps) {
  const Icon = icon === "bitcoin" ? Bitcoin : Wallet;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subValue && (
          <p className="text-sm text-gray-400">{subValue}</p>
        )}
        {trend && trendValue && (
          <div className="mt-2 flex items-center gap-1">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : trend === "down" ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span
              className={
                trend === "up"
                  ? "text-green-500"
                  : trend === "down"
                  ? "text-red-500"
                  : "text-gray-400"
              }
            >
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  audBalance: number;
  btcBalance: number;
  btcPrice: number;
  totalInvested: number;
  avgBuyPrice?: number;
}

export function StatsGrid({
  audBalance,
  btcBalance,
  btcPrice,
  totalInvested,
  avgBuyPrice,
}: StatsGridProps) {
  const btcValueAUD = btcBalance * btcPrice;
  const profitLoss = btcValueAUD - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <BalanceCard
        title="AUD Balance"
        value={formatAUD(audBalance)}
        subValue="Available to invest"
        icon="wallet"
      />
      <BalanceCard
        title="BTC Holdings"
        value={formatBTC(btcBalance)}
        subValue={formatSats(btcBalance)}
        icon="bitcoin"
      />
      <BalanceCard
        title="Portfolio Value"
        value={formatAUD(btcValueAUD)}
        icon="wallet"
        trend={profitLoss >= 0 ? "up" : "down"}
        trendValue={`${profitLoss >= 0 ? "+" : ""}${formatAUD(profitLoss)} (${profitLossPercent.toFixed(1)}%)`}
      />
      <BalanceCard
        title="BTC Price"
        value={formatAUD(btcPrice)}
        subValue={avgBuyPrice ? `Avg buy: ${formatAUD(avgBuyPrice)}` : undefined}
        icon="bitcoin"
      />
    </div>
  );
}
