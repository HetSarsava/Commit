# WhatsApp acceptance report — 3 October 2026 (Asia/Kolkata)

## COMPLETED

- Real Meta transport, configurable Graph version, authorization, timeouts and safe errors; no automatic retry of ambiguous sends.
- Authenticated inbox/text/template/business-flow routes, real Meta IDs and durable message/conversation/status storage.
- Token-verified GET and signed POST webhook at `/api/whatsapp/webhook`, configured on the existing test app; app `messages` and test-WABA app subscriptions confirmed.
- Customer/lead matching and unresolved contacts, deduplication, timestamps, activity references and monotonic status updates.
- Existing UI preserved with real records, live polling, sending/failure/status feedback, new conversations and approved text templates.
- Free Cloudflare Quick Tunnel with a webhook-only gateway. No paid account/domain, real-number migration, business verification, or app publication.
- Additive PostgreSQL migration plus original-schema baseline; separate durable SQLite demo store.

## TESTED

- Real Meta callback verification succeeded over the HTTPS Quick Tunnel.
- `hello_world` was accepted with a real `wamid` and persisted; real sent/delivered/read events arrived.
- The user replied from personal WhatsApp; text arrived through Meta's signed webhook and was persisted/displayed in the Commit inbox as an unresolved contact.
- A text reply sent from the actual CRM UI was persisted and reached real `READ` status.
- Meta rejected a deliberately nonexistent template with code 132001; authenticated API returned 502 and stored `FAILED` without claiming success.
- All 22 automated tests passed, including business-flow controllers, SQLite/provider/HTTP coverage and the PostgreSQL adapter test (no skips in the full run).
- Additive migration preserved a customer created before the migration in an isolated local PostgreSQL database. The baseline and WhatsApp tables deployed successfully to a separate fresh database; the third request-idempotency migration was subsequently deployed and tested there.
- Frontend production build and lint completed successfully. The changed WhatsApp page has zero lint diagnostics. Existing repository warnings remain; no unrelated features were refactored.
- After backend restart, both inbound records, both real outbound IDs/read states and the failed-template record remained intact. Public CRM routes returned 404, unsigned webhooks 401 and unauthenticated inbox requests 401.

## Follow-up hardening

Persisted optional send-request keys prevent duplicate retries across backend restarts and reject conflicting payloads/users. Tests cover concurrent attempts, failed sends, accepted responses followed by storage failure, and status reconciliation. Business-flow controller tests also verify request-key forwarding and replay. The UI prevents overlapping sends and stale message responses after changing conversations. History query inputs are strictly validated. The 22-test run includes the PostgreSQL adapter and no skips; frontend build and changed-file lint pass. The original real Meta acceptance remains the live integration evidence; follow-up send tests use mocked Meta responses.

## Persistent demo follow-up — 3 October 2026

- Deployed the isolated Worker/D1 inbox on Cloudflare's verified **Free ($0)** plan. Its stable callback is `https://commit-whatsapp-demo.commit-whatsapp-relay.workers.dev/api/whatsapp/webhook`. Meta callback verification succeeded and the test-app `messages` subscription was updated successfully. The temporary tunnel/gateway were stopped.
- Approved verification/account/sync secrets are encrypted Worker secrets. The Meta sending token stays local. The local backend automatically polls the authenticated inbox and rechecks the original Meta signature before using the existing idempotent service.
- A signed **synthetic status event**, sent while the backend was stopped, was retained once despite duplicate submission. Restarting the backend persisted it locally and acknowledged it; cloud pending count returned to zero. This transport test does not claim a new real Meta message.
- Cloud unsigned POST and unauthorized sync requests returned 401; public CRM paths returned 404. All **26 backend tests plus six relay tests passed**, including PostgreSQL, lost-ACK recovery, recipient allowlisting and backlog limits. Worker bundle validation and deployment succeeded.
- The private demo recipient allowlist fails closed for other numbers. No production sender, billing, paid plan or unofficial WhatsApp client was enabled.
- Created the approved Employee system user and assigned only the Commit WA app and test WhatsApp account, with messaging and read-only phone/template asset permissions. Token generation with no scheduled expiry is prepared but not yet complete: explicit approval for Meta's named `whatsapp_business_management` API scope and private token installation are pending. The old sending token is expired, so new outbound acceptance has not been retested in this phase.
- A fresh personal-phone message was requested for real recovery testing and has not yet been confirmed. The local backend is running again; messages arriving now will sync automatically.

See `WHATSAPP_PERSISTENT_DEMO.md` for restart, deployment, privacy, retention and free-tier limits. The cloud receiver survives local downtime; viewing the CRM and sending replies still require the local backend.

## NOT TESTED

- A real **failed-delivery webhook** was not induced; its processing is covered by automated tests. The real failure test was an outbound API rejection.
- Every legacy quotation/order/payment/production business scenario was not sent to real customers. Their transport is shared and covered in automated tests; only the personal test recipient received real messages.
- Media downloading, carousel/media templates, unattended automation execution, bulk messaging and production WhatsApp assets were not exercised or enabled.

## REQUIRES USER ACTION

No further action was required for the tested two-way demo. Keep this computer awake/online for the current local demo. Renew expired temporary Meta credentials privately and reconfigure Meta after a Quick Tunnel URL changes. Review the PR before merging.

## OPTIONAL PRODUCTION FOLLOW-UP

Stable hosting, managed credentials, business-template mappings, durable workflow/outbox processing, pagination/indexed contact matching, retention/backups, authorization review and dependency remediation are documented in `WHATSAPP_CLOUD_API.md`.

## Files and security notes

Main changes: backend `src/services/whatsapp/`, `src/routes/whatsappWebhook.js`, existing WhatsApp controller/routes/server, Prisma schema/migrations, tests, webhook gateway script, backend package/lock/environment example, frontend `WhatsAppEnhanced.jsx`, ignore rules, and integration documentation.

Runtime credentials, `.env`, tunnel tools, local databases and local test output are excluded from Git. No tracked plaintext credential note was found. Server credentials were never provided to React. The public gateway exposes only the signed webhook. Existing backend dependency audit reported 12 vulnerabilities (2 moderate, 10 high) after installation; no broad dependency upgrade was attempted. The existing frontend build emits a large-chunk warning and lint reports unrelated warnings. Existing CRM mock-mode authentication/data and incomplete PostgreSQL support in unrelated modules remain separate production gaps.

Branch: `feature/real-whatsapp-cloud-api`. The PR URL is supplied in the final task report.
