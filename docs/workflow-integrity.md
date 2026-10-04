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
