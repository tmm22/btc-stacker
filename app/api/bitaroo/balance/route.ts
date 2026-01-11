import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient } from "@/lib/bitaroo";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const apiKey = decrypt(encryptedApiKey);
    const client = createBitarooClient(apiKey);
    const balances = await client.getBalances();

    const audBalance = balances.find((b) => b.assetSymbol.toLowerCase() === "aud");
    const btcBalance = balances.find((b) => b.assetSymbol.toLowerCase() === "btc");

    return NextResponse.json({
      aud: {
        available: parseFloat(audBalance?.available || "0"),
        locked: parseFloat(audBalance?.locked || "0"),
        total: parseFloat(audBalance?.balance || "0"),
      },
      btc: {
        available: parseFloat(btcBalance?.available || "0"),
        locked: parseFloat(btcBalance?.locked || "0"),
        total: parseFloat(btcBalance?.balance || "0"),
      },
    });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}
