import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    encryptedApiKey: v.string(),
    encryptedApiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      encryptedApiKey: args.encryptedApiKey,
      encryptedApiSecret: args.encryptedApiSecret,
      createdAt: Date.now(),
    });
    return userId;
  },
});

export const get = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getFirst = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(1);
    return users[0] || null;
  },
});

export const updateApiKeys = internalMutation({
  args: {
    id: v.id("users"),
    encryptedApiKey: v.string(),
    encryptedApiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      encryptedApiKey: args.encryptedApiKey,
      encryptedApiSecret: args.encryptedApiSecret,
    });
  },
});
