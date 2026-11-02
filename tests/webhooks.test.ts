import { describe, expect, it } from "vitest";
import {
  isTimestampFresh,
  reminderIdempotencyKey,
  signPayload,
  timingSafeEqual,
  verifySignature,
} from "../convex/webhooks";

const SECRET = "test-secret";

describe("HMAC webhook signing", () => {
  it("signs and verifies a valid payload", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ requestId: "abc" });
    const sig = await signPayload(SECRET, ts, body);
    expect(await verifySignature(SECRET, ts, body, sig)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await signPayload(SECRET, ts, "original");
    expect(await verifySignature(SECRET, ts, "tampered", sig)).toBe(false);
  });

  it("rejects a wrong secret", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await signPayload("other-secret", ts, "body");
    expect(await verifySignature(SECRET, ts, "body", sig)).toBe(false);
  });

  it("rejects stale timestamps", async () => {
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const sig = await signPayload(SECRET, old, "body");
    expect(await verifySignature(SECRET, old, "body", sig)).toBe(false);
  });

  it("rejects future timestamps outside the window", async () => {
    const future = String(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signPayload(SECRET, future, "body");
    expect(await verifySignature(SECRET, future, "body", sig)).toBe(false);
  });

  it("rejects malformed timestamps", () => {
    expect(isTimestampFresh("not-a-number")).toBe(false);
    expect(isTimestampFresh("")).toBe(false);
  });
});

describe("timingSafeEqual", () => {
  it("compares equal and unequal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("idempotency keys", () => {
  it("is stable for the same loan and date, unique across dates", () => {
    expect(reminderIdempotencyKey("loan1", "2026-11-02")).toBe(
      reminderIdempotencyKey("loan1", "2026-11-02"),
    );
    expect(reminderIdempotencyKey("loan1", "2026-11-02")).not.toBe(
      reminderIdempotencyKey("loan1", "2026-11-03"),
    );
    expect(reminderIdempotencyKey("loan1", "2026-11-02")).not.toBe(
      reminderIdempotencyKey("loan2", "2026-11-02"),
    );
  });
});
