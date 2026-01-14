import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const apiKey = decrypt(encryptedApiKey);
    const client = createBitarooClient(apiKey);
    const trades = await client.getTrades();

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Trades fetch error:", error);

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
