import { NextRequest, NextResponse } from "next/server";
import { fetchMarketData } from "@/lib/market-data";
import { createBitarooClient } from "@/lib/bitaroo";
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
      } catch {
        // Orderbook fetch failed, continue without it
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
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
