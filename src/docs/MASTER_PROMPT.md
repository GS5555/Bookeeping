# Master ERP Transaction Prompt

Copy and use this prompt to replicate the current system's robust transaction behavior in other AI-driven development environments:

---

"Build a robust ERP transaction module (Sales/PO/Quotations) with the following technical requirements:

1. **Search Architecture**: Implement searchable dropdowns using a portal-free pattern. Use a `relative` wrapper with an `absolute` results container (z-100) to prevent Dialog focus traps from blocking keyboard input. 
2. **Dynamic Row Management**: In the item entry form, automatically append a new blank row whenever a product is selected in the last available row.
3. **Smart Consolidation**: If a user selects a product that is already in the list, increment the quantity of the existing row instead of adding a duplicate.
4. **Submission Integrity**: Update the save logic to automatically filter and ignore any empty or incomplete placeholder rows.
5. **UI & Metadata**: Display SKU, Category, Sub-category, and GST% Rate as high-contrast badges within each line-item card. Show real-time Stock counts for each product during selection.
6. **Rounding Logic**: Mathematically round the Grand Total to the nearest whole integer. Explicitly calculate and display the difference as a 'Round Off' figure in the summary.
7. **Professional PDF Engine**: Use jspdf-autotable to generate documents. Ensure strict right-alignment for all numeric data (Qty, Rate, Total). Include a dedicated column for SKU and GST%. Ensure the 'Amount in Words' uses the Indian Numbering System based on the rounded total."
