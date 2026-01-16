import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/keys/upsert",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { encryptedApiKey, encryptedApiSecret } = body ?? {};

    if (typeof encryptedApiKey !== "string" || typeof encryptedApiSecret !== "string") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await ctx.runQuery(internal.users.getFirst, {});
    if (!existing) {
      const createdUserId = await ctx.runMutation(internal.users.create, {
        encryptedApiKey,
        encryptedApiSecret,
      });
      return new Response(JSON.stringify({ success: true, userId: createdUserId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(internal.users.updateApiKeys, {
      id: existing._id,
      encryptedApiKey,
      encryptedApiSecret,
    });

    return new Response(JSON.stringify({ success: true, userId: existing._id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/cron/due-jobs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const jobs = await ctx.runQuery(internal.scheduledJobs.listDue, { now });

    const jobsWithDetails = await Promise.all(
      jobs.map(async (job) => {
        const user = await ctx.runQuery(internal.users.getInternal, { id: job.userId });
        const strategy = await ctx.runQuery(internal.strategies.getInternal, { id: job.strategyId });
        return {
          job,
          user: user ? {
            _id: user._id,
            encryptedApiKey: user.encryptedApiKey,
            encryptedApiSecret: user.encryptedApiSecret,
          } : null,
          strategy,
        };
      })
    );

    return new Response(JSON.stringify({ jobs: jobsWithDetails }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/cron/record-execution",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { jobId, strategyId, purchase, nextRun } = body;

    if (purchase) {
      await ctx.runMutation(internal.purchases.createInternal, purchase);
    }

    await ctx.runMutation(internal.scheduledJobs.updateInternal, {
      id: jobId,
      lastRun: Date.now(),
      nextRun,
    });

    await ctx.runMutation(internal.strategies.updateLastRunInternal, {
      id: strategyId,
      lastRun: Date.now(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
