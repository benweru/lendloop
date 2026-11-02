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
