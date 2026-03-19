# System Changelog (Past 3 Days)

## 1. Robust Search Pattern (Focus Trap Fix)
- **Problem**: Search inputs inside Dialogs were non-typeable due to Radix focus traps.
- **Solution**: Transitioned all searchable dropdowns (Customers, Products, Vendors) to a **Portal-Free Inline Absolute Container** pattern using a `relative` wrapper and `z-[100]` absolute list.
- **Relevant Search**: Updated matching logic to strictly filter by `Name + SKU` string combinations to prevent irrelevant results.

## 2. Unified Transaction Workflow
- **Modules**: Sales, Purchase Orders, Quotations, Enquiries.
- **Consolidation**: Selecting a duplicate item now increments the existing quantity instead of creating a new row.
- **Auto-Append**: New rows are instantly created upon item selection in the last available line.
- **Smart Save**: Submission logic now automatically filters and ignores blank line items.

## 3. Data-Rich Item UX
- **Design**: Switched to a high-contrast Card-based layout for items.
- **Metadata**: Added prominent badges for **SKU**, **Stock Count**, **Category**, **Sub-category**, and **GST % Rate**.
- **Real-time Data**: Integrated inventory fetching to show live stock levels during data entry.

## 4. Products & Pricing Logic
- **Three-Way Pricing**: Implemented reactive fields for Purchase Price, Misc Cost, Profit %, Profit Amount, and Final Price.
- **Auto-HSN/GST**: Automatic lookup of HSN codes and tax rates based on Category selection.
- **Price History**: Tracking system that logs every change to purchase or selling prices with timestamps.
- **SKU Generator**: Logic to construct SKUs using Brand/Category prefixes and timestamps.

## 5. Bundle Functionality
- **Component Architecture**: Ability to build a product from other products.
- **Automated Costing**: Bundle price is auto-calculated by summing the component products' costs.
- **UI**: Added a specialized search and quantity manager for bundle components within the Product Dialog.

## 6. Financial & Document Professionalism
- **Rounding**: Mathematically round Grand Totals to nearest whole integer with explicit **Round Off** figures.
- **PDF Engine**: Overhauled `src/lib/actions.ts` for strict alignment. Numbers are now strictly right-aligned.
- **SKU Support**: SKU is now a standard column in all final Invoices, POs, Quotations, and Enquiries.
- **Enquiry Slip**: Created a dedicated printable page and PDF generator for Enquiry leads.
