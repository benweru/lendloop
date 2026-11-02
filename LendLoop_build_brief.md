# LendLoop build brief (Fluence take-home)

Build "LendLoop", a neighborhood tool-lending board with automated workflows.
Repo: https://github.com/benweru/lendloop (private for now; make it public or add Fluence as a collaborator before emailing).

## Stack
- Next.js (App Router) + TypeScript
- Clerk for authentication
- Convex for data and backend logic
- n8n, self-hosted via docker-compose

## Public page
- Company name LendLoop, tagline "Borrow what you need. Lend what you don't."
- Read-only list of available tools from Convex: name and category only, no owner details.
- "Sign in to lend or borrow" button wired to Clerk.

## Signed-in users can
- List a tool: name, category (power tools, garden, kitchen, camping, etc.), condition, short description.
- Request to borrow a tool for a date range.
- Approve or decline requests on their own tools.
- Mark a loan as returned.
- See all tools with availability status, filterable by category.
- Views: "My listings", "My requests", "Incoming requests". Nice, minimal layout.

## Roles (enforce in Convex functions, not only in the UI)
- admin: remove any listing, view all loans, mark a lender as "Trusted Lender".
- user: create, edit, delete only their own listings; act only on requests involving their own tools or their own borrowing.
- Store the role server-side (Convex users table or Clerk publicMetadata checked in Convex), never trust a client-sent role.

## n8n workflows (at least two)
1. Request notification: when a borrow request is created or changes status, Convex calls an n8n Webhook. n8n notifies the relevant user (email, Slack, Discord, or a logged mock) using only the fields it needs.
2. Overdue reminders: a daily scheduled workflow fetches overdue loans from a Convex HTTP endpoint, sends a reminder to each borrower, and writes the reminder status back to Convex.

## Security and reliability
- Sign webhook payloads with HMAC-SHA256 and a shared secret, include a timestamp, and verify signatures (constant-time compare, reject stale timestamps) on both sides: Convex to n8n, and n8n to Convex.
- Secrets live in env vars and n8n credentials only, never in code or the exported workflow JSON. Ship a .env.example.
- Idempotent write-backs: use an idempotency key (e.g. loanId + reminder date) so retries never duplicate records or reminders.
- Retries on HTTP nodes plus an n8n Error Workflow, so failed runs are visible and never fail silently.
- Data minimization: webhook payloads carry IDs and the minimum fields, no unnecessary PII.
- Bonus: show recent automation activity on each loan, e.g. "Reminder sent 2 days ago".

## Deliverables
- App source code in the GitHub repo.
- Exported n8n workflow JSON files in the repo (e.g. /n8n/workflows/).
- docker-compose.yml for n8n.
- README: local setup (including n8n), environment variables, architecture, security and data-minimization decisions.
- PRODUCTION.md: a short note on what you'd change to run this in production.
- Tests for HMAC verification, RBAC checks and idempotency.

## They evaluate
Code structure and clarity, security-minded thinking, UX and practicality, n8n integration design, reliability and error handling, documentation and reasoning.

## Note for the application email (later)
Email to techjobs@fluencetraining.com with portfolio, the GitHub repo link, optionally 1-2 other projects, and a short note on a security/privacy consideration in a healthcare-like context. Include the word "pineapple" (they ask for it to confirm you read the post).
