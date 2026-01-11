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
      
      let isValid = false;
      let connectionError = "";
      try {
        isValid = await client.testConnection();
      } catch (connErr) {
        connectionError = connErr instanceof Error ? connErr.message : "Unknown connection error";
      }

      if (!isValid) {
        return NextResponse.json(
          { 
            error: "Invalid API credentials or connection failed",
            details: connectionError || "Could not connect to Bitaroo API. Please verify your API Key ID and Secret are correct."
          },
          { status: 400 }
        );
      }

      let encryptedApiKey: string;
      let encryptedApiSecret: string;
      try {
        encryptedApiKey = encrypt(validatedData.apiKeyId);
        encryptedApiSecret = encrypt(validatedData.apiSecret);
      } catch (encryptErr) {
        console.error("Encryption error:", encryptErr);
        return NextResponse.json(
          { error: "Encryption failed. Server configuration error." },
          { status: 500 }
        );
      }

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
