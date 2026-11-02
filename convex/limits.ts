import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Per-user rate limits, stored in the Convex `rateLimits` table.
 * Fixed-window counter: one row per (user, action). Mutations are
 * transactional in Convex, so concurrent calls cannot double-spend a slot.
 */
export const RATE_LIMITS = {
  createTool: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 listings / hour
  requestToBorrow: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 requests / hour
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

export type WindowState = { windowStart: number; count: number };

/** Pure decision function (unit-tested). */
export function nextWindow(
  state: WindowState | null,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; state: WindowState; retryAfterMs: number } {
  if (!state || now - state.windowStart >= windowMs) {
    return { allowed: true, state: { windowStart: now, count: 1 }, retryAfterMs: 0 };
  }
  if (state.count >= limit) {
    return {
      allowed: false,
      state,
      retryAfterMs: state.windowStart + windowMs - now,
    };
  }
  return {
    allowed: true,
    state: { windowStart: state.windowStart, count: state.count + 1 },
    retryAfterMs: 0,
  };
}

export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: RateLimitedAction,
) {
  const { limit, windowMs } = RATE_LIMITS[action];
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", action))
    .unique();
  const decision = nextWindow(row, Date.now(), limit, windowMs);
  if (!decision.allowed) {
    const minutes = Math.ceil(decision.retryAfterMs / 60000);
    throw new Error(`Rate limit reached. Try again in ${minutes} min.`);
  }
  if (row) await ctx.db.patch(row._id, decision.state);
  else await ctx.db.insert("rateLimits", { userId, action, ...decision.state });
}

/** Audit actions. Records IDs only; no emails or free text. */
export type AuditAction =
  | "tool.create"
  | "tool.delete"
  | "tool.admin_remove"
  | "user.set_trusted"
  | "request.create"
  | "request.approve"
  | "request.decline"
  | "request.return"
  | "request.cancel";

export async function audit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  action: AuditAction,
  targetId: string,
  detail?: string,
) {
  await ctx.db.insert("auditLog", {
    actorId,
    action,
    targetId,
    detail,
    at: Date.now(),
  });
}
