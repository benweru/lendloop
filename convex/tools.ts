import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireCaller } from "./helpers";
import { TOOL_CATEGORIES } from "./schema";
import { audit, enforceRateLimit } from "./limits";

const categoryValidator = v.union(
  ...TOOL_CATEGORIES.map((c) => v.literal(c)),
);

/** Public read-only list: name and category only, no owner details. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .filter((q) => q.eq(q.field("available"), true))
      .collect();
    return tools.map((t) => ({ _id: t._id, name: t.name, category: t.category }));
  },
});

/** Signed-in view: all tools with availability status, filterable by category. */
export const listAll = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireCaller(ctx);
    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("tools").collect();
    const owners = new Map(
      (await ctx.db.query("users").collect()).map((u) => [u._id, u]),
    );
    return tools.map((t) => ({
      ...t,
      ownerTrusted: owners.get(t.ownerId)?.trustedLender ?? false,
    }));
  },
});

export const myListings = query({
  args: {},
  handler: async (ctx) => {
    const caller = await requireCaller(ctx);
    return ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", caller._id))
      .collect();
  },
});

export const createTool = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireCaller(ctx);
    if (!args.name.trim()) throw new Error("Name is required");
    await enforceRateLimit(ctx, caller._id, "createTool");
    const toolId = await ctx.db.insert("tools", {
      ownerId: caller._id,
      name: args.name.trim(),
      category: args.category,
      condition: args.condition,
      description: args.description,
      available: true,
    });
    await audit(ctx, caller._id, "tool.create", toolId);
    return toolId;
  },
});

export const updateTool = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.optional(v.string()),
    category: v.optional(categoryValidator),
    condition: v.optional(v.string()),
    description: v.optional(v.string()),
    available: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCaller(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.ownerId !== caller._id && caller.role !== "admin")
      throw new Error("Not your listing");
    const { toolId, ...patch } = args;
    await ctx.db.patch(toolId, patch);
  },
});

export const deleteTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const caller = await requireCaller(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.ownerId !== caller._id && caller.role !== "admin")
      throw new Error("Not your listing");
    await ctx.db.delete(args.toolId);
    await audit(
      ctx,
      caller._id,
      tool.ownerId === caller._id ? "tool.delete" : "tool.admin_remove",
      args.toolId,
    );
  },
});

/** Admin: remove any listing. */
export const adminRemoveListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!(await ctx.db.get(args.toolId))) throw new Error("Tool not found");
    await ctx.db.delete(args.toolId);
    await audit(ctx, admin._id, "tool.admin_remove", args.toolId);
  },
});
