import { NextRequest, NextResponse } from "next/server";
import { fetchMarketData, MarketDataError } from "@/lib/market-data";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { decryptApiKeyHeader } from "@/lib/crypto";

function logApiError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(context, error.name, error.message);
    return;
  }
  console.error(context, "Unknown error");
}

export async function GET(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    let apiKey: string | undefined;
    let rotatedCiphertext: string | undefined;
    if (encryptedApiKey) {
      const decrypted = decryptApiKeyHeader(encryptedApiKey);
      apiKey = decrypted.apiKey;
      rotatedCiphertext = decrypted.rotatedCiphertext;
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

    const response = NextResponse.json({
      price: marketData.price,
      ma200: marketData.ma200,
      rsi14: marketData.rsi14,
      timestamp: marketData.timestamp,
      orderbook,
    });
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logApiError("Market data fetch error:", error);

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
