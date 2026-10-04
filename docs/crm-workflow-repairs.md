# CRM workflow repairs

## Navigation and layout

The top bar offers Back and Forward for pages visited within the current app session. These controls do not undo saved business data. Forward becomes unavailable when a new page replaces the forward branch, and is conservatively disabled after a full reload until new navigation occurs. Sidebar selection includes nested detail/edit routes.

Dispatch filters use the shared button styles. Marketing statistics have space below the tabs. Settings has a centred, responsive form and wrapping actions. Production keeps the existing stage board; selecting a stage count scrolls its column into view.

## Catalogue workflow

Select products in Products, then download a PDF or choose a customer and save a catalogue. The PDF uses the saved company profile and real product names, SKU, price, minimum quantity and descriptions. It currently contains text rather than product photographs. Saving carries selected products into the catalogue form. The customer selectors load CRM records rather than hard-coded names.

The public `/catalogue/:shareLink` page displays product information and company name, without customer details or internal notes. Expired catalogues return an expiry error. Links require the frontend and backend to be reachable; localhost links are not an externally hosted catalogue service. Cloudflare's WhatsApp relay does not host this CRM page.

Several write routes previously checked mixed-case role names even though authenticated roles are uppercase. Correcting the constants restores permitted catalogue, inventory, proforma and production actions without expanding permissions. Controllers now use the authenticated user's `id`, matching the authentication middleware.

## WhatsApp relationships

The chat details panel resolves quotations, orders and invoices for its linked customer/lead. Existing phone matches can be linked automatically; unknown contacts can be linked deliberately through the contact selector. Linking updates the durable chat relationship, without rewriting the contact phone or creating duplicates. Open Quotation opens the newest related quotation. If there is none, the panel explains why the button is unavailable. Lead links open the existing lead view. Choose Catalogue opens the catalogue workflow; it does not send a WhatsApp message automatically. Automatic replies remain unavailable until configured.

## Verification and limits

Automated coverage verifies multi-page PDF output, CRM relationship isolation, unknown-contact linking, and allowed/denied role checks. The backend suite passed 33 tests with one PostgreSQL integration test skipped because that isolated database was unavailable. Frontend build passed. Live API checks verified PDF output, catalogue creation/status changes, public-response privacy and role denial. Browser checks verified Back/Forward, nested sidebar selection, catalogue product prefill and save, unknown-chat guidance, and dispatch/settings layouts. Browser-triggered PDF requests returned HTTP 200, but the browser automation did not confirm the downloaded file.

The October 4 workflow-integrity follow-up adds durable demo product/catalogue/order/invoice/campaign snapshots; these repaired workflows now survive backend restarts. See workflow-integrity.md for current scope. WhatsApp and company-profile persistence are separate. The legacy catalogue controller/data model differs from the current PostgreSQL Prisma catalogue schema; this repair does not claim a completed PostgreSQL catalogue migration. Changed-page lint exits successfully with existing hook/declaration warnings in Production, Dispatch, Products, Leads and Catalogues; Layout, WhatsApp and SharedCatalogue are clean. The frontend bundle-size warning remains. No schema migration, production deployment, or additional WhatsApp test messages were required for these repairs. Other unrelated controls have not all been exhaustively tested.
