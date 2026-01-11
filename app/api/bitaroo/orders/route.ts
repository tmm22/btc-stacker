import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient } from "@/lib/bitaroo";
import { decrypt } from "@/lib/crypto";
import { z } from "zod";

const createOrderSchema = z.object({
  amountAUD: z.number().positive(),
  slippagePercent: z.number().min(0).max(10).optional().default(1),
});

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

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const historyOnly = searchParams.get("historyOnly") === "true";

    const orders = await client.getOrders({ activeOnly, historyOnly });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

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
    const validatedData = createOrderSchema.parse(body);

    const apiKey = decrypt(encryptedApiKey);
    const client = createBitarooClient(apiKey);

    const result = await client.buyWithAUD(
      validatedData.amountAUD,
      validatedData.slippagePercent
    );

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      amountAUD: validatedData.amountAUD,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID required" },
        { status: 400 }
      );
    }

    const apiKey = decrypt(encryptedApiKey);
    const client = createBitarooClient(apiKey);

    const result = await client.cancelOrder(orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Order cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
