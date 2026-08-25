# Master Design & Logic Document: Cricket Store Manager (ERP)

This document provides the "Gold Standard" blueprint for replicating or redesigning the 18 core modules of this ERP system. Every prompt includes granular details on form fields, linkings, calculations, and cross-module relationships.

---

## Technical "Gold Standards" (Apply to All Modules)

### 1. Search & Dialog UI
"Implement searchable dropdowns using a portal-free inline absolute pattern (z-100). This prevents Radix/ShadCN focus traps in Dialogs. Search logic must manually filter 'Name + SKU' strings."

### 2. Transactional Row Management
"In item entry forms (Sales, PO, Quotations): Auto-append a new blank row when the last row is filled. Consolidate duplicate product selections by incrementing quantity instead of adding new rows. Filter out incomplete rows on submission."

### 3. Financial Rounding
"Mathematically round Grand Totals to the nearest integer. Explicitly calculate and display a 'Round Off' figure."

---

## The 18 Module Prompts

### 1. Dashboard (The Nerve Center)
"Build a store manager's command center.
- **Stats Widgets:** Cards for Sales, Purchases, and Expenses (current month vs previous) with % change indicators.
- **Quick Actions:** 9-button grid: New Sale, New Purchase, Add Product, Add Customer, Add Expense, Inventory Update, New Enquiry, New Quotation, My Notes.
- **Recent Activity:** Feed of 5 latest Sales with customer avatars and deep links to TAX Invoices.
- **Reminders:** Tabbed view for Birthdays and Anniversaries (next 30 days) for Customers/Vendors. 'Send Greeting' action generates a mailto link with store branding.
- **Visuals:** Recharts bar chart showing monthly revenue trends.
- **Linking:** Global search for Customer History that renders a miniature DataTable of their specific invoices."

### 2. Sales & Returns (Revenue)
"Build a Sales & Credit Note module.
- **Sales Form:** Customer search, Date, Type (GST/Cash), Store Source, Payment Method, Status (Paid/Pending).
- **Line Items:** Product search auto-populates SKU, HSN, and GST.
- **Calculations:** Subtotal, GST (CGST/SGST/IGST based on Store-Customer state), Manual Discount %, Coupon Discount (linked to Coupons), and Round Off.
- **Payment History:** Sub-collection for each invoice to track multiple partial payment installments (Date, Method, Amount, System Timestamp).
- **Returns:** Dialog to select original Invoice, check-off items, mark as 'Sellable' (restocks) or 'Unsellable' (scraps), and calculate Net Credit refund."

### 3. Enquiries (Lead CRM)
"Build a lead capture system.
- **Form:** Customer search (plus 'Add New Customer' quick-trigger), Requirement details (textarea), and 'Interested Products' list.
- **Linking:** Enquiry Status (New, Follow-up, Converted).
- **Slip:** Dedicated printable 'Enquiry Slip' route showing SKU and approximate pricing for customer handouts.
- **Follow-ups:** Sub-collection logging every interaction (Date, User, Notes)."

### 4. Quotations (Pro-forma)
"Build a professional proposal generator.
- **Form:** Customer, Validity Expiry, Delivery Lead Time, Terms & Conditions (auto-filled from Company Master), and line items.
- **Conversion:** Action to 'Convert to Sale' which clones data into a new Sale record, updates Quotation status to 'Converted', and links IDs.
- **Output:** Indian Numbering System 'Amount in Words' and right-aligned financial PDF."

### 5. Inventory (Stock Control)
"Build a real-time stock monitor.
- **Metadata:** Show SKU, 'Potential Profit per Unit' (Landed Cost vs Selling Price), and Location Comments.
- **Adjustment:** Use a 'Stock Batch' logic. Entries require Vendor ID, Date, Purchase Price (updates Product Master), and Quantity (+/-).
- **Valuation:** Summary cards for 'Landed Value' and 'Retail Value' of total stock."

### 6. Products (The Catalog)
"Build a Product Master with reactive pricing.
- **Fields:** Name, SKU (Auto-gen via Brand/Category prefix), Serial, Brand, Category, Sub-category, Hand Preference, Colors.
- **Pricing Matrix:** Purchase + Misc = Landed. Landed + Profit % = Selling. Selling + GST = Final. Final Price override must back-calculate Profit.
- **Bundle Mode:** Toggle 'isBundle'. Disables manual pricing; cost is sum of searchable component parts.
- **Media:** Firebase Storage upload with progress bar and instant preview."

### 7. Purchases (Supply Chain)
"Build a Purchase Order (PO) system.
- **Form:** Vendor search, Purchase Type, Delivery Store, Items with 'Unit Cost'.
- **Inventory Sync:** 'Receive Stock' action supports partial receipts, pushes new batches to Inventory, and updates Product Master purchase price.
- **Status:** Pending, Shipped, Partially Received, Received."

### 8. Repairs (Service)
"Build a maintenance tracker.
- **Linking:** Customer and Product (Item being repaired).
- **Fields:** Issue description, Status (Pending to Completed), Estimated vs Actual Cost.
- **UX:** High-contrast workflow badges."

### 9. Customers (CRM)
"Build a dual-registry CRM.
- **Staff Entry:** Multi-address (Primary/Shipping), GSTIN, Titles, Reference details.
- **Public Form:** Route `/add-customer` with QR code for walk-ins. Entries are `isApproved: false`.
- **Profile:** Deep-link `/customer/[id]` showing a chronological financial ledger of all Invoices vs Payments."

### 10. Vendors (Suppliers)
"Build a supplier directory.
- **Fields:** Vendor Type, Contact Person, GSTIN, Multi-address.
- **Intelligence:** Filter vendors by the 'Category' or 'Product' they supply based on Product Master relationships."

### 11. Expenses (OpEx)
"Build an operational cost tracker.
- **Linking:** Legal Company and Payee Vendor.
- **Fields:** Date, Expense Type, Category, Amount, Payment Mode.
- **Tax:** Input Base + GST Rate to calculate input tax credit."

### 12. Notes (Private)
"Build a per-user notebook.
- **Fields:** Title, content (rich text), updated timestamp.
- **Security:** Private sub-collection `/users/{uid}/notes`."

### 13. Planner (Schedule)
"Build a calendar tool.
- **UI:** Full-screen calendar with event markers.
- **Events:** Title, Start/End times, Description. Linked to logged-in user."

### 14. Reports (BI)
"Build a reporting engine with global date-range filters.
- **Reports:** Sales, GST, Returns, Purchases, Expenses, Inventory Valuation, Quotations, Enquiries.
- **Export:** Excel and PDF for every tab. Sales report must include 'Payment Installment tracking'."

### 15. Accounting (P&L)
"Build a financial health dashboard.
- **KPIs:** Revenue, COGS (calculated at time of sale), Gross Profit, Net Profit.
- **Visuals:** Revenue vs Net Profit comparison chart."

### 16. Support (Helpdesk)
"Build a ticketing system.
- **Fields:** Ticket ID (sequenced), Customer (linked), Subject, Priority, Status.
- **Tracking:** History of status changes and internal comments."

### 17. Settings (Admin)
"Build a system control panel.
- **Company Profile:** Logo upload, GSTIN, Signature, Global Doc Terms.
- **Master Data:** Lookup managers for 10+ tables (Categories, Brands, Couriers, etc.).
- **User Management:** Role assignment and Account Approval toggles."

### 18. Gemini Chat (AI)
"Build an AI Business Assistant using Genkit.
- **Interface:** Floating widget + full-page dashboard.
- **Logic:** Context-aware assistant that analyzes sales trends, suggests pricing strategies, and handles offline enquiry capture via CAPTCHA-protected form."