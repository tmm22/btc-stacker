import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { decryptApiKeyHeader } from "@/lib/crypto";
import { z } from "zod";

const createOrderSchema = z.object({
  amountAUD: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .refine((val) => parseFloat(val) > 0, "Amount must be positive"),
  slippagePercent: z.number().min(0).max(10).optional().default(1),
});

const cancelOrderSchema = z.object({
  orderId: z.number().int().positive("Order ID must be a positive integer"),
});

function getErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof BitarooApiError) {
    return {
      message: error.message,
      status: error.statusCode ?? 500,
    };
  }
  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}

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

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const historyOnly = searchParams.get("historyOnly") === "true";

    const orders = await client.getOrders({ activeOnly, historyOnly });

    const response = NextResponse.json({ orders });
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logApiError("Orders fetch error:", error);
    const { message, status } = getErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    const { apiKey, rotatedCiphertext } = decryptApiKeyHeader(encryptedApiKey);
    const client = createBitarooClient(apiKey);

    const result = await client.buyWithAUD(
      validatedData.amountAUD,
      validatedData.slippagePercent
    );

    const response = NextResponse.json({
      success: true,
      orderId: result.orderId,
      amountAUD: validatedData.amountAUD,
    });
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    logApiError("Order creation error:", error);
    const { message, status } = getErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const encryptedApiKey = request.headers.get("X-Encrypted-Api-Key");

    if (!encryptedApiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = cancelOrderSchema.parse(body);

    const { apiKey, rotatedCiphertext } = decryptApiKeyHeader(encryptedApiKey);
    const client = createBitarooClient(apiKey);

    const result = await client.cancelOrder(validatedData.orderId);

    const response = NextResponse.json(result);
    if (rotatedCiphertext) {
      response.headers.set("X-Encrypted-Api-Key-Rotated", rotatedCiphertext);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    logApiError("Order cancellation error:", error);
    const { message, status } = getErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
