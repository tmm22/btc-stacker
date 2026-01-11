"use client";

import { useState } from "react";
import { PurchaseHistory } from "@/components/dashboard/purchase-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAUD, formatBTC } from "@/lib/utils";
import { Download, Filter } from "lucide-react";

interface Purchase {
  id: string;
  strategyType: string;
  amountAUD: number;
  price: number;
  btcReceived: number;
  status: "pending" | "filled" | "partial" | "cancelled" | "failed";
  createdAt: number;
}

export default function HistoryPage() {
  const [purchases] = useState<Purchase[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const filteredPurchases =
    filter === "all"
      ? purchases
      : purchases.filter((p) => p.strategyType === filter);

  const totalAUD = filteredPurchases
    .filter((p) => p.status === "filled")
    .reduce((sum, p) => sum + p.amountAUD, 0);
  const totalBTC = filteredPurchases
    .filter((p) => p.status === "filled")
    .reduce((sum, p) => sum + p.btcReceived, 0);

  const exportCSV = () => {
    const headers = [
      "Date",
      "Strategy",
      "Amount (AUD)",
      "Price",
      "BTC Received",
      "Status",
    ];
    const rows = filteredPurchases.map((p) => [
      new Date(p.createdAt).toISOString(),
      p.strategyType,
      p.amountAUD.toFixed(2),
      p.price.toFixed(2),
      p.btcReceived.toFixed(8),
      p.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `btc-purchases-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Purchase History</h1>
          <p className="text-gray-400">View all your Bitcoin purchases</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatAUD(totalAUD)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total BTC Accumulated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatBTC(totalBTC)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Average Buy Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalBTC > 0 ? formatAUD(totalAUD / totalBTC) : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100"
          >
            <option value="all">All Strategies</option>
            <option value="dca">DCA</option>
            <option value="value_averaging">Value Averaging</option>
            <option value="moving_average">Moving Average</option>
            <option value="rsi">RSI</option>
            <option value="manual">Manual</option>
          </select>
        </CardHeader>
      </Card>

      <PurchaseHistory purchases={filteredPurchases} />
    </div>
  );
}
