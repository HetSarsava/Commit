# 📘 User Guide - Amit Uniform CRM System

**Knowledge Transfer Document**  
**Version:** 1.0  
**Last Updated:** 2026-09-27

---

## 📑 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Lead Management](#lead-management)
4. [Products & Catalogue](#products--catalogue)
5. [Quotations](#quotations)
6. [Orders & Invoicing](#orders--invoicing)
7. [Production & Dispatch](#production--dispatch)
8. [Inventory & Purchase](#inventory--purchase)
9. [WhatsApp Business](#whatsapp-business)
10. [Marketing](#marketing)
11. [Reports](#reports)
12. [Settings](#settings)
13. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Getting Started

### Logging In

1. Open browser and go to: `http://localhost:5173`
2. Enter your credentials:
   - **Email:** your-email@amituniform.com
   - **Password:** your-password
3. Click **"Sign In"**

**First Time Login?**  
Contact your administrator for credentials.

---

### Understanding the Interface

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar: Amit Uniform Logo | User Menu | Notifications│
├──────┬──────────────────────────────────────────────────┤
│      │                                                  │
│  S   │                                                  │
│  I   │          MAIN CONTENT AREA                       │
│  D   │          (Changes based on selected page)        │
│  E   │                                                  │
│  B   │                                                  │
│  A   │                                                  │
│  R   │                                                  │
│      │                                                  │
│  ☰   │                                                  │
│  📊  │                                                  │
│  👥  │                                                  │
│  📦  │                                                  │
└──────┴──────────────────────────────────────────────────┘
```

**Sidebar Navigation:**
- **◈ Dashboard** - Overview and metrics
- **☰ Leads** - Customer inquiries
- **▤ Products** - Product catalog
- **◪ Catalogues** - Customer catalogues
- **◫ Quotations** - Price quotes
- **◬ Proforma** - Proforma invoices
- **⊞ Orders** - Sales orders
- **▣ Invoices** - GST invoices
- **◧ Production** - Manufacturing tracking
- **◭ Dispatch** - Delivery management
- **▦ Inventory** - Stock management
- **▨ Purchase** - Purchase orders
- **◮ Marketing** - Campaign management
- **◩ Reports** - Business reports
- **◐ WhatsApp** - Business messaging
- **⚙ Settings** - System configuration (Admin only)

---

## 📊 Dashboard

**Purpose:** Get an at-a-glance view of your business performance.

### What You'll See:

**Top Row - Today's Metrics:**
- **Leads:** New inquiries today
- **Follow-ups:** Pending follow-ups
- **Quotations:** Quotes sent today
- **Orders:** Orders received today
- **Sales:** Revenue today (₹)
- **Outstanding:** Pending payments (₹)

**Second Row - Production & Operations:**
- **In Production:** Active production orders
- **Dispatch Today:** Ready to ship
- **Stock Alerts:** Low inventory items

**Charts & Graphs:**
- **Revenue Trend** - Last 30 days sales chart
- **Pipeline Funnel** - Lead conversion rates
- **Salesperson Performance** - Team rankings
- **Lead Source Performance** - Best channels

**Bottom Section:**
- **Recent Leads** - Latest inquiries
- **Top Products** - Best sellers
- **Outstanding Payments** - Due invoices
- **Overdue Follow-ups** - Action needed

### How to Use:

1. **Monitor Daily:** Check dashboard every morning
2. **Click Cards:** Click any metric card to see details
3. **Action Items:** Red badges indicate urgent actions
4. **Refresh:** Dashboard auto-updates every 5 minutes

---

## 👥 Lead Management

**Purpose:** Track customer inquiries from first contact to order.

### Creating a New Lead

1. Click **"Leads"** in sidebar
2. Click **"+ New Lead"** button (top right)
3. Fill in the form:

**Required Fields:**
- **Company Name:** Customer's business name
- **Contact Person:** Primary contact
- **Mobile:** Phone number
- **Email:** Email address

**Optional Fields:**
- **WhatsApp:** WhatsApp number
- **City / State:** Location
- **Industry:** Hotel, Hospital, School, etc.
- **Requirement:** What they need
- **Product Interest:** Specific products
- **Quantity:** Number of pieces
- **Budget:** Estimated budget
- **Source:** Where lead came from
- **Priority:** Hot, Warm, Cold

4. Click **"Create Lead"**

---

### Lead Pipeline Stages

**11 Stages:**

1. **NEW** - Just received inquiry
2. **CONTACTED** - First contact made
3. **REQUIREMENT** - Understanding needs
4. **CATALOGUE** - Sent product catalogue
5. **QUOTATION** - Price quote sent
6. **NEGOTIATION** - Discussing terms
7. **SAMPLE** - Sample sent/requested
8. **ORDER** - Order confirmed
9. **PRODUCTION** - In manufacturing
10. **DISPATCH** - Shipped
11. **COMPLETED** - Delivered & paid

### Moving Leads Through Pipeline

**Method 1: Drag & Drop**
- Click and hold lead card
- Drag to desired stage column
- Release to drop

**Method 2: Lead Detail View**
- Click on lead to open
- Click **"Change Stage"** dropdown
- Select new stage
- Click **"Save"**

---

### Lead Actions

**View Lead:**
- Click on lead card
- See full details, notes, activity history

**Edit Lead:**
- Open lead detail
- Click **"Edit"** button
- Update information
- Click **"Save Changes"**

**Add Note:**
- Open lead detail
- Scroll to **"Notes"** section
- Type your note
- Click **"Add Note"**

**Schedule Follow-up:**
- Open lead detail
- Click **"Schedule Follow-up"**
- Select date and time
- Add reminder note
- Click **"Save"**

**Convert to Quotation:**
- Open lead detail
- Click **"Create Quotation"** button
- System auto-fills customer details
- Add products and pricing
- Generate quote

---

### Filtering & Search

**Filter by:**
- **Status:** NEW, CONTACTED, etc.
- **Priority:** Hot, Warm, Cold
- **Salesperson:** Assigned team member
- **Source:** Website, WhatsApp, etc.
- **Date Range:** Created between dates

**Search:**
- Type in search box (top of leads page)
- Searches: company name, contact person, mobile, email

**Sort by:**
- Created date (newest/oldest)
- Company name (A-Z)
- Budget (high to low)
- Follow-up date (due soon)

---

## 📦 Products & Catalogue

### Managing Products

**Add New Product:**

1. Go to **"Products"** page
2. Click **"+ Add Product"**
3. Fill in details:
   - Product name
   - SKU code
   - Category (Shirts, Trousers, Uniforms, etc.)
   - Description
   - Fabric type
   - Available colors
   - Available sizes
   - MOQ (Minimum Order Quantity)
   - Unit price
   - HSN code (for GST)
4. Upload product image
5. Set stock quantity
6. Click **"Save Product"**

**Edit Product:**
- Click on product card
- Click **"Edit"** button
- Update details
- Click **"Save Changes"**

**Bulk Upload:**
- Click **"Import Products"**
- Download CSV template
- Fill in product data
- Upload CSV file

---

### Creating Customer Catalogues

**Purpose:** Create personalized catalogues for specific customers.

**Steps:**

1. Go to **"Catalogues"** page
2. Click **"+ Create Catalogue"**
3. Enter details:
   - **Customer Name:** Who it's for
   - **Title:** Catalogue title
   - **Valid Until:** Expiry date
4. Add products:
   - Search products by name/category
   - Click **"Add"** for each product
   - Set customer-specific price (if different)
5. Click **"Generate Catalogue"**

**Share Catalogue:**
- Copy shareable link
- Send via WhatsApp or email
- Track who viewed it (analytics)

**Catalogue Analytics:**
- Views count
- Products clicked
- Enquiry clicks
- Conversion tracking

---

## 💰 Quotations

**Purpose:** Send price quotes to customers.

### Creating a Quotation

1. Go to **"Quotations"** page
2. Click **"+ New Quotation"**
3. Select customer (or add new)
4. Add products:
   - Search product
   - Click **"Add to Quote"**
   - Enter quantity
   - Price auto-fills (editable)
   - Add discount (% or ₹)
5. Set terms:
   - Payment terms
   - Delivery time
   - Validity period
   - Special notes
6. GST automatically calculated
7. Click **"Generate Quotation"**

**Quotation Number:** Auto-generated (QUO-2024-001)

---

### Quotation Actions

**Send to Customer:**
- Click **"Send"** button
- Choose: Email, WhatsApp, or Download PDF
- System sends automatically

**Follow-up:**
- Set reminder for follow-up
- System will notify you
- Track: sent, viewed, replied

**Convert to Proforma Invoice:**
- Open quotation
- Click **"Convert to Proforma"**
- Review details
- Generate PI

**Convert to Sales Order:**
- Open accepted quotation
- Click **"Create Order"**
- Order auto-created from quote

**Edit Quotation:**
- Only if status is DRAFT
- Once sent, create new version instead

**Duplicate:**
- Click **"Duplicate"** to copy
- Modify as needed
- Save as new quotation

---

### Quotation Status

- **DRAFT** - Being prepared
- **SENT** - Shared with customer
- **VIEWED** - Customer opened it
- **ACCEPTED** - Customer agreed
- **REJECTED** - Customer declined
- **EXPIRED** - Past validity date

---

## 📋 Orders & Invoicing

### Sales Order Workflow

**Create from Quotation:**
1. Open accepted quotation
2. Click **"Create Order"**
3. Confirm details:
   - Delivery date
   - Advance payment amount
   - Special instructions
4. Click **"Confirm Order"**

**Create Manually:**
1. Go to **"Orders"** page
2. Click **"+ New Order"**
3. Select customer
4. Add products
5. Set payment terms
6. Click **"Create Order"**

**Order Number:** Auto-generated (ORD-2024-001)

---

### Order Stages

1. **PENDING** - Order created, awaiting confirmation
2. **CONFIRMED** - Customer confirmed, advance paid
3. **IN_PRODUCTION** - Manufacturing started
4. **READY** - Production complete
5. **DISPATCHED** - Shipped to customer
6. **DELIVERED** - Customer received
7. **COMPLETED** - Paid & closed

---

### Generating GST Invoice

**From Order:**
1. Open order (status: CONFIRMED or later)
2. Click **"Generate Invoice"**
3. System auto-fills:
   - Customer GSTIN
   - Product HSN codes
   - Tax rates (CGST, SGST, or IGST)
   - Bank details
4. Review:
   - Items and quantities
   - Pricing and discounts
   - Tax calculation
   - Terms & conditions
5. Click **"Generate Invoice"**

**Invoice Number:** Auto-generated (INV-2024-001)

**Invoice includes:**
- Company details & GSTIN
- Customer details & GSTIN
- Invoice date and number
- Product details with HSN
- CGST, SGST, or IGST breakdown
- Total with tax
- Bank details for payment
- Terms and conditions

---

### Recording Payments

1. Open invoice
2. Click **"Record Payment"**
3. Enter:
   - Payment date
   - Amount received
   - Payment method (Bank transfer, Cash, Cheque, UPI)
   - Reference number
   - Notes
4. Click **"Save Payment"**

**Partial Payment:**
- Can record multiple payments
- System tracks balance due
- Shows payment history

**Payment Status:**
- **UNPAID** - No payment received
- **PARTIALLY_PAID** - Some amount paid
- **PAID** - Fully paid

---

## 🏭 Production & Dispatch

### Production Tracking

**7-Stage Production Workflow:**

1. **ORDER_CONFIRMED** - Order received
2. **MATERIAL_ISSUED** - Raw materials allocated
3. **CUTTING** - Fabric cutting stage
4. **STITCHING** - Sewing/stitching
5. **FINISHING** - Final touches
6. **QC_PASSED** - Quality check passed
7. **PACKING** - Ready for dispatch

**Track Production:**
1. Go to **"Production"** page
2. See all active production orders
3. Click order to view details
4. Update stage:
   - Click **"Move to Next Stage"**
   - Assign worker (optional)
   - Add notes
   - Set expected completion
   - Click **"Update"**

**Worker Assignment:**
- Assign specific workers to stages
- Track who worked on what
- Monitor productivity

---

### Dispatch Management

**Create Dispatch:**
1. Go to **"Dispatch"** page
2. Click **"+ New Dispatch"**
3. Select order (QC_PASSED status)
4. Enter dispatch details:
   - Courier company
   - Tracking number
   - Dispatch date
   - Expected delivery date
5. Click **"Create Dispatch"**

**Dispatch Actions:**
- **Track:** Click tracking number to open courier site
- **Update Status:** Mark as delivered
- **POD Upload:** Upload proof of delivery
- **Notify Customer:** Send dispatch notification

**Dispatch Status:**
- **PACKED** - Ready to ship
- **DISPATCHED** - Shipped
- **IN_TRANSIT** - In delivery
- **DELIVERED** - Customer received
- **POD_RECEIVED** - Proof uploaded

---

## 📊 Inventory & Purchase

### Stock Management

**Check Stock:**
1. Go to **"Inventory"** page
2. View all materials/products
3. See:
   - Current stock
   - Reserved stock
   - Available stock
   - Minimum stock level
   - Status (OK, Low, Out)

**Stock In (Add Stock):**
1. Click **"Stock In"**
2. Select material
3. Enter:
   - Quantity received
   - Purchase order reference
   - Received date
   - Notes
4. Click **"Add Stock"**

**Stock Out (Issue Material):**
1. Click **"Stock Out"**
2. Select material
3. Enter:
   - Quantity issued
   - Production order reference
   - Issued to (worker/dept)
   - Notes
4. Click **"Issue Stock"**

**Low Stock Alerts:**
- System highlights low stock items
- Set minimum stock levels
- Get notifications when stock is low

---

### Purchase Orders

**Create Purchase Order:**
1. Go to **"Purchase"** page
2. Click **"+ New PO"**
3. Select supplier (or add new)
4. Add materials:
   - Select material
   - Enter quantity
   - Set rate
5. Set terms:
   - Delivery date
   - Payment terms
   - Notes
6. Click **"Create PO"**

**PO Number:** Auto-generated (PO-2024-001)

**PO Workflow:**
1. **DRAFT** - Being prepared
2. **SENT** - Sent to supplier
3. **CONFIRMED** - Supplier confirmed
4. **RECEIVED** - Material received
5. **BILLED** - Supplier bill received
6. **PAID** - Payment made
7. **COMPLETED** - Closed

**Receive Material:**
1. Open PO (status: CONFIRMED)
2. Click **"Receive Material"**
3. Enter quantity received
4. System updates inventory
5. Click **"Save"**

---

## 💬 WhatsApp Business

**Purpose:** Manage customer conversations with automation.

### Inbox / Conversations

**View Conversations:**
1. Go to **"WhatsApp"** page
2. Click **"Inbox"** tab
3. See list of conversations (left panel)

**Filter Conversations:**
- **[All]** - Show all chats
- **[Needs human]** - Automation paused, need your response
- **[Bot handling]** - Bot managing conversation

**Search:**
- Type customer name or phone number
- Live filtering

---

### Chatting with Customers

**Select Conversation:**
1. Click conversation from list
2. Chat opens in center panel
3. Info panel shows on right:
   - Lead details
   - Requirements
   - Quick actions

**Check Automation Status:**
- **Header shows:**
  - Green dot = Automation active (bot handling)
  - Red dot = Automation paused (needs human)

**Know Who Sent What:**
- **"⚙ Automated"** tag = Bot sent this message
- **"YOU (Manual)"** tag = Human sent this message

**Send Message:**
1. Type in message box (bottom)
2. Click send button (➤) or press Enter
3. Message delivered to customer's WhatsApp

**Use Template:**
1. Click template button (📋)
2. Select template
3. Edit if needed
4. Send

**Attach File:**
1. Click attach button (📎)
2. Select file
3. Upload and send

---

### Message Templates

**View Templates:**
1. Click **"Templates"** tab
2. See all available templates

**Template Categories:**
- **Greeting** - Welcome messages
- **Quotation** - Quote sharing
- **Order** - Order confirmations
- **Payment** - Payment reminders
- **Marketing** - Promotional messages

**Use Template:**
1. Select template
2. Click **"Send"** button
3. Choose conversation
4. Customize variables (if any)
5. Send

**Template Stats:**
- Sent count
- Delivered count
- Read count
- Status (APPROVED, PENDING, REJECTED)

---

### Automation Rules

**View Automations:**
1. Click **"Automation"** tab
2. See all automation rules

**Available Automations:**
- **Welcome Message** - Auto-reply to first message
- **Catalogue Auto-send** - When customer asks for products
- **Quotation Follow-up** - 24 hours after quote
- **Payment Reminder** - Before due date
- **Order Confirmation** - When order confirmed
- **Dispatch Notification** - When shipped

**Enable/Disable:**
- Toggle switch on each automation
- Green = Active
- Grey = Disabled

**How Automations Work:**
1. **Trigger** - Event happens (e.g., customer sends first message)
2. **Condition** - Check if condition met (e.g., new contact)
3. **Action** - Execute action (e.g., send welcome template)
4. **Pause** - Auto-pause if customer asks complex question

---

### Info Panel Features

**When you select a conversation, right panel shows:**

**Lead Details:**
- Company name
- Lead stage
- Source
- Assigned salesperson

**Requirements:**
- Product interest
- Quantity needed
- Budget estimate

**Quick Actions:**
- **Open Quotation** - View/create quote
- **View Full Lead** - Go to lead page
- **Send Catalogue** - Share product catalogue
- **Resume Automation** - Re-enable bot

**Hide/Show Panel:**
- Click ✕ to hide
- Click ◀ Info to show

---

### Analytics

**View WhatsApp Metrics:**
1. Click **"Analytics"** tab
2. See performance data:
   - Total conversations
   - Messages sent/received
   - Delivery rate
   - Read rate
   - Leads generated
   - Average response time
   - Automated messages count

**Use Analytics For:**
- Track engagement
- Monitor bot performance
- Measure lead generation
- Optimize response times

---

## 📈 Marketing

**Purpose:** Manage marketing campaigns and track ROI.

### Creating a Campaign

1. Go to **"Marketing"** page
2. Click **"+ New Campaign"**
3. Fill in details:
   - **Campaign Name:** e.g., "Hotel Uniform Jan 2024"
   - **Campaign Code:** e.g., "HOTEL-JAN-24"
   - **Platform:** Google Ads, Facebook, Instagram, etc.
   - **Start Date & End Date**
   - **Budget:** Total budget for campaign
   - **Target Audience:** Who you're targeting
   - **Objective:** Goal (Leads, Sales, Brand Awareness)
4. Click **"Create Campaign"**

---

### Tracking Campaign Performance

**Metrics Tracked:**
- **Leads Generated:** Count of leads from campaign
- **Converted:** Leads that became orders
- **Revenue:** Total sales from campaign
- **Spent:** Money spent so far
- **CPL:** Cost Per Lead (Spent ÷ Leads)
- **Customer Cost:** Cost Per Customer (Spent ÷ Converted)
- **ROI:** Return on Investment ((Revenue - Spent) ÷ Spent × 100)

**View Performance:**
1. Open campaign
2. See real-time metrics
3. View lead list from campaign
4. Check conversion funnel

**Lead Attribution:**
- When creating lead, select campaign source
- System automatically attributes lead to campaign
- Tracks conversion throughout pipeline

---

### Campaign Actions

**Update Spent:**
- Click **"Update Spent"**
- Enter amount spent
- System recalculates metrics

**Pause/Resume:**
- Pause campaign temporarily
- Resume when ready

**Duplicate:**
- Copy successful campaign
- Modify for new period

**Archive:**
- Move completed campaigns to archive
- Clean up active campaign list

---

## 📊 Reports

**Purpose:** Generate business intelligence reports.

### Available Reports

**13 Report Types:**

1. **Sales Report** - Orders, revenue, products sold
2. **Leads Report** - Lead pipeline, sources, conversion
3. **Inventory Report** - Stock levels, movements
4. **Production Report** - Production status, timelines
5. **Marketing Report** - Campaign performance, ROI
6. **Customer Report** - Customer list, purchase history
7. **Product Report** - Product performance, bestsellers
8. **Quotation Report** - Quotes sent, accepted, rejected
9. **Invoice Report** - Invoices generated, paid, pending
10. **Payment Report** - Payments received, outstanding
11. **Purchase Report** - Purchase orders, suppliers
12. **Dispatch Report** - Shipments, delivery status
13. **Profitability Report** - Profit margins, costs

---

### Generating a Report

1. Go to **"Reports"** page
2. Select report type (tab)
3. Set filters:
   - **Date Range:** From - To
   - **Status:** Specific status
   - **Salesperson:** Team member
   - **Customer:** Specific customer
   - etc. (filters vary by report type)
4. Click **"Apply Filters"**
5. View report data

---

### Exporting Reports

**Three Export Formats:**

**📊 Excel (.xlsx):**
- Click **"Excel"** button (green)
- Best for: Analysis, pivot tables, charts

**📄 CSV (.csv):**
- Click **"CSV"** button (grey)
- Best for: Data import, analysis tools

**📕 PDF (.pdf):**
- Click **"PDF"** button (red)
- Best for: Printing, presentations

**File Naming:**
- Format: `ReportType_Report_YYYY-MM-DD.ext`
- Example: `Sales_Report_2026-09-27.xlsx`

**Downloaded to:** Your browser's download folder

---

### Report Insights

**Sales Report Shows:**
- Total revenue
- Number of orders
- Average order value
- Top customers
- Sales by product
- Sales by salesperson
- Daily/weekly/monthly trends

**Leads Report Shows:**
- Total leads
- Leads by source
- Leads by status
- Conversion rates
- Lead response time
- Hot/warm/cold distribution

**Use Reports For:**
- Performance reviews
- Business planning
- Identify trends
- Track goals
- Make data-driven decisions

---

## ⚙️ Settings

**Access:** Only ADMIN role can access Settings.

### Company Profile

**Update Company Information:**
1. Go to **"Settings"**
2. Click **"Company Profile"** tab
3. Edit:
   - Company name
   - Address
   - GSTIN
   - Phone
   - Email
   - Website
4. Click **"Save Changes"**

**Upload Logo:**
- Click logo area
- Select image file
- Crop if needed
- Save

---

### Bank Details

**Configure Bank Information:**
1. Click **"Bank Details"** tab
2. Enter:
   - Bank name
   - Account number
   - IFSC code
   - Branch name
   - UPI ID
3. Click **"Save"**

**Used in:** Invoices, quotations

---

### Tax Settings

**GST Configuration:**
1. Click **"Tax Settings"** tab
2. Set:
   - Default GST rate (%)
   - Default HSN code
   - Enable IGST (for interstate)
3. Save

---

### Invoice Settings

**Configure Invoice Defaults:**
1. Click **"Invoice Settings"** tab
2. Set:
   - Invoice prefix (e.g., "INV")
   - Starting number
   - Default payment terms
   - Invoice notes
   - Terms & conditions
3. Save

---

### Order Settings

**Configure Order Defaults:**
1. Click **"Order Settings"** tab
2. Set:
   - Order prefix (e.g., "ORD")
   - Default lead time (days)
   - Approval threshold (₹)
   - Default advance payment (%)
3. Save

---

### System Preferences

**General Settings:**
1. Click **"System Preferences"** tab
2. Set:
   - Date format (DD/MM/YYYY, MM/DD/YYYY)
   - Timezone
   - Currency symbol
   - Language
3. Save

---

### Backup & Restore

**Export Settings:**
- Click **"Export Backup"**
- Download JSON file
- Store safely

**Import Settings:**
- Click **"Import Backup"**
- Select JSON file
- Confirm import

**Reset to Defaults:**
- Click **"Reset to Defaults"**
- Confirm action (warning!)
- All settings reset

---

## 💡 Tips & Best Practices

### Daily Workflow

**Morning Routine (10 minutes):**
1. ✅ Check dashboard for today's metrics
2. ✅ Review overdue follow-ups (red badges)
3. ✅ Check WhatsApp "Needs human" tab
4. ✅ Review production status
5. ✅ Check low stock alerts

**Throughout the Day:**
- Update lead stages as you make progress
- Add notes to leads after every call/meeting
- Record payments as received
- Update production stages

**Evening Routine (5 minutes):**
- Schedule tomorrow's follow-ups
- Review today's sales
- Check pending quotations

---

### Lead Management Best Practices

**Do's:**
- ✅ Add detailed notes after every interaction
- ✅ Set follow-up reminders (never forget)
- ✅ Update lead stage immediately
- ✅ Respond to hot leads within 1 hour
- ✅ Call warm leads within 24 hours
- ✅ Use proper lead sources for tracking

**Don'ts:**
- ❌ Don't leave leads in NEW for more than 1 day
- ❌ Don't skip follow-ups
- ❌ Don't forget to update budget/quantity
- ❌ Don't create duplicate leads (search first)

---

### Quotation Best Practices

**Before Creating:**
- Confirm customer requirements
- Check product availability
- Verify current pricing
- Review competitor quotes (if any)

**While Creating:**
- Use clear product descriptions
- Include all specifications
- Set realistic delivery times
- Add payment terms clearly
- Set 30-day validity (standard)

**After Sending:**
- Schedule follow-up for 24 hours later
- Track if customer viewed it
- Be ready to negotiate
- Update lead stage to QUOTATION

---

### WhatsApp Best Practices

**Response Times:**
- New messages: Within 2 hours
- Hot leads: Within 30 minutes
- Automation handles after-hours

**Message Quality:**
- Be professional but friendly
- Use proper grammar
- Avoid all caps (LOOKS ANGRY)
- Use emojis sparingly (1-2 per message)
- Include all relevant details

**When to Use Automation:**
- First contact (welcome message)
- Catalogue requests
- Payment reminders
- Order confirmations
- Standard FAQs

**When to Take Over from Bot:**
- Complex questions
- Negotiation
- Custom requirements
- Complaints
- Important customers

---

### Production Tracking Tips

**Update Stages Promptly:**
- Update as soon as stage completes
- Don't batch updates at end of day
- Real-time visibility helps planning

**Quality Control:**
- Never skip QC stage
- Document issues found
- Track defect rates
- Improve processes

**Worker Assignment:**
- Assign specific workers
- Track productivity
- Identify training needs

---

### Inventory Management Tips

**Stock Levels:**
- Set minimum stock = 2 weeks consumption
- Reorder when: Current ≤ Minimum + Lead Time
- Never let critical materials go to zero

**Stock Accuracy:**
- Do monthly physical count
- Investigate discrepancies
- Update system immediately
- Track wastage/scrap

---

### Reporting Tips

**Weekly Reports:**
- Sales report (Monday)
- Lead conversion report
- Production status
- Outstanding payments

**Monthly Reports:**
- Complete sales analysis
- Marketing ROI
- Inventory valuation
- Profitability report

**Export & Archive:**
- Export key reports monthly
- Store in organized folders
- Year-end compilation for audit

---

## 🆘 Common Issues & Solutions

### Can't Login

**Problem:** "Invalid email or password"

**Solution:**
1. Check email spelling (case-sensitive)
2. Check password (case-sensitive)
3. Try "Forgot Password" link
4. Contact admin if still can't login

---

### Lead Not Showing

**Problem:** "Created lead but can't find it"

**Solution:**
1. Check if you're filtering by status
2. Try searching by company name
3. Check "All Leads" view
4. Clear all filters
5. Refresh page (F5)

---

### Quotation Not Generating

**Problem:** "Generate button not working"

**Solution:**
1. Ensure you added at least one product
2. Check product has valid price
3. Ensure customer is selected
4. Check GST settings in Settings
5. Check browser console for errors

---

### WhatsApp Message Not Sending

**Problem:** "Message not delivered"

**Solution:**
1. Check internet connection
2. Verify backend is running
3. Check phone number format (+91...)
4. Try again after 30 seconds
5. Note: Currently UI only (mock sending)

---

### Report Not Exporting

**Problem:** "Export button not working"

**Solution:**
1. Check if data exists in date range
2. Try different date range
3. Check browser allows downloads
4. Try different format (Excel/CSV/PDF)
5. Check browser's download settings

---

### Stock Count Wrong

**Problem:** "Inventory count doesn't match"

**Solution:**
1. Check recent stock movements
2. Review production material issues
3. Check for pending PO receipts
4. Do physical stock count
5. Adjust stock in system if needed

---

## 📞 Getting Help

### In-App Help

**Tooltips:**
- Hover over any field for explanation
- ? icons provide contextual help

**Field Validation:**
- Red border = error/required
- Error message shows what's wrong

---

### Support Contact

**For Technical Issues:**
- Email: support@amituniform.com
- Phone: +91 79 2765 4321

**For Training:**
- Contact your department head
- Schedule training session

**For Feature Requests:**
- Email: feedback@amituniform.com
- Describe what you need

---

## 📚 Quick Reference

### Keyboard Shortcuts

- **Ctrl/Cmd + K** - Global search
- **Ctrl/Cmd + /** - Open sidebar
- **Esc** - Close modal/popup
- **Enter** - Submit form
- **Tab** - Next field

### Status Color Codes

- 🟢 **Green** - Active, Confirmed, Paid, Completed
- 🟡 **Yellow** - Pending, In Progress, Partial
- 🔴 **Red** - Overdue, Urgent, Failed
- ⚪ **Grey** - Draft, Inactive, Cancelled

### Priority Badges

- 🔥 **Hot** - Urgent, respond ASAP
- 🌡️ **Warm** - Important, follow-up soon
- ❄️ **Cold** - Low priority, can wait

---

## 🎓 Training Checklist

**New User Onboarding:**

**Day 1:**
- [ ] Login successfully
- [ ] Explore dashboard
- [ ] Create a test lead
- [ ] Move lead through pipeline
- [ ] Add notes to lead

**Week 1:**
- [ ] Create quotation
- [ ] Generate invoice
- [ ] Record payment
- [ ] Create product
- [ ] Generate report

**Month 1:**
- [ ] Complete 50 leads
- [ ] Send 20 quotations
- [ ] Close 5 orders
- [ ] Use WhatsApp effectively
- [ ] Generate weekly reports

---

## 📄 Glossary

**CRM** - Customer Relationship Management  
**GST** - Goods and Services Tax  
**GSTIN** - GST Identification Number  
**HSN** - Harmonized System of Nomenclature  
**MOQ** - Minimum Order Quantity  
**PI** - Proforma Invoice  
**PO** - Purchase Order  
**QC** - Quality Control  
**POD** - Proof of Delivery  
**ROI** - Return on Investment  
**CPL** - Cost Per Lead  
**SKU** - Stock Keeping Unit

---

**Last Updated:** 2026-09-27  
**Version:** 1.0  
**For:** Amit Uniform CRM System

**Questions?** Contact your system administrator or refer to HOW_TO_RUN.md for technical setup.
