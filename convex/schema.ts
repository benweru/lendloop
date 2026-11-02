import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const TOOL_CATEGORIES = [
  "power tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "automotive",
  "other",
] as const;

export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "declined",
  "returned",
  "cancelled",
] as const;

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  }).index("by_clerk_id", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
    available: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  requests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
      v.literal("cancelled"),
    ),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status", ["status"]),

  // One row per (request, reminder date). The document ID IS the idempotency
  // key (`requestId + reminder date`), so retries can never duplicate rows.
  reminders: defineTable({
    requestId: v.id("requests"),
    reminderDate: v.string(),
    sentAt: v.number(),
    channel: v.string(),
  }).index("by_request", ["requestId"]),

  // Per-user fixed-window rate limit counters (see convex/limits.ts).
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_user_action", ["userId", "action"]),

  // Append-only audit trail of admin and sensitive actions. IDs only.
  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetId: v.string(),
    detail: v.optional(v.string()),
    at: v.number(),
  }).index("by_at", ["at"]),
});
