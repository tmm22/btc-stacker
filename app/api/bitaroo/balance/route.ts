import { NextRequest, NextResponse } from "next/server";
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

    if (!encryptedApiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const { apiKey, rotatedCiphertext } = decryptApiKeyHeader(encryptedApiKey);
    const client = createBitarooClient(apiKey);
    const balances = await client.getBalances();

    const audBalance = balances.find(
      (b) => b.assetSymbol.toLowerCase() === "aud"
    );
    const btcBalance = balances.find(
      (b) => b.assetSymbol.toLowerCase() === "btc"
    );

    const response = NextResponse.json({
      aud: {
        available: audBalance?.available ?? "0",
        locked: audBalance?.locked ?? "0",
        total: audBalance?.balance ?? "0",
      },
      btc: {
        available: btcBalance?.available ?? "0",
        locked: btcBalance?.locked ?? "0",
        total: btcBalance?.balance ?? "0",
      },
    });
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logApiError("Balance fetch error:", error);

    if (error instanceof BitarooApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}
