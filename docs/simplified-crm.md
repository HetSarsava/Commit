# Simplified CRM variant

Branch: `feature/simplified-crm`. This is an optional parallel demo variant of the full WhatsApp CRM branch. It does not replace the full version or delete its database records.

## Scope

The running simplified app excludes Products, Catalogues (including public catalogue links), Production, Inventory, Purchase, Reports and Activity Logs. Their frontend routes and server API mounts are removed. Historical models and source files remain for compatibility with existing documents; internal mutation auditing remains enabled. No destructive migration is needed.

Retained: customers/leads, quotations, proformas, orders, invoices/payments, dispatch, marketing, users/settings, notifications and WhatsApp conversations/company guidelines.

## Manual workflows

- **Orders:** choose an existing customer, type item descriptions, quantities and unit prices, enter discounts/GST, delivery date, customer PO reference, advance and notes, then choose the status yourself. No product list or production stages are needed. Quotations use the same manual item form.
- **Invoices:** the existing one-invoice-per-order flow remains. Item descriptions survive quotation-to-order and order-to-invoice conversion and unpaid invoice synchronization. Paid invoices require an accountant-reviewed correction before editing their source order. Invoice sharing retains the existing transport.
- **Dispatch:** choose a confirmed, in-progress or ready order and type courier, tracking number, address and dates. Record delivery status manually. A whole-order dispatch can be created once per order. Dispatch marks the order dispatched; delivery marks it completed. No carrier booking, tracking API or production record is created. Partial shipments are outside this variant's scope.
- **Marketing:** type campaign/channel, budget, cumulative actual spend, cumulative lead count, cumulative order value and notes. Values are entered by staff, not imported or automatically attributed. Sales return is `(entered order value - entered spend) / entered spend * 100`; it is not profit. A zero spend or missing order value shows no return calculation. Editing cumulative totals replaces them, rather than adding daily increments.

## Implementation and access

Authenticated `/api/manual` routes validate dates, finite non-negative numbers, item limits, roles and customer/order ownership. Monetary totals are calculated on the server; client-supplied totals cannot override them. Existing entities and document relationships are reused. Manual item descriptions are stored with a null product ID; read adapters supply a display name for older document components without creating hidden products.

Order/quotation writes: Admin and Sales, with Sales ownership restrictions. Dispatch writes: Admin, Sales and the existing Production role (now used for delivery staff). Marketing writes: Admin and Marketing. Existing retained endpoints keep their established permission behavior. This is a demo variant, not a new production authorization audit.

## Storage and running both variants

The manual pilot requires `USE_MOCK_DB=true`. Its existing demo workflow store persists orders, quotations, items, dispatches, invoices and campaigns in the local SQLite file identified by `WHATSAPP_DB_PATH`. Despite the historic mock-mode name, these entries persist across backend restarts. Initial example records are seeded. Customer management and other retained features retain the full branch's existing storage limitations. Back up the local SQLite file before replacing a demo environment.

The existing PostgreSQL schema requires product relationships and has not been migrated to accept manual items. Manual routes return 503 when `USE_MOCK_DB=false`, rather than pretending PostgreSQL support works. Production use needs a reviewed schema migration, transactional document/dispatch updates, deployment and access-policy review.

For a separate checkout:

1. Install backend and frontend packages using their existing lock files.
2. Configure a private backend `.env`: `PORT=5201`, `CLIENT_URL=http://localhost:5176`, `USE_MOCK_DB=true`, and a distinct `WHATSAPP_DB_PATH` for this checkout. Keep the normal JWT/company/WhatsApp test configuration server-side. Never commit environment files, tokens or SQLite files.
3. Set frontend `.env.local`: `VITE_API_URL=http://localhost:5201/api`.
4. Start the backend with `npm start` and the frontend with `npm run dev -- --port 5176 --strictPort`.
5. Visit `http://localhost:5176`. The full app can continue on 5175 with its backend on 5200.

The preview uses its own seeded database. The full app's live WhatsApp relay is deliberately not started in the second checkout: two backends must not consume the same cloud inbox. No Meta webhook, production phone number or paid service is changed. To make the simplified branch the active WhatsApp demo later, stop the old relay consumer and deliberately configure the selected checkout with the existing private relay secrets. Follow `docs/WHATSAPP_CLOUD_API.md` and the docs/WHATSAPP_PERSISTENT_DEMO.md. This change itself does not deploy or transfer WhatsApp inbox ownership.

The order list, dashboard counts and dispatch order picker currently load the latest 100 accessible orders. Larger datasets need pagination. Existing tax-document defaults require review for actual business use.

## Validation

`npm test` in the backend: 38 passed, 1 PostgreSQL integration test skipped (no PostgreSQL test database configured). The new manual-workflow test checks roles, ownership rules, server totals, discounts, malformed dates/items, freeform descriptions, quotation/proforma/order/invoice links, duplicate dispatch races, delivery updates, marketing values and persistence in a fresh process. A time-dependent overdue-date fixture in the existing WhatsApp business-flow test was made deterministic.

Frontend `npm run build`: passed. Targeted lint: no errors; React effect warnings and legacy-file warnings are documented in the pull request.

Browser preview verified login and simplified navigation, creating a typed order, creating its manual dispatch, creating/editing a freeform quotation with an item discount, generating its related invoice and entering campaign totals. The example campaign with spend INR100 and order value INR450 correctly displays 350% sales return. No messages, ad purchases, courier bookings or customer payments were performed during these checks.
