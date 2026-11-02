import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Resolve the caller's Convex user from their Clerk identity.
 * The role is stored server-side (Convex users table, seeded from Clerk
 * publicMetadata) — a client-sent role is never trusted.
 */
export async function getCaller(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireCaller(ctx: QueryCtx | MutationCtx) {
  const caller = await getCaller(ctx);
  if (!caller) throw new Error("Not authenticated");
  return caller;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const caller = await requireCaller(ctx);
  if (caller.role !== "admin") throw new Error("Admin only");
  return caller;
}

/** True when the request is overdue: approved, past end date, not returned. */
export function isOverdue(status: string, endDate: string, now = new Date()) {
  if (status !== "approved") return false;
  return endDate < now.toISOString().slice(0, 10);
}
