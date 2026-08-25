# Master Design & Logic Document

This file contains the "Gold Standard" logic requirements for core system components.

---

## Transaction & UI Gold Standards

### 1. Search Architecture (Dialog-Safe)
"Implement searchable dropdowns using a portal-free inline pattern. Use a `relative` wrapper with an `absolute` results container (z-100) to prevent Dialog focus traps from blocking keyboard input. Search logic must manually filter `Name + SKU` string combinations before mapping."

### 2. Smart Transaction Entry
"In Sales/PO/Quotations forms:
- Automatically append a new blank row when an item is selected in the last row.
- If a user selects a product already in the list, increment the existing row's quantity and remove the new selection to prevent duplicates.
- Save logic must filter out empty/incomplete placeholder rows before Firestore write."

### 3. Reactive Pricing Matrix
"Implement 3-way reactivity:
- Landed Cost = Purchase + Misc.
- Selling Price = Landed + Profit Amount + GST.
- Manual Override: If 'Final Price' is entered, back-calculate Profit % and Amount immediately."

### 4. Financial Accuracy
"Mathematically round Grand Totals to the nearest integer. Explicitly display the difference as a 'Round Off' figure. Invoices must include a 'Payment History' table showing multiple partial payment logs with timestamps."

---

## 18-Module Detailed Specifications
Refer to `src/docs/SYSTEM_SPECIFICATIONS.md` for the full 18-module prompt breakdown including every form field, relationship, and calculation detail.
