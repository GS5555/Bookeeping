
# Cricket Store Manager - Application Blueprint

## 1. Introduction

The Cricket Store Manager is a comprehensive Enterprise Resource Planning (ERP) application designed specifically for a cricket goods store. It is built as a modern, single-page web application to streamline all aspects of store management, from sales and inventory to customer relations and financial reporting.

This document serves as a detailed blueprint of the application's architecture, features, and user flows.

## 2. Technology Stack

*   **Frontend Framework:** Next.js with React (App Router)
*   **Language:** TypeScript
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Generative AI:** Google Genkit
*   **Analytics:** Google Analytics
*   **Data Handling:** Client-side state management with React Hooks (`useState`, `useMemo`). All data is mocked within the application for demonstration purposes.

---

## 3. Core Modules & Features

The application is organized into several distinct modules, accessible via a persistent sidebar navigation menu. Each module has a dedicated dashboard with summary cards, charts, and a primary data table.

### 3.1. Main Dashboard (`/`)

The Main Dashboard serves as the central command center for the entire application. It is the first page users see upon logging in, offering a real-time, at-a-glance overview of the store's key performance indicators (KPIs) and recent activities. This holistic view enables store managers to quickly assess the business's health and make data-driven decisions.

*   **Quick Actions:** A set of buttons providing one-click access to the most common tasks in the application, such as creating a `New Sale`, `New Purchase`, `Add Product`, or `Add Customer`. This streamlines daily operations by reducing the need to navigate through different modules.

*   **Dashboard Cards (KPI Summary):** A series of prominent cards at the top of the page display the most critical financial and operational metrics. Each card shows a primary value and a trend comparison (e.g., percentage change from the last month).
    *   **Total Sales:** Displays the gross revenue from all completed sales transactions. This figure represents the total monetary value of goods sold before any deductions.
    *   **Total Purchases:** Shows the total value of all purchase orders issued to vendors. This metric is crucial for tracking capital outflow towards acquiring new stock.
    *   **Total Expenses:** A sum of all recorded business expenses, including rent, utilities, salaries, and marketing. This provides insight into operational costs.
    *   **Inventory Value:** Represents the total retail value of all items currently in stock. This is calculated by summing the selling price of every unit in the inventory.

*   **Charts & Widgets:** Below the KPI cards, interactive charts and widgets provide deeper visual insights into business trends.
    *   **Sales Overview:** A large, comprehensive chart that visualizes monthly sales totals for the last 12 months. Users can switch between Bar, Line, Area, and Pie chart views using a dropdown menu to best suit their analytical needs.
    *   **Recent Sales:** A dynamic list showcasing the most recent customer transactions. Each entry includes a hyperlink on the customer's name for quick navigation to the invoice view, along with the invoice number and the total sale amount, providing a live feed of sales activity.
    *   **Pending Invoices:** A dedicated list of all invoices that are currently `Unpaid` or `Partially Paid`. It includes a dropdown to filter by customer. Each entry is hyperlinked and shows the customer's name, the invoice number, the due date, and the total amount due. Overdue invoices are highlighted, allowing for quick follow-up on outstanding payments directly from the dashboard.
    *   **Customer Accounts:** This section provides an at-a-glance view of accounts receivable by displaying a series of cards, one for each customer with an outstanding balance. Each card prominently shows the total amount due. Clicking a card opens a detailed dialog listing every pending invoice for that customer. This section includes a dropdown to filter the view by a specific customer, providing a quick way to manage accounts receivable.
    *   **Event Reminders:** A smart widget that proactively displays upcoming birthdays and anniversaries for both customers and vendors within the next 30 days. Each reminder includes a convenient one-click "Send Greeting" button that opens a pre-written email, streamlining relationship management.

### 3.2. Sales & Returns (`/sales`)

This module handles all customer-facing transactions, including sales and returns, across all store locations.

*   **Dashboard:**
    *   **Summary Cards:** Total Revenue, Total Returns, Net Revenue, Average Sale Value.
    *   **Revenue Chart:** A line chart showing revenue trends over time.
    *   **Customer Accounts:** Displays cards for customers with outstanding balances. Clicking a card opens a dialog with a detailed list of their pending invoices.
    *   **Customer Sale History:** A section with a dropdown to select a customer and view their complete transaction history in a data table.
*   **Primary Actions:**
    *   `New Sale`: Opens the sale creation dialog.
    *   `New Return`: Opens the return processing dialog.
*   **Data Table (Transactions):**
    *   Organized into three tabs: `GST Sales`, `Cash Sales`, and `Returns`.
    *   **GST/Cash Sales Columns:** Invoice #, Customer, Date, Status, Total, Actions.
    *   **Returns Columns:** Return Date, Original Invoice #, Customer, Store, Items Returned, Refund Amount, Reason, Actions.
    *   **Row Actions (Sales):** Email Invoice, Print, Download PDF, Print Barcodes for all items in the sale, Delete.
    *   **Row Actions (Returns):** Print Slip, Download PDF, Email Slip.
*   **New Sale Dialog:**
    *   **Store Selection:** A mandatory dropdown to select the store where the sale is being made. Inventory is deducted from this store.
    *   **Customer Information:** Select a customer from a dropdown. Their primary billing address is automatically displayed.
    *   **Shipping Address:** A toggle `Use a different shipping address?` reveals a dropdown of the customer's other saved addresses.
    *   **Sale Details:**
        *   `Sale Date`: Defaults to today.
        *   `Sale Type`: Radio buttons for `GST` or `Cash`.
    *   **Items Table:** Add/remove products. The table displays available stock for the selected store.
    *   **Payment Information:** `Mode of Payment`, `Payment Status`, and `Payment Details`.
    *   **Pricing & Tax:** Includes fields for coupon codes, manual discounts, and dynamic GST calculation based on inter-state or intra-state rules.
    *   **Shipping Details:** Includes a dropdown for **courier company** (manageable in Settings), tracking number, tracking link, and number of boxes.
*   **New Return Dialog:**
    *   Select a customer, which then filters a dropdown of their past invoices.
    *   Once an invoice is selected, its items are listed.
    *   **Return Store Selection:** A dropdown allows selecting the store to process the return. It defaults to the original sale location but can be changed.
    *   For each item, you can enter a quantity for **`Sellable`** (restocked to the selected store's inventory) and **`Unsellable`** (written off), and provide a specific `Reason` for the return.
    *   The total refund amount is calculated automatically.

### 3.3. Inventory (`/inventory`)

View and manage current stock levels across all store locations.

*   **Dashboard:**
    *   **Summary Cards:** Total SKUs, Total Quantity, Low Stock Items (`<10` units), Total Stores.
    *   **Chart:** Bar chart displaying total stock quantity at each store location.
*   **Primary Actions:**
    *   `New Stock Entry`: Opens a dialog to manually adjust stock for a specific product at a specific store.
    *   `Transfer Stock`: Opens a dialog to transfer inventory between store locations.
    *   `Import` / `Export`: Placeholder for future bulk inventory updates.
*   **Data Table:**
    *   A "Low Inventory Alerts" table prominently displays items with stock `< 10` at any location.
    *   The main table lists every inventory record, showing **Product**, **Store**, **Quantity**, **Purchase Price**, **Selling Price**, **Potential Profit**, and **Location in Store**.
    *   An "Adjust" button in each row allows for quick stock updates via the stock dialog.
*   **Row Actions:** `Edit Product`, `View History` (placeholder).

### 3.4. Products (`/products`)

Manage the store's central product catalog.

*   **Dashboard:**
    *   **Summary Cards:** Total Products (SKUs), Active Products, Average Price.
    *   **Chart:** Bar chart showing the number of products per category.
*   **Primary Actions:**
    *   `Add Product`: Opens the product creation dialog. When a new product is added, inventory records are automatically created for it in all stores with a quantity of 0.
    *   `Import`/`Export`: Bulk data management for the product catalog.
*   **Data Table Columns:** Product (with **image preview** and details), SKU, Category, **Total Stock** (aggregated across all stores), Price, Status, Actions.
*   **Row Actions:** `Edit Product`, `Print Barcode`, `Delete`.
*   **Product Dialog (Add/Edit):** Standard product detail fields. Includes an image upload feature (via URL or file browser) with a preview.

### 3.5. Purchases (`/purchases`)

Manage all purchase orders (POs) from vendors for all stores.

*   **Dashboard:**
    *   **Summary Cards:** Total POs, Total Purchase Value, POs Received, Pending Delivery.
    *   **Chart:** Bar chart showing the total value of POs over time.
*   **Primary Actions:**
    *   `New Purchase Order`: Opens the PO creation dialog.
    *   `Export All`: Downloads a detailed Excel report of all purchase orders.
*   **Data Table Columns:** PO Number, Vendor, Delivery Store, Order Date, Delivery Status, Payment Status, Total, Actions.
*   **Row Actions Dropdown:**
    *   `Update Status`: Sub-menu to set status to `Pending`, `Shipped`, or `Cancelled`.
    *   `Receive Partial Stock`: Opens a dialog to enter quantities received for each item.
    *   `Mark as Fully Received`: One-click action to receive all remaining items.
    *   `Email PO`, `Print PO`, `Download PDF`, `Delete`.
*   **New Purchase Order Dialog:**
    *   **Delivery Store:** A mandatory dropdown to select the store where the stock should be delivered.
    *   Standard PO fields for vendor, dates, items, and payment.
    *   **Shipping Details:** Includes a dropdown for **courier company** (manageable in Settings), tracking number, tracking link, and number of boxes.
*   **Receive Stock Logic:**
    *   **Partial & Full Receipts:** Stock can be received against a purchase order either partially (using the "Receive Partial Stock" dialog) or fully (using the "Mark as Fully Received" action).
    *   **Automated Inventory Updates:** When stock is received, the inventory quantities are automatically increased for the specified **delivery store**.
    *   **Status Updates:** The PO status automatically transitions to `Partially Received` or `Received` based on the quantities received.

### 3.6. Customers (`/customers`)

Manage customer contact information and relationships.

*   **Dashboard:**
    *   **Summary Cards:** Total Customers, Unique Cities.
    *   **Chart:** Bar chart breaking down customers by their primary city.
*   **Primary Actions:**
    *   `Add Customer`: Opens the customer creation dialog.
    *   `Import`, `Export`, `Download Sample` for bulk data management.
*   **Data Table:** Displays key customer information.
*   **Add/Edit Dialog:** Manage customer details, multiple addresses, and optional birthday and anniversary date fields to enable event reminders.

### 3.7. Vendors (`/vendors`)

Manage vendor contact information and relationships.

*   **Dashboard:**
    *   **Summary Cards:** Total Vendors, Unique Countries.
    *   **Chart:** Bar chart breaking down vendors by their primary country.
*   **Primary Actions:**
    *   `Add Vendor`: Opens the vendor creation dialog.
    *   `Import`, `Export`, `Download Sample` for bulk data management.
*   **Data Table:** Displays key vendor information.
*   **Add/Edit Dialog:** Manage vendor details, multiple addresses, and optional birthday and anniversary date fields to enable event reminders.

### 3.8. Stores (`/stores`)

Manage the physical store locations for the business.

*   **Features:** Add, edit, and delete store locations. One store can be marked as the "Main Store". This information is used throughout the app for inventory, sales, and purchasing.

### 3.9. Expenses (`/expenses`)

*   **Dashboard:**
    *   **Summary Cards:** Total Expense Value, Total Transactions.
    *   **Chart:** A bar chart breaking down expenses by category.
*   **Features:** Track business expenses with categories, vendors, and amounts. Includes import/export functionality. Each expense must be associated with a specific store.

### 3.10. Reports & Analytics (`/reports`)

A centralized hub for generating and viewing detailed reports, with a special focus on financial health and transaction history.

*   **Global Filters:** A date range picker with presets.
*   **Global Action:** `Download Backup` for all critical application data.
*   **Financial Overview Cards:**
    *   **Customer Accounts:** View outstanding balances per customer.
    *   **Vendor Accounts:** View pending payments to vendors.
    *   **Customer/Vendor History:** Select a customer or vendor to view their complete transaction history.
*   **Tabbed Report Interface:** Detailed, exportable reports for `Sales`, `GST Sales`, `Returns`, `Purchases`, `Expenses`, `Inventory`, and `Stock Transfers`. These reports now include store-specific information where applicable.

### 3.11. Accounting (`/accounting`)

Provides a high-level overview of the store's financial health, with the ability to filter data by store.

*   **Store-Level Filtering:** A prominent dropdown allows users to view financial data for all stores combined or to drill down into the performance of a single branch. All cards and charts on the page update dynamically based on this selection.
*   **Dashboard:**
    *   **Summary Cards:** Total Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
    *   **Financial Performance Chart:** A chart that visualizes monthly revenue and net profit for the selected store(s).

### 3.12. Support (`/support`)

*   **Features:** A simple ticket management system to track customer inquiries.

### 3.13. Coupons (`/coupons`)

*   **Features:** Create and manage percentage-based or fixed-amount discount coupons.

### 3.14. Settings (`/settings`)

*   **Features:** A page to manage the options used in various dropdowns across the app (e.g., Categories, Brands, HSN Codes, **Courier Partners**).

### 3.15. AI Insights (`/ai-insights`)

*   **Features:** Utilizes Genkit to analyze product sales data and suggest optimal pricing and promotional strategies.

---

## 4. Shared Features & Compliance

### 4.1. Live Chat Widget

A floating AI-powered chat assistant for help with app features.

### 4.2. Document Handling (Invoices, POs, Returns)

*   **Web-Native Document Previews:** Clicking any invoice, purchase order, or return slip number throughout the application opens a dedicated, printable HTML preview page in a new tab.
*   **Accurate On-Screen Preview:** These pages are styled with a clean, white background and black text, providing an accurate preview of the final printed document, regardless of the app's current theme (light or dark).
*   **Browser-Based Printing:** Each preview page includes its own "Print" button, which uses the browser's native print functionality. This allows for easy printing to physical printers or saving as a PDF.
*   **Clean & Focused:** The generated documents have a professional design and intentionally omit internal details like payment status or due dates to maintain a clean appearance for external sharing.
*   **Indian GST Law Compliance:**
    *   Correctly calculates and applies CGST/SGST or IGST based on the customer's location.
    *   The total summary explicitly displays separate rows for CGST, SGST, and IGST for maximum clarity.
    *   The total amount is also written out in words (Indian numbering system) as required by law.
*   **Shipping & Tracking:** Courier company, tracking number, and tracking link details can be added to sales and purchase orders and are included on the final documents.
*   **Unique Transaction Numbering:** Sales and returns are assigned unique, automatically generated sequence numbers with distinct prefixes (`INV-` for GST Sales, `BILL-` for Cash Sales, `RTN-` for Returns) for easy identification and tracking.

### 4.3. Data Management

*   **Import/Export:** Key modules support bulk data management via Excel files.
*   **PDF Export:** All tabular reports can be exported directly as PDFs. Key documents like invoices and purchase orders can be saved as PDFs using the browser's print functionality from their dedicated preview pages.
*   **Barcode Printing:** Barcodes can be printed for individual products or for all items in a sale.

### 4.4. Theme Toggling (Light/Dark Mode)

A theme toggle in the header allows users to switch between Light, Dark, and System-default themes.

### 4.5. Fully Responsive Design

The application has been optimized for a seamless experience across all devices, from mobile phones to desktops. Key responsive enhancements include:
*   **Adaptive Layouts:** All pages, including the main dashboard and module dashboards, feature adaptive grid layouts. Components like summary cards, charts, and lists reflow elegantly to fit any screen size.
*   **Responsive Controls:** Page headers with action buttons, data table pagination controls, tabbed interfaces, and complex filter sections (like on the Reports page) now stack and resize cleanly on smaller screens.
*   **Mobile-Friendly Forms:** All data entry dialogs (e.g., New Sale, Add Product, New Purchase Order) have been designed to convert multi-column layouts into a single, scrollable column on mobile devices, ensuring a smooth and error-free data entry experience.

### 4.6. Performance & Analytics

*   **Performance:** A custom `useIsMounted` hook is used throughout the application to prevent React hydration errors. This ensures that client-side specific rendering (like formatting dates and numbers) happens smoothly after the initial server render, improving perceived load times.
*   **Analytics:** Google Analytics is integrated to track page views and user interactions. The Measurement ID is configured via a `NEXT_PUBLIC_GA_ID` environment variable.

