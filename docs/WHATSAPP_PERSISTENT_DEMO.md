# Persistent free WhatsApp demo

This demo keeps the official Meta **test sender**, never a linked-device bot on a personal WhatsApp number. The personal number is only an explicitly allowed test recipient. No production number migration, paid messaging activation, business verification or paid Cloudflare plan is needed or performed.

## Architecture

```
Meta test number -> signed HTTPS webhook -> Cloudflare Worker -> D1 inbox
Commit backend -> authenticated HTTPS polling -> verify original Meta signature
               -> existing WhatsApp service/database -> acknowledge cloud copy
Commit UI -> existing backend -> official Meta API -> allowed test recipient
```

The cloud inbox receives events even when the local CRM is stopped. The backend polls every 10 seconds by default, processes each original signed payload through the existing idempotent service, and acknowledges it only after persistence succeeds. Lost acknowledgements safely replay. Switching to the relay does not change customer matching, conversations, status updates or message IDs.

The entire CRM remains local. The Worker exposes only `/api/whatsapp/webhook`, `/health`, and authenticated `/relay/events`, `/relay/ack`, `/relay/status`. It does not expose demo login or CRM endpoints and it cannot send WhatsApp messages. The Meta sending token never leaves the backend.

## Free deployment

The relay lives in `infra/whatsapp-relay`; its package lock pins the official Wrangler dependency. Use a free Cloudflare account. The provided `workers.dev` hostname needs no purchased domain. Free Workers/D1 have request, CPU, read/write and storage limits; this is a persistent low-volume demo, not an uptime guarantee or unlimited service. Do not upgrade or activate billing to bypass limits.

1. Run `npm ci` in the relay directory.
2. Authenticate with `npx wrangler login --scopes account:read user:read workers:write workers_scripts:write d1:write`. The account owner approves the OAuth request.
3. Create a new isolated database using `npx wrangler d1 create commit-whatsapp-demo`.
4. Copy `wrangler.jsonc` to ignored `wrangler.local.jsonc` and set its database ID. Reuse the same Worker name and account to retain the hostname. Do not use temporary deployments.
5. Apply the relay-only schema using `npx wrangler d1 migrations apply commit-whatsapp-demo --remote --config wrangler.local.jsonc`.
6. Deploy with `npx wrangler deploy --config wrangler.local.jsonc`.
7. Install secrets using Wrangler's secret commands, preferably a private structured stdin stream: `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `RELAY_SYNC_TOKEN`. Do not pass values as command-line arguments or put them in Wrangler configuration.
8. Configure Meta's existing test-app `messages` callback as `https://<worker>.<account>.workers.dev/api/whatsapp/webhook`, with the same private verification token. Preserve its existing test-WABA app subscription.
9. Set private backend `WHATSAPP_RELAY_URL` to the Worker HTTPS origin and `WHATSAPP_RELAY_SYNC_TOKEN` to the same random sync token. Restart the backend with its existing `npm start` command. This enables polling automatically; no tunnel process is required.

The original direct webhook and Quick Tunnel script remain available as a fallback, but only one callback is configured in Meta. A fallback switch must be deliberately reconfigured and verified.

## Persistent Meta credentials and recipient protection

Use an Employee system user restricted to the Commit WA app and **Test WhatsApp Business Account**. App development access, WhatsApp messaging, read-only templates and read-only phone profiles are sufficient for this demo's assets; avoid full-account, billing, phone-management, advertising or unrelated permissions. Request `whatsapp_business_messaging` and, when approved, `whatsapp_business_management` for template reads. Choose `Never` if Meta makes it available. Token generation may require the owner to complete authentication or email confirmation.

Save the generated token only as `WHATSAPP_ACCESS_TOKEN` in the private backend environment. A token with no scheduled expiry can still be revoked or invalidated by Meta; do not promise that it can never fail. Read-only template/API access verifies it without sending a message. Do not automatically renew it by storing a person's Facebook password.

Set `WHATSAPP_DEMO_MODE=true` and list the personally approved test recipients in private `WHATSAPP_DEMO_RECIPIENTS` (comma-separated international numbers). An empty list fails closed. This guard refuses any other recipient before making a Graph request. Keep the original Meta test phone ID: changing it to a real sender is outside this demo's scope. Receiving an ordinary message from the official test number does not involve installing an unofficial WhatsApp client on the personal account; no account can be guaranteed immune to Meta enforcement.

## Durability, privacy and limits

- Webhooks require valid HMAC signatures and the configured test account/number. Bodies are limited to 256 KB and batches to 100 message/status events.
- D1 stores the original payload/signature and a SHA-256 deduplication key. Sync endpoints require a separate strong bearer token. Both secrets and message payloads are private; do not enable request/payload logging.
- At most 5,000 unconsumed payloads are accepted. A full inbox or database outage returns 503 so Meta can redeliver within its own retry policy. Free-tier exhaustion is a demo availability limitation.
- Unconsumed payloads are retained until synced. A daily scheduled job removes acknowledged cloud copies after seven days. Local CRM records use the existing durable storage and should be backed up separately.
- A malformed or unprocessable signed event is not silently acknowledged by the backend. Investigate repeated `whatsapp.relay_sync_failed` logs and authenticated backlog status. An invalid old event can delay a batch; inspect it privately and fix the handler rather than deleting real messages blindly.
- Cloud receiving continues while the laptop sleeps. CRM viewing and outbound replies still require the local backend to be running. Sleeping beyond Meta's 24-hour customer-service window can require a test template when replying.
- The sync token is a private ingestion credential. Keep it out of React, browser storage, Git and documentation. Rotating it requires updating both Worker secrets and backend configuration.

## Verification

Run `npm test` in both backend and relay directories. Relay tests use SQLite to exercise the real SQL, signature verification, persistence during downtime, deduplication, authorization, bounded input, acknowledgement/retention and storage-failure handling. Backend tests check original-signature verification, persistence-before-ACK, recovery after lost ACK and recipient allowlisting.

Run backend `npm run whatsapp:status` for a read-only credential and cloud backlog check. It prints safe results only and sends no WhatsApp messages.

For an end-to-end offline test: stop only the demo backend, send a normal personal WhatsApp message to Meta's test number, confirm the authenticated cloud inbox has a pending event, then restart the backend. Confirm that the message appears once in Commit and the cloud pending count returns to zero. Send one reply through the shared service and verify its real Meta ID and later status events. Synthetic signed HTTP requests are useful transport tests but are not evidence of an actual Meta message.

Official references: [Workers free limits](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Meta token types](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-071cfa60-0704-41d2-bca2-36ba6bd33dfe).
