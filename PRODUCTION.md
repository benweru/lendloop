# PRODUCTION.md — running LendLoop in production

Short note on what changes beyond this take-home setup.

## Auth & identity

- Enforce Clerk webhook verification for user lifecycle events (create/delete)
  instead of lazy `ensureUser`, so deprovisioning is immediate.
- Rotate Clerk keys per environment; restrict allowed origins and OAuth
  redirect URLs to the production domain.

## Data & backend (Convex)

- Use separate Convex dev/staging/prod deployments; deploy via
  `CONVEX_DEPLOY_KEY` in CI, never from a laptop.
- Add pagination + indexes review as data grows.
- Back up via Convex snapshots/exports on a schedule; test restore.

## Secrets & webhooks

- Store `WEBHOOK_HMAC_SECRET` in a secret manager (not `.env` files); rotate
  with a dual-secret grace window (accept N and N−1 during rotation).
- Pin the timestamp tolerance deliberately (currently ±5 min) and alert on
  repeated 401s — they indicate misconfiguration or probing.
- Give n8n and the app distinct secrets per direction if threat modeling
  warrants it, so compromise of one leg doesn't forge the other.

## n8n

- Run n8n behind TLS with basic-auth/SSO, persistent encrypted volume, and
  versioned workflow exports in git (already in `n8n/workflows/`).
- Replace the mock-log fallback with a real provider (e.g. Resend/Postmark)
  with bounce handling; keep the mock only for non-prod environments.
- Monitor workflow executions (error workflow → alerting channel, e.g. Slack
  or PagerDuty) and set execution retention/pruning.

## App hosting

- Host Next.js on Vercel (or equivalent) with preview deployments per PR;
  require `npm run build` + `npx vitest run` + lint in CI before merge.
- Add observability: error tracking (e.g. Sentry) and analytics on loan
  outcomes; ship audit-log entries to long-term storage.

## Already implemented

- **Rate limiting:** per-user fixed-window limits on listing creation
  (10/hour) and borrow requests (20/hour), stored in Convex and enforced in
  the mutation transaction (`convex/limits.ts`). In production, add IP-level
  limits at the edge for unauthenticated traffic and tune limits from data.
- **Audit log:** append-only `auditLog` table recording actor ID, action,
  target ID and time for listing create/delete, admin removals,
  trusted-lender changes and every request transition. Admin-only query and
  view in the Admin panel. In production, add retention rules and export.

## Privacy

- Define a data-retention policy (e.g. purge returned-loan PII after N months),
  honor deletion requests end-to-end (Clerk + Convex + email provider
  suppression lists), and document this in a privacy notice.
