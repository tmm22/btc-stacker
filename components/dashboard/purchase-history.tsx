"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD, formatBTC, formatDate } from "@/lib/utils";
import { ArrowDownRight, CheckCircle, XCircle, Clock } from "lucide-react";

interface Purchase {
  id: string;
  strategyType: string;
  amountAUD: number;
  price: number;
  btcReceived: number;
  status: "pending" | "filled" | "partial" | "cancelled" | "failed";
  createdAt: number;
}

interface PurchaseHistoryProps {
  purchases: Purchase[];
  limit?: number;
}

const statusIcons = {
  pending: Clock,
  filled: CheckCircle,
  partial: Clock,
  cancelled: XCircle,
  failed: XCircle,
};

const statusColors = {
  pending: "text-yellow-500",
  filled: "text-green-500",
  partial: "text-yellow-500",
  cancelled: "text-gray-500",
  failed: "text-red-500",
};

const strategyLabels: Record<string, string> = {
  dca: "DCA",
  value_averaging: "Value Avg",
  moving_average: "MA Strategy",
  rsi: "RSI",
  manual: "Manual",
};

export function PurchaseHistory({ purchases, limit }: PurchaseHistoryProps) {
  const displayPurchases = limit ? purchases.slice(0, limit) : purchases;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownRight className="h-5 w-5 text-green-500" />
          Recent Purchases
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayPurchases.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No purchases yet. Configure a strategy to start accumulating BTC.
          </p>
        ) : (
          <div className="space-y-3">
            {displayPurchases.map((purchase) => {
              const StatusIcon = statusIcons[purchase.status];
              return (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={`h-5 w-5 ${statusColors[purchase.status]}`}
                    />
                    <div>
                      <p className="font-medium text-white">
                        {formatAUD(purchase.amountAUD)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {strategyLabels[purchase.strategyType] || purchase.strategyType} -{" "}
                        {formatDate(purchase.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-500">
                      +{formatBTC(purchase.btcReceived)}
                    </p>
                    <p className="text-sm text-gray-400">
                      @ {formatAUD(purchase.price)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
