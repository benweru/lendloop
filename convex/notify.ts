import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { postSignedWithRetry } from "./webhooks";

/**
 * Sends a signed request event to the n8n request-notification workflow.
 * Scheduled from mutations via ctx.scheduler.runAfter(0, ...), so it runs
 * after the mutation commits and can never block or fail the user action.
 * Skips quietly when N8N_REQUEST_WEBHOOK_URL or WEBHOOK_HMAC_SECRET is unset.
 */
export const sendRequestEvent = internalAction({
  args: {
    event: v.object({
      requestId: v.string(),
      toolName: v.string(),
      status: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      borrowerId: v.string(),
    }),
  },
  handler: async (_ctx, args) => {
    const url = process.env.N8N_REQUEST_WEBHOOK_URL;
    const secret = process.env.WEBHOOK_HMAC_SECRET;
    if (!url || !secret) {
      console.log("request-event skipped: webhook URL or secret not set");
      return { ok: false, skipped: true };
    }
    const result = await postSignedWithRetry({ url, secret, payload: args.event });
    if (!result.ok) {
      console.error(
        `request-event delivery failed for ${args.event.requestId}`,
        JSON.stringify(result),
      );
    }
    return { ...result, skipped: false };
  },
});
