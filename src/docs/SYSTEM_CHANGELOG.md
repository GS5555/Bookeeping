# System Changelog (Past 3 Days)

## 1. Robust Search Pattern (Focus Trap Fix)
- **Problem**: Search inputs inside Dialogs were non-typeable due to Radix focus traps.
- **Solution**: Transitioned all searchable dropdowns (Customers, Products, Vendors) to a **Portal-Free Inline Absolute Container** pattern.
- **Result**: 100% keyboard reliability and results that float correctly with `z-[100]`.

## 2. Unified Transaction Workflow
- **Modules**: Sales, Purchase Orders, Quotations, Enquiries.
- **Consolidation**: Selecting a duplicate item now increments the existing quantity.
- **Auto-Append**: New rows are instantly created upon item selection for continuous entry.
- **Smart Save**: Submission logic now ignores blank line items at the end of the form.

## 3. Data-Rich Item UX
- **Design**: Switched to a Card-based layout for items.
- **Metadata**: Added prominent badges for **SKU**, **Stock Count**, **Category**, **Sub-category**, and **GST % Rate**.
- **Real-time Data**: Integrated inventory fetching to show live stock levels during data entry.

## 4. Financial & Document Professionalism
- **Rounding**: Implemented automatic rounding to nearest whole number with explicit **Round Off** figures.
- **PDF Engine**: Overhauled alignment in `src/lib/actions.ts`. Numbers are now strictly right-aligned.
- **SKU Support**: SKU is now a standard column in all final Invoices, POs, Quotations, and Enquiries.
- **Enquiry Slip**: Created a dedicated printable page and PDF generator for Enquiry leads.
