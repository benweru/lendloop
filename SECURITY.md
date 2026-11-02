# Security notes and threat model

Scope: the LendLoop app (Next.js + Clerk), its Convex backend, and the two
n8n workflows. This document only describes controls that exist in the code,
with file references. Residual risks are listed honestly at the end.

## Assets

- User identity and role (Clerk session, Convex `users` row).
- Listings and loans (`tools`, `requests`), including who borrowed what.
- Borrower email addresses (PII, stored in `users.email`).
- The shared `WEBHOOK_HMAC_SECRET` and Clerk keys.

## Threats and mitigations

| Threat | Mitigation in code | Where |
| --- | --- | --- |
| Spoofed webhook (someone calls n8n or Convex pretending to be the other side) | HMAC-SHA256 over `${timestamp}.${rawBody}` with a shared secret, verified on both sides; constant-time compare | `convex/webhooks.ts` (`signPayload`, `verifySignature`, `timingSafeEqual`), `convex/http.ts`, "Verify HMAC" node in `n8n/workflows/request-notification.json`, signing nodes in `n8n/workflows/overdue-reminders.json` |
| Replayed webhook | Signed timestamp, rejected outside a ±300 s window | `isTimestampFresh` in `convex/webhooks.ts`; same check in the n8n Code node |
| Duplicate side effects from retries | Reminder write-back keyed by `requestId:reminderDate`; a retry returns `deduped: true` | `reminderIdempotencyKey` in `convex/webhooks.ts`, `ackReminder` in `convex/internal.ts` |
| Privilege escalation (user acting as admin) | Role is read from the server-side `users` row, never from the client; admin is granted only from Clerk `publicMetadata` (editable only via Clerk dashboard/backend) | `requireAdmin` in `convex/helpers.ts`, `ensureUser` in `convex/users.ts` |
| IDOR on listings (editing or deleting someone else's tool by ID) | Every write checks `tool.ownerId === caller._id` or admin | `updateTool`, `deleteTool` in `convex/tools.ts` |
| IDOR on loans (approving, returning or reading someone else's loan) | Approve/decline: owner only; return: owner or borrower; cancel: borrower only; status machine enforced; loan activity readable only by borrower, owner or admin | `actOnRequest`, `loanActivity` in `convex/requests.ts` |
| Unauthenticated data access | All non-public queries call `requireCaller`; the public list returns name and category only | `convex/helpers.ts`, `listPublic` in `convex/tools.ts` |
| Secret leakage | Secrets only in env vars (Convex env, container env); workflows read `$env.*`; `.env*` is git-ignored except the placeholder `.env.example`; docker-compose refuses to start without required secrets | `.gitignore`, `.env.example`, `docker-compose.yml`, `n8n/workflows/*.json` |
| PII exposure to n8n | Request events carry IDs, tool name, dates and status only; the overdue list carries no emails; n8n looks up one borrower email at send time through a signed endpoint | `buildRequestEvent` in `convex/webhooks.ts`, `getOverdue` / `getBorrowerContact` in `convex/internal.ts` |
| Spam / abuse (mass listings or requests) | Per-user fixed-window rate limits on listing and borrow-request creation, stored in Convex and enforced inside the mutation transaction | `convex/limits.ts` (`RATE_LIMITS`, `enforceRateLimit`), `createTool`, `requestToBorrow` |
| Unaccountable admin or sensitive actions | Append-only `auditLog` table (actor ID, action, target ID, time; no emails or free text) for listing create/delete/admin removal, trusted-lender changes and every request transition; admin-only read | `audit` in `convex/limits.ts`, `auditLog` query in `convex/users.ts`, Admin panel in `app/home-client.tsx` |
| Automation outage blocking users | Request events are scheduled after the mutation commits and retried with backoff; failures are logged and never fail the user action; n8n has retries and an error workflow | `convex/notify.ts`, `postSignedWithRetry` in `convex/webhooks.ts`, `n8n/workflows/error-workflow.json` |

## Data sent to n8n

| Flow | Fields | Not sent |
| --- | --- | --- |
| Convex → n8n request event | `requestId`, `toolName`, `status`, `startDate`, `endDate`, `borrowerId` | emails, names, tool description/condition, owner details |
| n8n ← Convex `/api/overdue` | `requestId`, `toolId`, `borrowerId`, `endDate`, `reminderDate`, `idempotencyKey` | emails |
| n8n ← Convex `/api/borrower-contact` | `email` for one borrower ID | anything else about the user |
| n8n → Convex `/api/reminder-ack` | `requestId`, `reminderDate`, `channel` | n/a |

## Residual risks

- Replay inside the 5 minute window is possible: there is no nonce store.
- Signed GET requests sign `${timestamp}.` with an empty body, so the
  `borrowerId` query parameter on `/api/borrower-contact` is not covered by the
  signature. A captured signature could be reused within the window for a
  different ID. Fix: sign the path and query string too.
- One shared secret is used for both directions; compromise of either side
  allows forging the other (see `PRODUCTION.md`).
- `ensureUser` accepts an optional client-supplied email on first sign-in;
  it should come only from the verified Clerk identity.
- Signed-in users see `ownerId` (an opaque ID) on listings.
- The request-notification workflow sends to a placeholder address; real
  recipient lookup should reuse the signed contact endpoint.
- Rate limits are per user only; there is no IP-level throttling for
  unauthenticated traffic (that would sit at the edge in production).
- The audit log covers writes, not reads.

## Applying this to a healthcare-style setting

The same patterns map to clinician/admin workflows with PHI:

- Roles (e.g. clinician, admin, patient) stay server-side and every Convex
  function checks role plus relationship (clinician-to-patient assignment),
  just as LendLoop checks owner/borrower on each loan.
- Automation gets IDs, not PHI. n8n would fetch the minimum needed at send
  time through signed, narrowly scoped endpoints, and messages would avoid
  clinical detail ("You have a new message" rather than the content).
- Add what this demo lacks before handling PHI: extend the audit log to every
  read of patient data, nonce-based replay protection, per-direction
  secrets with rotation, edge rate limiting, BAAs with vendors (Clerk, Convex,
  email provider, n8n hosting), encryption and retention policies, and
  minimum-necessary access reviews.
