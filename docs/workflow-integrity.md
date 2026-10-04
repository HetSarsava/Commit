# Demo workflow integrity

## Forms and catalogues

Product creation explicitly imports its shared form styles. The popup confines its scrollable body and keeps its action footer inside the panel. SKU whitespace, invalid prices and non-integer minimum quantities are checked by the backend. Product request bodies are no longer printed in logs.

Catalogue creation and analytics have their own scoped popup styles. The page offers search, draft editing, preview, PDF download, viewing-link copying, explicit marking as shared, expiry, conversion and admin deletion. “Mark as shared” changes a CRM status; it does not claim a WhatsApp message was sent. Missing customer/product data and save errors are visible. Draft editing preserves the existing catalogue identity and viewing link; shared catalogues require a new draft for content changes. Duplicate products, unknown products, malformed items and past expiry dates are rejected. An expiry date lasts through the end of that day.

Opening the public page records an open and advances SHARED to VIEWED. Product-interest and enquiry actions record analytics only for a valid link and a product in that catalogue. Public responses omit internal notes and customer information. The business email is displayed as a customer enquiry destination. Preview opens count as opens too; visitor counts are based on IP and are approximate, not authenticated unique people. Public analytics are not fraud-proof marketing measurements.

Demo products, catalogues/items/analytics, orders/items, invoices/items, campaigns and proformas/items now persist in an additive SQLite snapshot table. No existing data is deleted during installation. This is persistence for a single local demo process, not a replacement for a transactional multi-user production database. The old PostgreSQL catalogue/controller mapping gaps remain outside this repair.

## Quotation editing and document relationships

Quotation search filters by number/company. The customer step has its own search; the current customer stays pinned first while editing, including when it is outside the loaded lead list.

Reviewed relationships:

| Relationship | Constraint |
| --- | --- |
| Sales order → tax invoice | At most one invoice. Demo creates reject duplicate races; repeat generation returns the existing invoice. Prisma has a unique orderId and a guarded migration. |
| Quotation → sales order | Existing unique Prisma quotationId, now enforced in demo creates too. Proforma conversion reuses an existing order for the same quotation. |
| Quotation → proforma | Demo conversion reuses its existing proforma; duplicate creates are rejected. Legacy proforma models are not present in the production Prisma schema. |
| Lead → customer | Existing unique Prisma leadId, also enforced on demo creates. |
| Sales order → production header | Existing unique Prisma orderId. Stage/item records remain multiple. |
| WhatsApp phone → conversation; Meta ID → message | Existing durable unique constraints remain. |

Customers can have multiple orders/quotations, orders multiple items/partial dispatches, invoices multiple payments, and campaigns multiple leads/orders. These are deliberately not changed into one-to-one relationships.

An order page shows its existing invoice instead of Generate again. Snapshot comparison detects changes to document content and offers Update Invoice from Order. This updates the same invoice and replaces its line items; its identity/number/dates remain. Invoices with recorded payments require an accountant-reviewed correction and cannot be overwritten by this action. Order statuses alone do not invalidate invoice content. Changing a quotation does not automatically rewrite an already-created order.

The PostgreSQL migration fails if duplicate historical invoices exist, preserving all rows for review. It is not automatically applied to any existing database. Prisma schema validation passed; applying the new constraint to a real PostgreSQL database remains untested in this follow-up.

Invoice Share offers saving a PDF and copying a summary for WhatsApp/email. It does not publish private CRM links or silently send a message.

## Marketing calculation

Spent is manually recorded advertising cost, including existing seeded totals plus subsequent Record spend entries. There is no Google/Meta ad account connection. Positive amounts are required; generic campaign edits cannot overwrite the spend counter.

Attribution follows an explicit lead campaignId and its customer/quotation/order relationship; names are never guessed. Pending/cancelled orders and lead budgets are excluded. Confirmed orders and later stages (production, ready, dispatched, delivered/completed) contribute their subtotal minus discount, excluding GST. Each order maps to one campaign.

Sales ROI = (attributed order value − spend) / spend × 100. With zero spend it is unavailable. ₹100 spend and ₹450 order value gives 350%. This is sales return, not gross/net profit, recognized accounting revenue, or cash collected. CPL = spend / attributed lead count. Conversion rate = distinct attributed leads with qualifying orders / attributed leads. Campaign results show clickable leads/orders and a Record spend control.

## Audit and guidelines

The audit middleware records authenticated successful and failed mutations, PDF POST actions, successful login, and individual quotation/order/invoice views. It records actor, action, resource identifier, path and response status; campaign-spend entries also record amount/time. It never copies whole request/response bodies, credentials, notes, message text or guidelines into audit records. The audit log persists across demo restarts; date filtering happens before pagination. Auth failures before identifying a user, ordinary GET lists/polling and unauthenticated public catalogue interactions are not added as user activity. Meta webhook events remain in the existing WhatsApp event/status store. This is a demo audit trail, not a tamper-proof compliance journal.

Business guidelines are visible in a collapsible WhatsApp panel. Only ADMIN can save them, enforced in the API as well as the UI. Staff can read them. Admin-authored text persists privately; there are no invented company policies or automatic replies based on it.

## Verification

Automated tests cover product validation/duplicates, catalogue creation/draft editing/status/expiry/analytics/privacy, duplicate invoice races, unchanged invoice identity on sync, preservation of paid invoices, marketing formulas, guidelines roles and recovery of product/catalogue/invoice/audit/guidelines in a separate process. Existing WhatsApp tests remain in the suite. Browser checks verified successful product/catalogue creation, catalogue recovery after restart, quotation customer placement/search and campaign record links. No additional WhatsApp messages or paid services were used.

## Spacing review

Shared spacing variables use 8px for labels, 12px for controls, 16px for groups and 24px for sections. Quotation customer search has a 16px gap before the list; customer cards have 12px separation and inset focus space. The quotation list search has the same gap. Catalogue search aligns with page content, and grid fields no longer combine row gaps with extra bottom margins. Leads filters have room below stage tabs, label gaps and aligned controls. Invoice sharing, campaign results and WhatsApp guidelines have separated text, fields and actions; sharing controls are omitted from printed invoices.

Reviewed the main navigation pages and shared form styles visually and in source. Confirmed the quotation gap in the narrow preview and desktop layout, plus catalogue forms, Leads filters, campaign results, invoice sharing and guidelines with loaded data. Build passed; changed JSX lint passed with existing hook/declaration warnings. A demo backend restart restored requests after the existing development request limit was reached; rate limits and account security were not changed.

## Purchase and dispatch repairs

Purchase forms now use scoped, scrollable dialogs with visible validation and save states. Supplier name/phone and positive quantities/rates are validated on the server; unknown or repeated materials are rejected before creating a purchase header.

Dispatch uses the existing production records. In the demo every order line must reach Dispatch on the Production Board and the order must be confirmed, in production or ready. Cancelled/incomplete and already-dispatched orders are excluded. Creating a dispatch marks the same order dispatched; concurrent duplicate creation is rejected. This flow ships whole orders, not partial quantities. The production-header adapter remains available for Prisma but was not exercised against PostgreSQL in this repair.

Suppliers, purchase orders/items, dispatches and production tracking now join the private SQLite demo snapshot and recover after a restart. No destructive migration was needed.

When no guidelines have been saved, WhatsApp shows labelled examples covering customer requirements, quotations, delivery promises, payment checks, privacy, respectful follow-ups and CRM handover. Existing saved guidelines are preserved. Only admins can edit; examples do not trigger automatic replies or invent company-specific commitments.

Validation: live browser creation of a demo supplier and draft purchase order; isolated API tests for permissions, invalid items/dates, readiness, successful dispatch, concurrent duplicate protection and separate-process persistence. The demo draft was not sent to a supplier. Backend suite: 37 passed, one PostgreSQL test skipped. Frontend build and targeted lint passed with warnings for loading state in effects and existing bundle size.

## Plain interface labels

Removed decorative emoji from frontend labels, actions, empty states and product placeholders. Emoji-only controls use visible text, with adjusted widths; small selected-product placeholders use category initials. Application-authored quotation/order/payment/production message copy no longer adds decorative emoji. Historical customer messages, stored messages and approved Meta templates are preserved verbatim. Build and the existing backend suite passed (37 passed, one PostgreSQL check skipped). Live visual recheck was unavailable because the browser connection had closed.
