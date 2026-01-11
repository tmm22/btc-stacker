import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("strategies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("dca"),
      v.literal("value_averaging"),
      v.literal("moving_average"),
      v.literal("rsi")
    ),
    enabled: v.boolean(),
    config: v.object({
      amountAUD: v.optional(v.number()),
      frequency: v.optional(v.string()),
      targetGrowthAUD: v.optional(v.number()),
      baseAmountAUD: v.optional(v.number()),
      multiplierBelow200MA: v.optional(v.number()),
      rsiThresholds: v.optional(
        v.object({
          below30: v.number(),
          below40: v.number(),
          below50: v.number(),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("strategies", {
      userId: args.userId,
      type: args.type,
      enabled: args.enabled,
      config: args.config,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("strategies"),
    enabled: v.optional(v.boolean()),
    config: v.optional(
      v.object({
        amountAUD: v.optional(v.number()),
        frequency: v.optional(v.string()),
        targetGrowthAUD: v.optional(v.number()),
        baseAmountAUD: v.optional(v.number()),
        multiplierBelow200MA: v.optional(v.number()),
        rsiThresholds: v.optional(
          v.object({
            below30: v.number(),
            below40: v.number(),
            below50: v.number(),
          })
        ),
      })
    ),
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

export const toggle = mutation({
  args: {
    id: v.id("strategies"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { enabled: args.enabled });
  },
});
