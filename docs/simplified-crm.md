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

The manual pilot requires `USE_MOCK_DB=true`. Its existing demo workflow store persists orders, quotations, items, dispatches, invoices, payment history and campaigns in the local SQLite file identified by `WHATSAPP_DB_PATH`. Despite the historic mock-mode name, these entries persist across backend restarts. Initial example records are seeded. Customers and leads now persist in the same local store. Other retained features keep their existing storage limitations. Back up the local SQLite file before replacing a demo environment.

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

`npm test` in the backend: 39 passed, 1 PostgreSQL integration test skipped (no PostgreSQL test database configured). The new manual-workflow test checks roles, ownership rules, server totals, discounts, malformed dates/items, freeform descriptions, quotation/proforma/order/invoice links, duplicate dispatch races, delivery updates, marketing values and persistence in a fresh process. A time-dependent overdue-date fixture in the existing WhatsApp business-flow test was made deterministic.

Frontend `npm run build`: passed. Targeted lint: no errors; React effect warnings and legacy-file warnings are documented in the pull request.

Browser preview verified login and simplified navigation, creating a typed order, creating its manual dispatch, creating/editing a freeform quotation with an item discount, generating its related invoice and entering campaign totals. The example campaign with spend INR100 and order value INR450 correctly displays 350% sales return. No messages, ad purchases, courier bookings or customer payments were performed during these checks.

## Customers and lead conversion

Admin and Sales can add a customer from WhatsApp > Customers or directly from a quotation/order form. Company name, contact name and a valid phone number are required. WhatsApp defaults to that phone if blank. Phone numbers are normalized; duplicate phone entries are refused. Sales can convert only accessible leads and cannot take over another salesperson's customer.

In Leads, select a lead and choose **Turn into customer**. Review the prefilled details and save. Conversion keeps the source lead, sets its completed/converted marker and links one customer. Repeat or concurrent conversions reuse the same customer. A matching existing customer can be linked if it has no other source lead; its details are preserved. Existing documents that refer to the source lead remain visible through that relationship; no historical invoice amounts are rewritten.

WhatsApp > Customers lists customers with document counts, search, a filter for recorded document sends, and a per-customer panel for quotations/orders/invoices and WhatsApp history. Document buttons open their existing screens. Saving a document is separate from submitting or delivering a message. The filter checks up to 1,000 recent CRM messages; history loads up to 500 messages per linked chat. Downloads, copied summaries, external WhatsApp sends and manual PDF sharing are not automatically tracked. Current preview relay isolation still applies.

Customer writes and lead conversion use the authenticated manual API and the existing local workflow snapshot. Customer/lead data survive backend restart. New tests cover validation, permissions, duplicate conversion, source-document preservation, honest send-history flags, sanitized message responses and restart recovery. Browser checks created Demo Uniform Buyer, saved its draft quotation and converted Demo Converted Buyer, without sending messages.


## Connected, simple business flow

The reduced variant uses the same customer and document records throughout. It adds short, manual hand-offs rather than new automation:

1. In WhatsApp, **Save as customer** opens a form with the current chat phone number already filled. Only company and contact names need typing. Optional details are collapsed. The current chat number is authoritative; repeated saves reuse the linked/matching customer. Sales ownership is checked before saving or reusing records. Linked leads are preserved and marked converted.
2. **Create quotation** from chat or customer history opens the existing manual quotation form with the customer already selected. No products module is required. Notes and terms are optional expandable sections. Saving opens the quotation.
3. **Create order** copies the quotation items and amounts into the linked order. Returning to the quotation shows **Open order**. Repeated conversion requests return the existing order; no second order is created. Rejected/expired quotations cannot become orders.
4. **Confirm order** enables the existing invoice workflow. Orders show **View invoice** after generation. Existing invoice synchronization remains available for unpaid changes; paid-source edits remain protected.
5. Every quotation/order/invoice shows links to its actual saved customer and related records. Invoices and their source orders show total, received and still due. A missing record is labelled Not created rather than displayed as completed.
6. **Record payment** uses a short form: amount, payment method and date. Reference/notes are optional. Half/full balance buttons are conveniences. This records money already received; it does not charge anyone or initiate a transfer. The server validates amounts, methods, dates, invoice ownership and reused request references. Repeated requests from the same open form do not record another payment. Payment and invoice balance are saved as one serialized SQLite snapshot, with rollback on failure. Payment history survives restart.
7. **Dispatch / delivery** keeps the current order selected. The focused delivery view shows that order's shipment and offers Back to order and All deliveries. Updating delivery remains manual; it does not book a courier.
8. Customer history provides Create quotation, Create order, Open WhatsApp chat and Record payment shortcuts. The money summary totals the customer's saved invoices; order/quotation values are not counted again as money owed. No documents are sent automatically.

Document screens prioritize the overview and next actions; **View quotation / View invoice** expands the full document. Print styles still include the full document even when its on-screen preview is hidden. WhatsApp send feedback says submitted until actual delivery status is available in chat. Invoice sharing still means saving a PDF or copying a summary; the app's private page URL is not a public customer link.

The design uses focused dialogs and optional details, inspired by [Cashew's customizable entry flow](https://cashewapp.web.app/faq.html) and [Material dialog guidance](https://material-web.dev/components/dialog/). No new UI framework or external automation service was introduced.

### Validation for these hand-offs

`connected-workflow.test.js` exercises chat-to-customer-to-quotation-to-order-to-invoice-to-payment with isolated demo storage. It covers repeat/concurrent saves, role/ownership denial, authoritative chat phone, repeated order conversion, malformed/over-balance payments, payment retry idempotency, concurrent payments, rollback after a simulated invoice write failure, linked history and restart persistence. It does not send Meta messages.

Browser checks used a newly created **Demo Connected Uniforms** customer and example quotation/order/invoice/part payment/dispatch. No real funds moved, no WhatsApp send was made and no shipment was booked. These example records are local, ignored demo data. Production gaps described above still apply; the retained tax document uses the existing intra-state demo calculation and is not a complete statutory billing system.

## Simple lead stages

The lead screen shows **All, New, In discussion, Quotation and Closed**, without a separate analytics view. Search is always visible; source/priority filters are under More filters. Counts include historical stages. Contacted, requirement, catalogue, negotiation and sample records appear under In discussion; order, production, dispatch, completed and lost records appear under Closed. Closed cards distinguish Won from Not proceeding.

Editing offers New, In discussion, Quotation, Won and Not proceeding. Editing other details preserves a record's historical status; choosing another stage changes it intentionally. New leads start as New. This is a presentation change, not a data migration or automatic customer conversion. Existing customer conversion and document links remain available.

## Live document calculation

Quotation and order editors show a live arithmetic preview beside the fields on wide screens. Smaller screens show the same preview below the editor, reachable with View calculation in the footer. Each item also shows its quantity × unit price, line discount and line total directly beside its fields. Line discounts apply once to the whole line; the overall discount applies to the sum of discounted lines. GST applies after both discounts.

Example: 10 × INR 600 = INR 6,000; line discount INR 600 leaves INR 5,400; 18% GST is INR 972; total INR 6,372. One item priced INR 600 with a line discount of INR 600 has a zero total. The preview rounds each line, the summed subtotal, GST and the final total to two decimals, matching the server. Invalid quantities/discounts/GST show a correction message and prevent saving rather than displaying a valid final total. `document-calculation.test.js` compares preview amounts with saved quotation/order amounts using isolated demo storage.
