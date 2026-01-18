import { NextRequest, NextResponse } from "next/server";
import { createBitarooClient, BitarooApiError } from "@/lib/bitaroo";
import { rotateCiphertextIfNeeded } from "@/lib/crypto";
import { fetchMarketData } from "@/lib/market-data";
import { executeStrategy, StrategyType, StrategyConfig } from "@/lib/strategies";
import { getNextRunTime } from "@/lib/scheduler";

const DEFAULT_SLIPPAGE_PERCENT = 1;

export const maxDuration = 60;

interface DueJob {
  job: {
    _id: string;
    userId: string;
    strategyId: string;
    cronExpression: string;
    enabled: boolean;
    nextRun: number;
    lastRun?: number;
  };
  user: {
    _id: string;
    encryptedApiKey: string;
    encryptedApiSecret: string;
  } | null;
  strategy: {
    _id: string;
    userId: string;
    type: StrategyType;
    enabled: boolean;
    config: StrategyConfig;
    lastRun?: number;
  } | null;
}

interface ExecutionResult {
  jobId: string;
  success: boolean;
  executed: boolean;
  orderId?: number;
  amountAUD?: number;
  btcReceived?: number;
  error?: string;
  reason?: string;
}

async function fetchDueJobs(convexUrl: string, cronSecret: string): Promise<DueJob[]> {
  const response = await fetch(`${convexUrl}/cron/due-jobs`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch due jobs: ${response.status}`);
  }

  const data = await response.json();
  return data.jobs || [];
}

async function recordExecution(
  convexUrl: string,
  cronSecret: string,
  payload: {
    jobId: string;
    strategyId: string;
    userId: string;
    nextRun: number;
    purchase?: {
      userId: string;
      strategyId: string;
      strategyType: string;
      amountAUD: number;
      price: number;
      btcReceived: number;
      orderId: string;
      status: "pending" | "filled" | "partial" | "cancelled" | "failed";
    };
  }
): Promise<void> {
  const response = await fetch(`${convexUrl}/cron/record-execution`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("Failed to record execution:", response.status);
  }
}

async function upsertEncryptedKeysToConvex(convexUrl: string, cronSecret: string, payload: { encryptedApiKey: string; encryptedApiSecret: string }): Promise<void> {
  const response = await fetch(`${convexUrl}/keys/upsert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("Failed to rotate stored keys:", response.status);
  }
}

async function executeJob(job: DueJob): Promise<ExecutionResult> {
  const { job: jobData, user, strategy } = job;

  if (!user || !strategy) {
    return {
      jobId: jobData._id,
      success: false,
      executed: false,
      error: "Missing user or strategy data",
    };
  }

  if (!strategy.enabled) {
    return {
      jobId: jobData._id,
      success: true,
      executed: false,
      reason: "Strategy is disabled",
    };
  }

  try {
    const keyIdDecrypted = rotateCiphertextIfNeeded(user.encryptedApiKey);
    const secretDecrypted = rotateCiphertextIfNeeded(user.encryptedApiSecret);
    const keyId = keyIdDecrypted.plaintext;
    const secret = secretDecrypted.plaintext;
    const fullApiKey = `${keyId}.${secret}`;

    const client = createBitarooClient(fullApiKey);
    const marketData = await fetchMarketData(fullApiKey);

    const result = executeStrategy(
      strategy.type,
      strategy.config,
      marketData
    );

    if (!result.shouldBuy) {
      return {
        jobId: jobData._id,
        success: true,
        executed: false,
        reason: result.reason,
      };
    }

    const balances = await client.getBalances();
    const audBalance = balances.find(
      (b) => b.assetSymbol.toLowerCase() === "aud"
    );
    const availableAUD = parseFloat(audBalance?.available || "0");

    if (availableAUD < result.amountAUD) {
      return {
        jobId: jobData._id,
        success: false,
        executed: false,
        error: `Insufficient balance. Available: $${availableAUD.toFixed(2)}, Required: $${result.amountAUD.toFixed(2)}`,
      };
    }

    const order = await client.buyWithAUD(
      String(result.amountAUD),
      DEFAULT_SLIPPAGE_PERCENT
    );

    const priceWithSlippage = marketData.price * (1 + DEFAULT_SLIPPAGE_PERCENT / 100);
    const estimatedBTC = result.amountAUD / priceWithSlippage;

    return {
      jobId: jobData._id,
      success: true,
      executed: true,
      orderId: order.orderId,
      amountAUD: result.amountAUD,
      btcReceived: estimatedBTC,
    };
  } catch (error) {
    const message = error instanceof BitarooApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";

    return {
      jobId: jobData._id,
      success: false,
      executed: false,
      error: message,
    };
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.error("CONVEX_URL environment variable is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const dueJobs = await fetchDueJobs(convexUrl, cronSecret);

    if (dueJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No due jobs to execute",
        timestamp: Date.now(),
        jobsProcessed: 0,
      });
    }

    const results: ExecutionResult[] = [];

    for (const dueJob of dueJobs) {
      if (dueJob.user) {
        const keyIdRotated = rotateCiphertextIfNeeded(dueJob.user.encryptedApiKey);
        const secretRotated = rotateCiphertextIfNeeded(dueJob.user.encryptedApiSecret);
        if (keyIdRotated.rotatedCiphertext || secretRotated.rotatedCiphertext) {
          await upsertEncryptedKeysToConvex(convexUrl, cronSecret, {
            encryptedApiKey: keyIdRotated.rotatedCiphertext ?? dueJob.user.encryptedApiKey,
            encryptedApiSecret: secretRotated.rotatedCiphertext ?? dueJob.user.encryptedApiSecret,
          });
        }
      }

      const result = await executeJob(dueJob);
      results.push(result);

      const nextRun = getNextRunTime(dueJob.job.cronExpression);

      if (dueJob.strategy && dueJob.user) {
        await recordExecution(convexUrl, cronSecret, {
          jobId: dueJob.job._id,
          strategyId: dueJob.job.strategyId,
          userId: dueJob.job.userId,
          nextRun,
          purchase: result.executed && result.orderId
            ? {
                userId: dueJob.job.userId,
                strategyId: dueJob.job.strategyId,
                strategyType: dueJob.strategy.type,
                amountAUD: result.amountAUD!,
                price: 0,
                btcReceived: result.btcReceived!,
                orderId: String(result.orderId),
                status: "pending",
              }
            : undefined,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      jobsProcessed: dueJobs.length,
      results,
    });
  } catch (error) {
    console.error(
      "Cron execution error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
