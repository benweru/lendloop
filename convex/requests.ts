import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { isOverdue, requireAdmin, requireCaller } from "./helpers";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

function withOverdue<T extends { status: string; endDate: string }>(r: T) {
  return { ...r, overdue: isOverdue(r.status, r.endDate) };
}

export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const caller = await requireCaller(ctx);
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", caller._id))
      .collect();
    return rows.map(withOverdue);
  },
});

export const incomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const caller = await requireCaller(ctx);
    const mine = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", caller._id))
      .collect();
    const mineIds = new Set(mine.map((t) => t._id));
    const pending = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pending.filter((r) => mineIds.has(r.toolId)).map(withOverdue);
  },
});

/** Admin: view all loans. */
export const allRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("requests").collect()).map(withOverdue);
  },
});

export const requestToBorrow = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireCaller(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.ownerId === caller._id) throw new Error("Cannot borrow your own tool");
    if (!tool.available) throw new Error("Tool is not available");
    if (args.startDate > args.endDate) throw new Error("Invalid date range");
    return ctx.db.insert("requests", {
      toolId: args.toolId,
      borrowerId: caller._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
    });
  },
});

async function actOnRequest(
  ctx: MutationCtx,
  requestId: Id<"requests">,
  action: "approve" | "decline" | "return" | "cancel",
) {
  const caller = await requireCaller(ctx);
  const req = await ctx.db.get(requestId);
  if (!req) throw new Error("Request not found");
  const tool = await ctx.db.get(req.toolId);
  if (!tool) throw new Error("Tool not found");
  const isOwner = tool.ownerId === caller._id;
  const isBorrower = req.borrowerId === caller._id;

  if (action === "approve" || action === "decline") {
    if (!isOwner) throw new Error("Only the owner can respond");
    if (req.status !== "pending") throw new Error("Request is not pending");
    await ctx.db.patch(req._id, {
      status: action === "approve" ? "approved" : "declined",
    });
    if (action === "approve") await ctx.db.patch(tool._id, { available: false });
  } else if (action === "return") {
    if (!isOwner && !isBorrower) throw new Error("Not your loan");
    if (req.status !== "approved") throw new Error("Loan is not active");
    await ctx.db.patch(req._id, { status: "returned" });
    await ctx.db.patch(tool._id, { available: true });
  } else {
    if (!isBorrower) throw new Error("Only the borrower can cancel");
    if (req.status !== "pending") throw new Error("Request is not pending");
    await ctx.db.patch(req._id, { status: "cancelled" });
  }
  return req._id;
}

export const approveRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: (ctx, args) => actOnRequest(ctx, args.requestId, "approve"),
});

export const declineRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: (ctx, args) => actOnRequest(ctx, args.requestId, "decline"),
});

export const markReturned = mutation({
  args: { requestId: v.id("requests") },
  handler: (ctx, args) => actOnRequest(ctx, args.requestId, "return"),
});

export const cancelRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: (ctx, args) => actOnRequest(ctx, args.requestId, "cancel"),
});

/** Recent automation activity on a loan (reminder rows). */
export const loanActivity = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const caller = await requireCaller(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    const tool = await ctx.db.get(req.toolId);
    const allowed =
      req.borrowerId === caller._id ||
      tool?.ownerId === caller._id ||
      caller.role === "admin";
    if (!allowed) throw new Error("Not your loan");
    return ctx.db
      .query("reminders")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
  },
});

export { statusValidator };
