"use client";

import { useState, useEffect } from "react";
import { StatsGrid } from "@/components/dashboard/balance-card";
import { PurchaseHistory } from "@/components/dashboard/purchase-history";
import { QuickBuy } from "@/components/dashboard/quick-buy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

interface MarketData {
  price: number;
  ma200: number | null;
  rsi14: number | null;
}

interface Balances {
  aud: { available: number; total: number };
  btc: { available: number; total: number };
}

export default function DashboardPage() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Array<{
    id: string;
    strategyType: string;
    amountAUD: number;
    price: number;
    btcReceived: number;
    status: "pending" | "filled" | "partial" | "cancelled" | "failed";
    createdAt: number;
  }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const marketRes = await fetch("/api/bitaroo/market");
      if (marketRes.ok) {
        const data = await marketRes.json();
        setMarketData(data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load market data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickBuy = async (amountAUD: number) => {
    const encryptedKey = localStorage.getItem("encryptedApiKey");
    if (!encryptedKey) {
      setError("Please configure your API key in Settings first");
      return;
    }

    try {
      const res = await fetch("/api/bitaroo/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Encrypted-Api-Key": encryptedKey,
        },
        body: JSON.stringify({ amountAUD }),
      });

      if (!res.ok) {
        throw new Error("Order failed");
      }

      const result = await res.json();

      const newPurchase = {
        id: result.orderId.toString(),
        strategyType: "manual",
        amountAUD,
        price: marketData?.price || 0,
        btcReceived: amountAUD / (marketData?.price || 1),
        status: "filled" as const,
        createdAt: Date.now(),
      };

      setPurchases((prev) => [newPurchase, ...prev]);
      fetchData();
    } catch (err) {
      console.error("Buy failed:", err);
      setError("Failed to place order");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Monitor your Bitcoin accumulation</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/50 border border-red-800 p-4 text-red-200">
          {error}
        </div>
      )}

      <StatsGrid
        audBalance={balances?.aud.available || 0}
        btcBalance={balances?.btc.total || 0}
        btcPrice={marketData?.price || 0}
        totalInvested={purchases.reduce((sum, p) => sum + p.amountAUD, 0)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PurchaseHistory purchases={purchases} limit={5} />
        </div>
        <div className="space-y-6">
          {marketData && (
            <QuickBuy
              currentPrice={marketData.price}
              availableAUD={balances?.aud.available || 0}
              onBuy={handleQuickBuy}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Market Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {marketData?.ma200 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">200-Day MA</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      ${marketData.ma200.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {marketData.price < marketData.ma200 ? (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              )}
              {marketData?.rsi14 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">RSI (14)</span>
                  <span
                    className={
                      marketData.rsi14 < 30
                        ? "text-green-500"
                        : marketData.rsi14 > 70
                        ? "text-red-500"
                        : "text-white"
                    }
                  >
                    {marketData.rsi14.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className="text-orange-500 font-medium">
                  ${marketData?.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
