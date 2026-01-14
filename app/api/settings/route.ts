import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { z } from "zod";

const saveApiKeysSchema = z.object({
  apiKeyId: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  apiSecret: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
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
      let connectionError: Error | null = null;
      try {
        isValid = await client.testConnection();
      } catch (connErr) {
        connectionError = connErr instanceof Error ? connErr : null;
      }

      if (!isValid) {
        let userMessage = "Could not connect to Bitaroo API.";
        let errorCode = "CONNECTION_FAILED";

        if (connectionError instanceof BitarooApiError) {
          userMessage = connectionError.message;

          if (connectionError.statusCode === 401) {
            errorCode = "INVALID_CREDENTIALS";
            userMessage =
              "Invalid API Key ID or Secret. Please check that you've entered the correct credentials from your Bitaroo account. The Key ID and Secret are case-sensitive.";
          } else if (connectionError.statusCode === 403) {
            errorCode = "PERMISSION_DENIED";
            userMessage =
              "API key doesn't have permission to access balances. Please check your API key permissions on Bitaroo.";
          } else if (connectionError.statusCode === 429) {
            errorCode = "RATE_LIMITED";
            userMessage =
              "Too many requests. Please wait a moment and try again.";
          } else if (connectionError.isRetryable) {
            errorCode = "SERVICE_UNAVAILABLE";
            userMessage =
              "Bitaroo service is temporarily unavailable. Please try again later.";
          }
        } else if (connectionError) {
          if (connectionError.message.includes("timed out")) {
            errorCode = "TIMEOUT";
            userMessage =
              "Connection timed out. Please check your network and try again.";
          } else if (connectionError.message.includes("Network")) {
            errorCode = "NETWORK_ERROR";
            userMessage =
              "Network connection failed. Please check your internet connection.";
          } else {
            errorCode = "UNKNOWN_ERROR";
            userMessage =
              "An unexpected error occurred while connecting. Please try again.";
          }
        }

        return NextResponse.json(
          {
            error: "Invalid API credentials or connection failed",
            details: userMessage,
            code: errorCode,
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

      try {
        const isValid = await client.testConnection();
        return NextResponse.json({
          success: isValid,
          message: isValid ? "Connection successful" : "Connection failed",
        });
      } catch (testErr) {
        const message =
          testErr instanceof BitarooApiError
            ? testErr.message
            : "Connection failed";
        return NextResponse.json({
          success: false,
          message,
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
