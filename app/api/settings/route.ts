import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";
import { createBitarooClient } from "@/lib/bitaroo";
import { z } from "zod";

const saveApiKeysSchema = z.object({
  apiKeyId: z.string().min(1),
  apiSecret: z.string().min(1),
});

const testConnectionSchema = z.object({
  encryptedApiKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "save") {
      const validatedData = saveApiKeysSchema.parse(body);

      const fullApiKey = `${validatedData.apiKeyId}.${validatedData.apiSecret}`;

      const client = createBitarooClient(fullApiKey);
      const isValid = await client.testConnection();

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid API credentials" },
          { status: 400 }
        );
      }

      const encryptedApiKey = encrypt(validatedData.apiKeyId);
      const encryptedApiSecret = encrypt(validatedData.apiSecret);

      return NextResponse.json({
        success: true,
        encryptedApiKey,
        encryptedApiSecret,
        message: "API keys validated and encrypted successfully",
      });
    }

    if (action === "test") {
      const validatedData = testConnectionSchema.parse(body);

      const apiKey = decrypt(validatedData.encryptedApiKey);
      const client = createBitarooClient(apiKey);
      const isValid = await client.testConnection();

      return NextResponse.json({
        success: isValid,
        message: isValid ? "Connection successful" : "Connection failed",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Settings error:", error);
    return NextResponse.json(
      { error: "Settings operation failed" },
      { status: 500 }
    );
  }
}
