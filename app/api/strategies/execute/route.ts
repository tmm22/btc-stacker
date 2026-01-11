import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient } from "@/lib/bitaroo";
import { decrypt } from "@/lib/crypto";
import { fetchMarketData } from "@/lib/market-data";
import { executeStrategy, StrategyType, StrategyConfig } from "@/lib/strategies";
import { z } from "zod";

const executeStrategySchema = z.object({
  strategyType: z.enum(["dca", "value_averaging", "moving_average", "rsi"]),
  config: z.object({
    amountAUD: z.number().positive().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    targetGrowthAUD: z.number().positive().optional(),
    baseAmountAUD: z.number().positive().optional(),
    multiplierBelow200MA: z.number().positive().optional(),
    rsiThresholds: z
      .object({
        below30: z.number().positive(),
        below40: z.number().positive(),
        below50: z.number().positive(),
      })
      .optional(),
  }),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = executeStrategySchema.parse(body);

    const apiKey = decrypt(encryptedApiKey);
    const client = createBitarooClient(apiKey);

    const marketData = await fetchMarketData(apiKey);

    const result = executeStrategy(
      validatedData.strategyType as StrategyType,
      validatedData.config as StrategyConfig,
      marketData
    );

    if (!result.shouldBuy) {
      return NextResponse.json({
        success: true,
        executed: false,
        result,
        message: "Strategy determined no purchase needed",
      });
    }

    if (validatedData.dryRun) {
      return NextResponse.json({
        success: true,
        executed: false,
        dryRun: true,
        result,
        message: `Dry run: Would buy $${result.amountAUD.toFixed(2)} AUD`,
      });
    }

    const balances = await client.getBalances();
    const audBalance = balances.find((b) => b.asset === "AUD");
    const availableAUD = parseFloat(audBalance?.available || "0");

    if (availableAUD < result.amountAUD) {
      return NextResponse.json({
        success: false,
        executed: false,
        result,
        error: `Insufficient balance. Available: $${availableAUD.toFixed(2)}, Required: $${result.amountAUD.toFixed(2)}`,
      }, { status: 400 });
    }

    const order = await client.buyWithAUD(result.amountAUD);

    return NextResponse.json({
      success: true,
      executed: true,
      result,
      order: {
        orderId: order.orderId,
        amountAUD: result.amountAUD,
        estimatedBTC: result.amountAUD / marketData.price,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Strategy execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute strategy" },
      { status: 500 }
    );
  }
}
