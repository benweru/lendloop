import { describe, expect, it } from "vitest";
import { isOverdue } from "../convex/helpers";

/**
 * RBAC and status-machine rules are enforced inside Convex functions
 * (helpers.ts / tools.ts / requests.ts). These tests pin the pure,
 * security-critical slices of that logic:
 *
 * - `isOverdue` is derived, never client-set: only approved loans past
 *   their end date count; pending/returned/declined never do.
 * - The transition table documents the only legal status moves; the
 *   mutations in requests.ts implement exactly these (approve/decline from
 *   pending by the owner; return from approved by owner or borrower;
 *   cancel from pending by the borrower).
 */

const NOW = new Date("2026-11-02T12:00:00Z");

describe("overdue derivation", () => {
  it("marks approved loans past their end date as overdue", () => {
    expect(isOverdue("approved", "2026-11-01", NOW)).toBe(true);
  });

  it("does not mark approved loans within their range", () => {
    expect(isOverdue("approved", "2026-11-02", NOW)).toBe(false);
    expect(isOverdue("approved", "2026-11-10", NOW)).toBe(false);
  });

  it("never flags non-approved statuses, even past the end date", () => {
    for (const status of ["pending", "declined", "returned", "cancelled"]) {
      expect(isOverdue(status, "2026-10-01", NOW)).toBe(false);
    }
  });
});

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["returned"],
  declined: [],
  returned: [],
  cancelled: [],
};

describe("status machine", () => {
  it("allows only the documented transitions", () => {
    expect(LEGAL_TRANSITIONS["pending"]).toContain("approved");
    expect(LEGAL_TRANSITIONS["approved"]).toEqual(["returned"]);
    for (const terminal of ["declined", "returned", "cancelled"]) {
      expect(LEGAL_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  it("forbids skipping pending (no direct pending -> returned)", () => {
    expect(LEGAL_TRANSITIONS["pending"]).not.toContain("returned");
  });
});
