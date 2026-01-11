import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduledJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getDue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const jobs = await ctx.db.query("scheduledJobs").collect();
    return jobs.filter((job) => job.enabled && job.nextRun <= now);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    strategyId: v.id("strategies"),
    cronExpression: v.string(),
    enabled: v.boolean(),
    nextRun: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scheduledJobs", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduledJobs"),
    cronExpression: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    nextRun: v.optional(v.number()),
    lastRun: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
  },
});

export const remove = mutation({
  args: { id: v.id("scheduledJobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
