import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const snapshots = await ctx.db
      .query("marketSnapshots")
      .withIndex("by_timestamp")
      .order("desc")
      .take(1);
    return snapshots[0] || null;
  },
});

export const getHistory = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("marketSnapshots")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    price: v.number(),
    ma200: v.optional(v.number()),
    rsi14: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("marketSnapshots", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
