import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { isOverdue } from "./helpers";
import { reminderIdempotencyKey } from "./webhooks";

export const getOverdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const approved = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const today = new Date().toISOString().slice(0, 10);
    return {
      today,
      overdue: approved
        .filter((r) => isOverdue(r.status, r.endDate))
        .map((r) => ({
          requestId: r._id,
          toolId: r.toolId,
          borrowerId: r.borrowerId,
          endDate: r.endDate,
          reminderDate: today,
          idempotencyKey: reminderIdempotencyKey(r._id, today),
        })),
    };
  },
});

export const getBorrowerContact = internalQuery({
  args: { borrowerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.borrowerId as never);
    if (!user || !("email" in user)) return { email: null };
    return { email: (user as { email?: string }).email ?? null };
  },
});

export const ackReminder = internalMutation({
  args: {
    requestId: v.string(),
    reminderDate: v.string(),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const key = reminderIdempotencyKey(args.requestId, args.reminderDate);
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId as never))
      .filter((q) => q.eq(q.field("reminderDate"), args.reminderDate))
      .unique();
    if (existing) return { ok: true as const, deduped: true, key };
    await ctx.db.insert("reminders", {
      requestId: args.requestId as never,
      reminderDate: args.reminderDate,
      sentAt: Date.now(),
      channel: args.channel ?? "email",
    });
    return { ok: true as const, deduped: false, key };
  },
});
