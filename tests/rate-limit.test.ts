import { describe, expect, it } from "vitest";
import { nextWindow, RATE_LIMITS } from "../convex/limits";

const HOUR = 60 * 60 * 1000;

describe("fixed-window rate limiter", () => {
  it("opens a new window on first use", () => {
    expect(nextWindow(null, 1000, 3, HOUR)).toEqual({
      allowed: true,
      state: { windowStart: 1000, count: 1 },
      retryAfterMs: 0,
    });
  });

  it("allows up to the limit, then blocks with a retry-after", () => {
    let state = nextWindow(null, 0, 3, HOUR).state;
    state = nextWindow(state, 10, 3, HOUR).state;
    state = nextWindow(state, 20, 3, HOUR).state;
    expect(state.count).toBe(3);
    const blocked = nextWindow(state, 30, 3, HOUR);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(HOUR - 30);
    expect(blocked.state).toEqual(state); // blocked calls do not consume
  });

  it("resets after the window elapses", () => {
    const full = { windowStart: 0, count: 3 };
    expect(nextWindow(full, HOUR, 3, HOUR)).toMatchObject({
      allowed: true,
      state: { windowStart: HOUR, count: 1 },
    });
  });

  it("has limits configured for listing and request creation", () => {
    expect(RATE_LIMITS.createTool.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.requestToBorrow.limit).toBeGreaterThan(0);
  });
});
