import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { buildRequestEvent, postSignedWithRetry } from "../convex/webhooks";

const SECRET = "test-secret";
const req = {
  _id: "req_1",
  status: "pending",
  startDate: "2026-11-03",
  endDate: "2026-11-05",
  borrowerId: "user_9",
  // Extra fields must never leak into the payload.
  toolId: "tool_1",
};
const tool = { name: "Cordless drill", ownerId: "user_2", description: "x" };

/** Run the n8n "Verify HMAC" Code node from the exported workflow JSON. */
function runN8nVerify(headers: Record<string, string>, body: unknown) {
  const wf = JSON.parse(
    readFileSync("n8n/workflows/request-notification.json", "utf8"),
  );
  const node = wf.nodes.find((n: { name: string }) => n.name === "Verify HMAC");
  const json = { headers, body };
  const fn = new Function("require", "$env", "$", "$json", node.parameters.jsCode);
  return fn(
    createRequire(import.meta.url),
    { WEBHOOK_HMAC_SECRET: SECRET },
    () => ({ first: () => ({ json }) }),
    json,
  );
}

describe("request event payload", () => {
  it("contains only the minimal fields", () => {
    expect(Object.keys(buildRequestEvent(req, tool))).toEqual([
      "requestId",
      "toolName",
      "status",
      "startDate",
      "endDate",
      "borrowerId",
    ]);
  });
});

describe("postSignedWithRetry", () => {
  it("produces a signature the exported n8n workflow accepts", async () => {
    const event = buildRequestEvent(req, tool);
    let captured: { headers: Record<string, string>; body: string } | undefined;
    const result = await postSignedWithRetry({
      url: "http://n8n/webhook",
      secret: SECRET,
      payload: event,
      fetchFn: async (_url, init) => {
        captured = init;
        return { ok: true, status: 200 };
      },
    });
    expect(result).toMatchObject({ ok: true, attempts: 1 });
    const out = runN8nVerify(captured!.headers, JSON.parse(captured!.body));
    expect(out[0].json).toEqual(event);
  });

  it("is rejected by n8n when the body is tampered", async () => {
    let captured: { headers: Record<string, string>; body: string } | undefined;
    await postSignedWithRetry({
      url: "u",
      secret: SECRET,
      payload: buildRequestEvent(req, tool),
      fetchFn: async (_u, init) => {
        captured = init;
        return { ok: true, status: 200 };
      },
    });
    const body = { ...JSON.parse(captured!.body), status: "approved" };
    expect(() => runN8nVerify(captured!.headers, body)).toThrow("Invalid signature");
  });

  it("retries with exponential backoff on network errors and 5xx", async () => {
    const sleep = vi.fn(async () => {});
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await postSignedWithRetry({
      url: "u",
      secret: SECRET,
      payload: {},
      fetchFn,
      sleep,
      baseDelayMs: 100,
    });
    expect(result).toMatchObject({ ok: true, attempts: 3 });
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it("never throws when n8n stays down", async () => {
    const result = await postSignedWithRetry({
      url: "u",
      secret: SECRET,
      payload: {},
      fetchFn: async () => {
        throw new Error("down");
      },
      sleep: async () => {},
    });
    expect(result).toMatchObject({ ok: false, attempts: 3, error: "down" });
  });

  it("does not retry on 401", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const result = await postSignedWithRetry({
      url: "u",
      secret: SECRET,
      payload: {},
      fetchFn,
      sleep: async () => {},
    });
    expect(result).toMatchObject({ ok: false, attempts: 1, lastStatus: 401 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
