import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    encryptedApiKey: v.string(),
    encryptedApiSecret: v.string(),
    createdAt: v.number(),
  }),

  strategies: defineTable({
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
    lastRun: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  purchases: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "createdAt"]),

  scheduledJobs: defineTable({
    userId: v.id("users"),
    strategyId: v.id("strategies"),
    cronExpression: v.string(),
    enabled: v.boolean(),
    nextRun: v.number(),
    lastRun: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  marketSnapshots: defineTable({
    price: v.number(),
    ma200: v.optional(v.number()),
    rsi14: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
