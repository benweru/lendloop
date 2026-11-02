import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCaller, requireAdmin } from "./helpers";
import { audit } from "./limits";

/**
 * Ensure the signed-in Clerk user has a Convex users row.
 * Role bootstrap: Clerk `publicMetadata.role === "admin"` grants admin,
 * otherwise "user". Called on first authenticated load.
 */
export const ensureUser = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) return existing._id;
    const metaRole = (identity.publicMetadata as { role?: string } | undefined)
      ?.role;
    return ctx.db.insert("users", {
      clerkId: identity.subject,
      email: args.email ?? identity.email,
      role: metaRole === "admin" ? "admin" : "user",
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => getCaller(ctx),
});

export const allUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("users").collect();
  },
});

/** Admin: mark a lender as a "Trusted Lender". */
export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
    await audit(
      ctx,
      admin._id,
      "user.set_trusted",
      args.userId,
      args.trusted ? "trusted" : "untrusted",
    );
  },
});

/** Admin: most recent audit entries (IDs only; actor shown by user ID). */
export const auditLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const n = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return ctx.db.query("auditLog").withIndex("by_at").order("desc").take(n);
  },
});
