# Meta WhatsApp Cloud API integration

## Architecture

The existing React WhatsApp inbox and authenticated `/api/whatsapp` routes call a dedicated `WhatsAppService`. Only `MetaProvider` knows Graph API request formats or access tokens. Outbound messages are persisted before sending, then receive the real Meta `wamid` ID. No mock transport is retained.

```
CRM UI / quotation, order, payment and production actions
  -> WhatsApp controller -> WhatsAppService -> MetaProvider -> Meta Graph API
Meta webhook -> raw-body signature validation -> WhatsAppService -> durable store
  -> existing inbox API -> CRM UI (refreshes every five seconds)
```

`SQLiteStore` provides durable WhatsApp records while the existing application runs with `USE_MOCK_DB=true`. It uses Node's SQLite module, WAL, transactions, unique phone/message/event keys and a busy timeout. Other CRM modules retain their existing in-memory demo behaviour. Requires Node **22.13+**, preferably Node 24 LTS. The SQLite database contains personal message data: keep it private and backed up.

`PrismaStore` uses the existing PostgreSQL database with `USE_MOCK_DB=false`. The new models are `WhatsappConversation`, `WhatsappMessage`, and `WhatsappStatusEvent`. Conversations link to existing customers/leads; outbound messages link to the sending user and retain `relatedId` plus `messageType` for quotation/order/invoice/production references. Status events intentionally have no message foreign key: Meta can send a status before the outbound HTTP response is persisted. Accepted sends add a `WHATSAPP_SENT` activity to the existing timeline. Timeline write failure does not cause an already sent message to be resent.

Incoming numbers and existing CRM numbers are normalized with `libphonenumber-js`. Customers are matched before leads. Unknown senders remain durable unresolved conversations, without inventing or duplicating a customer/lead. The contact is matched again on later inbound events, allowing an subsequently created CRM entity to be associated. The currently selected inbox conversation displays text, media metadata, location metadata and interactive replies. Media files are not downloaded automatically.

## Environment

Create an ignored backend `.env` from `.env.example`. Never put these values in React, browser storage, Git, logs or PR descriptions.

| Variable | Purpose |
| --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta test phone-number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Test WABA ID |
| `WHATSAPP_ACCESS_TOKEN` | Server-side messaging/management token |
| `WHATSAPP_APP_SECRET` | Meta app secret for HMAC signature authentication |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Random callback verification secret, identical in Meta |
| `WHATSAPP_GRAPH_API_VERSION` | Configurable send/template API version; verified with `v25.0` |
| `WHATSAPP_DEFAULT_COUNTRY` | Country for local numbers; default `IN` |
| `WHATSAPP_TIMEOUT_MS` | Graph request timeout; default 10000, bounded to 1000–30000 |
| `WHATSAPP_DB_PATH` | Optional SQLite file; default `data/whatsapp.sqlite` relative to backend cwd |
| `WHATSAPP_GATEWAY_PORT` | Local webhook-only tunnel gateway; default 5001 |
| `PORT`, `CLIENT_URL` | Backend port and exact frontend origin |
| `USE_MOCK_DB`, `DATABASE_URL` | Existing CRM database mode and PostgreSQL connection |
| `JWT_SECRET` | Existing application login signing secret |

Generate the verify token privately with `crypto.randomBytes(32).toString('hex')`. The token can be stored in local configuration; never include its value in command history or shared screenshots. Meta's temporary test access token expires: renew it in Meta when necessary and update only the private environment.

Run `npm ci` in each application directory. Backend lockfile is now tracked. `npm start` starts the backend; frontend `npm run dev` starts Vite. Set frontend `VITE_API_URL` to the local backend API address. These development commands should be run from their corresponding backend/frontend directories so `.env` and the SQLite path resolve consistently.

## PostgreSQL migrations

The repository previously had a Prisma schema but no migration history. Three migrations are supplied:

1. `202610030000_existing_schema`: a baseline generated from the original schema, with no WhatsApp changes.
2. `202610030001_whatsapp_cloud_api`: additive WhatsApp tables, indexes and customer/lead/user relationships. It drops or rewrites no existing tables or data.
3. `202610030002_whatsapp_send_idempotency`: nullable request-key/hash columns and a unique request-key index. Existing messages remain valid without keys.

For a **new disposable development database**, set `DATABASE_URL`, run `npx prisma migrate deploy`, then `npx prisma generate`. Seed the existing CRM using its normal development process when needed.

For an **existing database matching the original schema**, first review its schema/backups and mark the baseline as already applied using `npx prisma migrate resolve --applied 202610030000_existing_schema`. Then run `npx prisma migrate deploy` and `npx prisma generate`. Do not execute the baseline against existing tables. Resolve drift before deployment. Do not run reset or destructive migration commands on real data. No existing user database was migrated during this demo; migration tests used a separate local PostgreSQL cluster.

SQLite creates its three tables additively on first use and upgrades existing message tables with a nullable request key and unique index in a transaction. It does not import old fabricated mock messages into the real inbox.

## Meta setup and free public HTTPS callback

For a stable demo callback that queues messages while the local backend is offline, use the optional free Worker/D1 relay described in [WHATSAPP_PERSISTENT_DEMO.md](WHATSAPP_PERSISTENT_DEMO.md). The Quick Tunnel instructions below remain a temporary fallback.

Use the existing Meta app and its **test number**, with your personal recipient registered in the test-number configuration. No real-number migration, purchase, paid domain, payment setup or business verification is necessary for this implementation's demo.

1. Start the backend and note its `PORT`.
2. Run `node scripts/whatsapp-gateway.js` from the backend directory. This gateway forwards only GET/POST `/api/whatsapp/webhook` to the backend. It returns 404 for the rest of the CRM, keeping demo login and business APIs off the public tunnel.
3. Install `cloudflared` from Cloudflare's official release and run `cloudflared tunnel --url http://127.0.0.1:5001 --no-autoupdate`, using the gateway's actual port.
4. Use the generated `https://<random>.trycloudflare.com/api/whatsapp/webhook` as Meta's callback URL and the private verify token as its verify token.
5. Subscribe the app to the `whatsapp_business_account` **`messages`** field. This field carries both incoming messages and delivery status events.
6. Subscribe the existing app to the **test WABA** via `POST /<WABA_ID>/subscribed_apps` with the private messaging/management token. Confirm with its GET endpoint.

Configuration can be performed through Meta's dashboard, or with its Application Subscriptions API using an app token held only on the server. Callback verification must return the exact `hub.challenge` for `hub.mode=subscribe` and a matching token. An invalid token returns 403. A missing verify configuration returns 503.

**Quick Tunnel URLs change after restart.** Keep the backend, gateway and tunnel running, and update/reverify the callback in Meta after starting a new tunnel. Restarting just the backend preserves the tunnel URL and SQLite records. There is no uptime guarantee. This Codex session runs on the user's Windows computer, so it must remain awake/online; this is not an independent cloud deployment.

The demo uses isolated ports 5200 (backend), 5201 (gateway), and 5175 (frontend), configured privately rather than hard-coded. Meta's dashboard displayed the messages subscription at webhook version v26.0; Graph sends were verified at v25.0. Future payload-version changes should be retested. Although the app dashboard displayed an unpublished-app restriction notice, real test-number inbound and status events arrived successfully during acceptance testing. No app publication was performed.

## Security and webhook processing

The public route is mounted before JSON parsing, CRM authentication, query-string access logging and the general CRM rate limiter. It authenticates POST requests with the original bytes and `X-Hub-Signature-256`, using the app secret and constant-time comparison. Unsigned/tampered requests return 401. It accepts at most 256 KB and 100 message/status events per request, validates payloads and filters to the configured WABA/phone ID. Signed malformed payloads return 400; a storage failure returns 503 so Meta can redeliver.

Incoming Meta message IDs and status-event fingerprints are unique. Transactions deduplicate redelivery without increasing unread counts twice. Acknowledgement occurs after the bounded persistence work, with no Graph calls, media downloads or automated business workflows in the webhook request. PostgreSQL serialization conflicts are retried up to twice. For higher traffic, move heavier CRM matching and workflows to a durable queue/outbox, with explicit acknowledgement and retry semantics.

Logs contain event types/counts and safe error codes, not messages, signatures, recipients or access tokens. GET verification queries are not access-logged. Keep any upstream proxy/tunnel logging equally private. The existing JWT authentication protects inbox/send/template APIs; the real access token never reaches the frontend. Review existing application authorization and demo authentication before production exposure.

## Sending, templates and delivery states

Authenticated endpoints include:

- `GET /api/whatsapp/conversations`
- `POST /api/whatsapp/conversations` with `{ "phoneNumber": "+<country><number>" }`
- `GET /api/whatsapp/conversations/:id/messages`
- `PUT /api/whatsapp/conversations/:id/read` (CRM unread state; does not send Meta read receipts)
- `POST /api/whatsapp/send` with `conversationId`, `to`, `message`
- `POST /api/whatsapp/send-template` with `conversationId`, `to`, `templateName`, `language`, optional text `components`
- `GET /api/whatsapp/templates` (real Meta templates and locally observed counters)
- Existing `/send-quotation`, `/send-order-confirmation`, `/send-payment-reminder`
- `/send-production-update` with `orderId`, `stage`

Text replies require an inbound customer message within the previous **24 hours**. Use an approved Meta template to start/reopen a conversation. Sending a template does not itself open the customer service window; the customer must reply. Legacy quotation/order/payment/production builders remain business text snippets and use the same real service inside the open reply window. They are not falsely represented as Meta-approved templates. For business-initiated reminders, configure approved business templates later and supply their real parameters through the existing template endpoint. The old hard-coded sample bank details were removed from real payment reminders.

`hello_world` in `en_US` is available for test outbound messages. The existing templates UI lists real names, languages and approval statuses and collects text placeholders and dynamic URL suffixes. Media-header/carousel templates are disabled in this demo. The server supports validated text body/header/button parameters. Meta remains the authority on template validity and approval. The previous automation list and execution counts were fictional; the API now returns no configured automations and rejects toggling unsupported workflows rather than pretending they execute.

Outbound state progression is `SENDING -> ACCEPTED -> SENT -> DELIVERED -> READ`. `ACCEPTED` means Meta returned a real message ID, not proof of delivery. A definite API rejection or failed-delivery event persists `FAILED` with a safe error/code. Network timeout or malformed successful response persists `UNKNOWN`, because the send might have been accepted. **POST sends are never retried automatically**, avoiding duplicate customer messages; reconcile uncertain sends before manually trying again. GET template requests can retry transient throttling/server failures with bounded backoff.

Older status events do not downgrade delivered/read states, and a delayed sent event cannot erase a failure. Status events that race ahead of the send response are saved and reconciled when its Meta ID is attached. There is no provider-supported exactly-once outbound guarantee; add a durable outbox and reconciliation before unattended bulk sends. Inbox and analytics return bounded recent records (500 messages per conversation, 1000 total messages/conversations), so displayed metrics are recent-record summaries, not full historical reporting.

## Request safety

All send endpoints accept an optional `Idempotency-Key` header (8–128 letters, digits, underscores or hyphens). The server stores the key and a hash of the normalized recipient, message/template, conversation, sender and domain references before calling Meta. Replaying an accepted request returns the original record without sending again. A key used for a different payload or user returns 409; a pending, uncertain or failed attempt also returns 409 without another send. Keys survive backend restarts in SQLite and PostgreSQL. Callers that omit the header retain their existing behaviour and must avoid duplicate requests themselves.

The inbox creates one key per pending text/template payload and retains it after an error, preventing repeated clicks or retries from creating another message. A shared send lock prevents overlapping text/template sends. Composer keys are held in memory: reloading the page or changing the payload can create a new key, so inspect uncertain deliveries before starting a new send. This is request deduplication, not a guarantee that Meta delivers exactly once.

If Meta accepts a message but subsequent persistence fails, recovery retains the known Meta ID with `UNKNOWN` so later status events can reconcile it. Message fetches only update the currently selected conversation and only apply the latest request, preventing slow responses from replacing another chat. Message ordering is deterministic even when timestamps match. History filters validate positive integer page/limit values (limit at most 100), normalized phone numbers and message types, rejecting malformed or repeated parameters with 400.

## Testing and troubleshooting

Run `npm test` in the backend. It covers token verification, signatures, customer/lead matching, unknown senders, malformed events, concurrent duplicates, SQLite restart persistence, successful sends, missing credentials, provider rejection, uncertain sends, statuses and early-status races. Meta HTTP is mocked in automated tests.

To run the additional PostgreSQL test, set `WHATSAPP_TEST_DATABASE_URL` to an explicitly disposable database with the migrations applied, then run `npm test`. It adds test records and never resets existing data. Frontend checks: `npm run build` and `npm run lint`.

For real acceptance:

1. Start a conversation for the registered personal recipient and send the approved `hello_world` test template from Templates.
2. Reply from personal WhatsApp to the Meta test number.
3. Confirm the real incoming text appears in the existing Commit inbox and remains after backend restart.
4. Send a text reply from the CRM and verify its real Meta ID and status progression.
5. A nonexistent template must return a useful error and remain `FAILED`, never a fabricated success.

Check code 190 for expired/invalid credentials, 131030 for an unregistered test recipient, 131047 for a closed text window, and 132001/132000 for template name/language/parameter mismatches. Check the tunnel URL, local gateway/backend ports, HMAC app secret, verify token, app `messages` subscription, WABA app subscription, and configured number/account IDs. Do not disable signatures to work around configuration errors. If messages are accepted but have no delivery events, inspect Meta subscriptions and test-recipient settings rather than claiming delivery.

## Production follow-up

Use stable hosting/HTTPS and a monitored durable database/queue, managed secrets, long-lived appropriately scoped server credentials, reviewed authorization/rate limits and audit logging, normalized indexed CRM phone fields, pagination/reporting, backups/retention/privacy policies, an outbound outbox and reconciliation, and approved business templates. Implement automation execution and media handling only when required. Review the repository's existing dependency security findings and unrelated mock-versus-Prisma discrepancies before enabling the whole CRM with PostgreSQL. Production account/number changes, app publication, paid messaging and business verification require a separate explicit decision.
