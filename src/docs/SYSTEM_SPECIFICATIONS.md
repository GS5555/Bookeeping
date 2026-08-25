# Cricket Store Manager: Complete System Specification (18 Modules)

This document contains 18 dedicated, high-detail prompts designed to allow an AI to replicate the exact logic, linking, and functionality of this ERP system.

---

## 1. Dashboard (The Nerve Center)
**Prompt:** Build a high-level command center for a store manager. 
- **Stats Widgets:** Real-time cards showing Sales, Purchases, and Expenses for the current month vs. previous month, with percentage change indicators. 
- **Quick Actions:** A 9-button grid for instant access: New Sale, New Purchase, Add Product, Add Customer, Add Expense, Inventory Update, New Enquiry, New Quotation, and My Notes.
- **Recent Activity:** A feed of the 5 most recent sales with customer avatars and direct links to TAX Invoices.
- **Event Reminders:** A tabbed component for "Birthdays" and "Anniversaries" occurring within the next 30 days for both Customers and Vendors, with a "Send Greeting" action that pre-fills a mailto link with company branding.
- **Customer History Search:** A searchable dropdown to select any customer and instantly render a miniature DataTable of their specific sale history.
- **Visual Analytics:** A Recharts bar chart showing monthly revenue trends across the calendar year.

## 2. Sales & Returns (Revenue Management)
**Prompt:** Build a robust Sales module with dual-entry support (GST/Cash). 
- **Linking:** Linked to Customers (Buyer), Stores (Source), and Products (Line Items).
- **Sales Form Fields:** Searchable Customer Combobox (Gold Standard: Portal-free), Sale Date, Sale Type (GST/Cash/Retail), Payment Method, and status (Paid/Pending).
- **Line Item Logic:** Card-based entry. Selecting a product must auto-populate SKU, HSN, and GST Rate. If a duplicate product is selected, increment quantity instead of adding a row.
- **Calculations:** Subtotal (Qty * Rate), GST (CGST/SGST/IGST based on Store vs. Customer state), Manual Discount %, Coupon Discount (linked to Coupons module), and a mathematical "Round Off" to the nearest integer.
- **Accounts Receivable:** A "Customer Financials" card showing total outstanding per customer with an "Email Reminder" action.
- **Ledger:** A "Customer Ledger" search tool that generates a chronological debit/credit statement.
- **Returns:** A dedicated "Process Return" dialog. Select an original invoice, check off items to return, specify "Sellable" (restocks inventory) vs. "Unsellable" (scraps), and calculate "Net Credit" refund.

## 3. Enquiries (Lead Tracking)
**Prompt:** Build a CRM lead capture tool.
- **Form Fields:** Customer search, detailed requirement text, and a "Interested Products" line-item list.
- **Linking:** Links to Enquiry Status master data (New, Follow-up, Converted).
- **Slip Generation:** A dedicated "Enquiry Slip" page (Print-friendly) with SKU and approximate values for customer hand-outs.
- **Follow-up Logic:** Sub-collection tracking every interaction with date, user ID, and notes.

## 4. Quotations (Pro-forma Invoicing)
**Prompt:** Build a professional proposal generator.
- **Form Fields:** Customer, Date, Validity Expiry, Delivery Lead Time, Terms & Conditions (Auto-filled from Company Settings), and Line Items.
- **Conversion:** A critical "Convert to Sale" action that clones all quotation data into the Sales Dialog, updates the Quotation status to "Converted," and links the new Invoice ID.
- **Output:** Generate a PDF with "Amount in Words" (Indian Numbering System) and validity watermarks.

## 5. Inventory (Stock Control)
**Prompt:** Build a real-time stock monitoring system.
- **Table Metadata:** Display live stock counts, SKU, and "Potential Profit per Unit" (Landed Cost vs. Selling Price).
- **Stock Adjustment Dialog:** Do NOT edit total quantity directly. Use a "Stock Batch" entry: Date, Vendor ID (linked), Purchase Price (updates Product master), and Quantity (+/-). 
- **Bundle Stock:** Logic to calculate "Possible Bundles" based on the lowest stock of component products.
- **Alerts:** A high-visibility "Low Stock" card for items below 10 units.

## 6. Products (The Catalog)
**Prompt:** Build a sophisticated Product Master with 3-way reactive pricing.
- **Fields:** Name, SKU (Auto-generated), Serial, Brand, Category, Sub-category, Hand Preference (Normal/Left/Right), Colors (Primary/Secondary).
- **Pricing Matrix:** Reactive fields for Purchase Price + Misc Cost = Landed Cost. Landing + Profit % (or Profit Amt) = Selling Price. Selling + GST = Final Price. Entering a "Final Price" override must back-calculate Profit % and Amount.
- **Bundle Mode:** An "isBundle" toggle. When active, pricing is disabled and a "Component Picker" appears. The bundle cost is the sum of its parts.
- **Media:** Firebase Storage upload field with progress bar and instant image preview.
- **History:** An internal array tracking every price change with timestamps.

## 7. Purchases (Supply Chain)
**Prompt:** Build a Purchase Order (PO) system linked to Inventory.
- **Form Fields:** Vendor search, Purchase Type (GST/Cash), Expected Delivery, Store Destination, and Items with "Unit Cost."
- **Workflow:** Creating a PO with a new unit cost must update the Product Master's purchase price. 
- **Fulfillment:** A "Receive Stock" action. Supports partial receipts. Updates the `inventoryItems` collection by pushing new `stockBatches` and updating `lastStockUpdate`.

## 8. Repairs (Service Tracking)
**Prompt:** Build a maintenance tracking module.
- **Linking:** Linked to Customer and Product.
- **Fields:** Issue Description, Status (Pending/In Progress/Completed/Cancelled), Estimated Cost, and Actual Cost.
- **Status Badges:** High-contrast badges for workflow stages.

## 9. Customers (CRM & Public Registry)
**Prompt:** Build a dual-entry CRM.
- **Staff Entry:** Detailed form with Titles, Multi-address support (Primary/Shipping), and Reference details.
- **Public Registration:** A public-facing route (`/add-customer`) with a QR code generator for walk-in registration. 
- **Approval:** Public entries are marked `isApproved: false`. Staff must review and approve them in the main dashboard to enable billing.
- **Profile:** A deep-link profile page (`/customer/[id]`) showing a full financial statement (Invoices vs. Payments).

## 10. Vendors (Supplier CRM)
**Prompt:** Build a supplier management tool.
- **Fields:** Vendor Type (Manufacturer/Wholesaler), Contact Person, GSTIN, and Multi-address support.
- **Sourcing Filter:** Ability to filter the vendor list by the "Category" or "Product" they supply (derived from the Product Master link).
- **Communications:** Birthday/Anniversary reminder links.

## 11. Expenses (Operational Costs)
**Prompt:** Build a business expense tracker.
- **Linking:** Linked to Company (Legal Entity) and Vendor (Payee).
- **Fields:** Date, Expense Type (master data), Category, Description, and Amount.
- **Tax Logic:** Input Base Amount and GST Rate to calculate GST Amount for input tax credit reporting.

## 12. Notes (Staff Notebook)
**Prompt:** Build a per-user private notebook.
- **Features:** Rich-text content, search-by-title, and "Last Updated" timestamps.
- **Security:** Each user only sees their own notes via sub-collection path `/users/{uid}/notes`.

## 13. Planner (Scheduler)
**Prompt:** Build a calendar-based event planner.
- **UI:** Full-screen calendar with "Day Selection."
- **Events:** Title, Time range (Start/End), and Description.
- **Linking:** Integrated with the User ID for private scheduling.

## 14. Reports (Business Intelligence)
**Prompt:** Build a global reporting engine with date-range filtering.
- **Tabs:** Dedicated reports for Sales (All), GST (Tax specific), Returns, Purchases, Expenses, Inventory (Valuation), Quotations, and Enquiries.
- **Export Engine:** Universal "Export to Excel" and "Download PDF" for every report tab.
- **Context:** Sales report must include "Payment Tracking" showing the latest installment date.

## 15. Accounting (P&L Overview)
**Prompt:** Build a financial health dashboard.
- **KPIs:** Total Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
- **Calculation Logic:** COGS is calculated per-sale using the product's purchase price at the time of transaction.
- **Visuals:** A comparison chart of Revenue vs. Net Profit.

## 16. Support (Customer Success)
**Prompt:** Build a ticketing system.
- **Fields:** Ticket ID (Auto-sequenced), Subject, Description, Priority (Low/Medium/High), and Status.
- **Linking:** Linked to a specific Customer and optionally an Invoice (SaleId).

## 17. Settings (System Configuration)
**Prompt:** Build an administrative control panel.
- **Company Profile:** Branding (Logo upload), Contact Info, and Global Document Terms (Invoices/POs).
- **Master Data:** Management of 10+ lookup tables: Categories, Brands, Colors, Couriers, Warranties, Enquiry Status, Customer Types, etc.
- **User Management:** Role-based access control (Admin/Editor/Viewer/Data-entry) and Account Approval toggle.
- **Maintenance:** "Storage Diagnostics" to monitor local cache and "Clear Data" to wipe transactions while keeping Master Data.

## 18. Gemini Chat (AI Insights)
**Prompt:** Build an AI Business Assistant using Genkit.
- **Interface:** A floating "Chat Widget" available on all pages and a full-page "AI Insights" dashboard.
- **Persona:** Expert business assistant for a cricket goods store.
- **Capabilities:** Analyze sales trends, provide pricing advice, and suggest promotion ideas based on user queries.
