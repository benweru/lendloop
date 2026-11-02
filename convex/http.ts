import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifySignature } from "./webhooks";

const http = httpRouter();

function secret(): string {
  const s = process.env.WEBHOOK_HMAC_SECRET;
  if (!s) throw new Error("WEBHOOK_HMAC_SECRET is not set");
  return s;
}

async function checkGet(req: Request): Promise<boolean> {
  const signature = req.headers.get("x-lendloop-signature") ?? "";
  const timestamp = req.headers.get("x-lendloop-timestamp") ?? "";
  return verifySignature(secret(), timestamp, "", signature);
}

/**
 * GET /api/overdue — polled daily by the n8n overdue-reminder workflow.
 * Returns minimal fields only (IDs, dates, status); n8n resolves the
 * borrower contact server-side via /api/borrower-contact when sending.
 */
http.route({
  path: "/api/overdue",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!(await checkGet(req)))
      return new Response("Invalid signature", { status: 401 });
    const data = await ctx.runQuery(internal.internal.getOverdue, {});
    return Response.json(data);
  }),
});

/**
 * GET /api/borrower-contact?borrowerId=… — lets n8n resolve the email for a
 * borrower ID at send time, so the overdue list itself carries no PII.
 */
http.route({
  path: "/api/borrower-contact",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!(await checkGet(req)))
      return new Response("Invalid signature", { status: 401 });
    const borrowerId = new URL(req.url).searchParams.get("borrowerId");
    if (!borrowerId) return new Response("Missing borrowerId", { status: 400 });
    return Response.json(
      await ctx.runQuery(internal.internal.getBorrowerContact, { borrowerId }),
    );
  }),
});

/**
 * POST /api/reminder-ack — idempotent write-back from n8n after sending a
 * reminder. Retries reuse the same idempotency key and never duplicate rows.
 */
http.route({
  path: "/api/reminder-ack",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-lendloop-signature") ?? "";
    const timestamp = req.headers.get("x-lendloop-timestamp") ?? "";
    if (!(await verifySignature(secret(), timestamp, rawBody, signature)))
      return new Response("Invalid signature", { status: 401 });
    const body = JSON.parse(rawBody) as {
      requestId?: string;
      reminderDate?: string;
      channel?: string;
    };
    if (!body.requestId || !body.reminderDate)
      return new Response("Missing fields", { status: 400 });
    return Response.json(
      await ctx.runMutation(internal.internal.ackReminder, {
        requestId: body.requestId,
        reminderDate: body.reminderDate,
        channel: body.channel,
      }),
    );
  }),
});

export default http;
