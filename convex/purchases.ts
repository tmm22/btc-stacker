import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const list = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("purchases")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const getStats = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "filled"))
      .collect();

    const totalBTC = purchases.reduce((sum, p) => sum + p.btcReceived, 0);
    const totalAUD = purchases.reduce((sum, p) => sum + p.amountAUD, 0);
    const avgPrice = totalBTC > 0 ? totalAUD / totalBTC : 0;

    return {
      totalBTC,
      totalAUD,
      avgPrice,
      totalPurchases: purchases.length,
    };
  },
});

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    strategyId: v.optional(v.id("strategies")),
    strategyType: v.string(),
    amountAUD: v.number(),
    price: v.number(),
    btcReceived: v.number(),
    orderId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("filled"),
      v.literal("partial"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("purchases", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("purchases"),
    status: v.union(
      v.literal("pending"),
      v.literal("filled"),
      v.literal("partial"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
    btcReceived: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    strategyId: v.optional(v.id("strategies")),
    strategyType: v.string(),
    amountAUD: v.number(),
    price: v.number(),
    btcReceived: v.number(),
    orderId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("filled"),
      v.literal("partial"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("purchases", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
