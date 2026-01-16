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
    const trades = await client.getTrades();

    const response = NextResponse.json({ trades });
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logApiError("Trades fetch error:", error);

    if (error instanceof BitarooApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}
