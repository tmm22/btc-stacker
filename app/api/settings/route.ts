import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";
import { createBitarooClient } from "@/lib/bitaroo";
import { z } from "zod";

const saveApiKeysSchema = z.object({
  apiKeyId: z.string().min(1).transform(s => s.trim()),
  apiSecret: z.string().min(1).transform(s => s.trim()),
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
        let userMessage = "Could not connect to Bitaroo API.";
        
        if (connectionError.includes("wrong-token")) {
          userMessage = "Invalid API Key ID or Secret. Please check that you've entered the correct credentials from your Bitaroo account. The Key ID and Secret are case-sensitive.";
        } else if (connectionError.includes("401") || connectionError.includes("Unauthorized")) {
          userMessage = "API credentials are not authorized. Please verify your Key ID and Secret.";
        } else if (connectionError.includes("403") || connectionError.includes("Forbidden")) {
          userMessage = "API key doesn't have permission to access balances. Please check your API key permissions on Bitaroo.";
        }
        
        return NextResponse.json(
          { 
            error: "Invalid API credentials or connection failed",
            details: userMessage
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
