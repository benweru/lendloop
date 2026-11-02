/**
 * HMAC-SHA256 webhook signing, shared by Convex and the test suite.
 * (n8n mirrors this logic in a Code node; see n8n/workflows/*.json.)
 *
 * Wire format:
 *   headers: x-lendloop-signature: "sha256=<hex>", x-lendloop-timestamp: "<unix seconds>"
 *   signed payload: `${timestamp}.${rawBody}`
 *
 * Verification uses a constant-time compare and rejects stale timestamps.
 */

const SIGNATURE_PREFIX = "sha256=";
export const TIMESTAMP_TOLERANCE_SECONDS = 300;

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signPayload(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return SIGNATURE_PREFIX + toHex(sig);
}

/** Constant-time string comparison to avoid timing side channels. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isTimestampFresh(
  timestamp: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  tolerance = TIMESTAMP_TOLERANCE_SECONDS,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowSeconds - ts) <= tolerance;
}

export async function verifySignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!isTimestampFresh(timestamp, nowSeconds)) return false;
  const expected = await signPayload(secret, timestamp, rawBody);
  return timingSafeEqual(expected, signature);
}

/** Idempotency key for reminder write-backs: one key per loan per day. */
export function reminderIdempotencyKey(
  requestId: string,
  reminderDate: string,
): string {
  return `${requestId}:${reminderDate}`;
}

/** Minimal request-event payload sent to n8n. Flat, string-only fields. */
export type RequestEvent = {
  requestId: string;
  toolName: string;
  status: string;
  startDate: string;
  endDate: string;
  borrowerId: string;
};

export function buildRequestEvent(
  req: {
    _id: string;
    status: string;
    startDate: string;
    endDate: string;
    borrowerId: string;
  },
  tool: { name: string },
): RequestEvent {
  // Fixed key order: n8n re-serializes the parsed body to verify the HMAC.
  return {
    requestId: String(req._id),
    toolName: tool.name,
    status: req.status,
    startDate: req.startDate,
    endDate: req.endDate,
    borrowerId: String(req.borrowerId),
  };
}

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

/**
 * POST a signed JSON payload with retry and exponential backoff.
 * Never throws: returns the outcome so callers can log it.
 */
export async function postSignedWithRetry(opts: {
  url: string;
  secret: string;
  payload: unknown;
  fetchFn?: FetchLike;
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  nowSeconds?: () => number;
}): Promise<{ ok: boolean; attempts: number; lastStatus?: number; error?: string }> {
  const fetchFn = opts.fetchFn ?? (fetch as unknown as FetchLike);
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  const body = JSON.stringify(opts.payload);
  let lastStatus: number | undefined;
  let error: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Re-sign each attempt so the timestamp stays fresh.
    const timestamp = String(now());
    const signature = await signPayload(opts.secret, timestamp, body);
    try {
      const res = await fetchFn(opts.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-signature": signature,
          "x-lendloop-timestamp": timestamp,
        },
        body,
      });
      lastStatus = res.status;
      if (res.ok) return { ok: true, attempts: attempt, lastStatus };
      // 4xx (except 429) will not succeed on retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 429)
        return { ok: false, attempts: attempt, lastStatus };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    if (attempt < maxAttempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
  return { ok: false, attempts: maxAttempts, lastStatus, error };
}
