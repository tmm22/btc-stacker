import { NextRequest, NextResponse } from "next/server";
import { fetchMarketData, MarketDataError } from "@/lib/market-data";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    let apiKey: string | undefined;
    if (encryptedApiKey) {
      apiKey = decrypt(encryptedApiKey);
    }

    const marketData = await fetchMarketData(apiKey);

    let orderbook = null;
    if (apiKey) {
      try {
        const client = createBitarooClient(apiKey);
        orderbook = await client.getOrderbook();
      } catch (orderbookError) {
        console.warn(
          "Orderbook fetch failed (continuing without it):",
          orderbookError instanceof Error ? orderbookError.message : "Unknown error"
        );
      }
    }

    return NextResponse.json({
      price: marketData.price,
      ma200: marketData.ma200,
      rsi14: marketData.rsi14,
      timestamp: marketData.timestamp,
      orderbook,
    });
  } catch (error) {
    console.error("Market data fetch error:", error);

    if (error instanceof MarketDataError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }

    if (error instanceof BitarooApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
