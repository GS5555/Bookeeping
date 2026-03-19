# Master ERP Transaction Prompt

Use this prompt to replicate the current system's transaction behavior:

---

"Build a robust ERP transaction module (Sales/PO/Quotations) with the following technical requirements:

1. **Search Architecture**: Implement searchable dropdowns using a portal-free pattern. Use a `relative` wrapper with an `absolute` results container (z-100) to prevent Dialog focus traps from blocking keyboard input. 
2. **Dynamic Row Management**: In the item entry form, automatically append a new blank row whenever a product is selected in the last available row.
3. **Smart Consolidation**: If a user selects a product that is already in the list, increment the quantity of the existing row instead of adding a duplicate.
4. **Submission Integrity**: Update the save logic to automatically filter and ignore any empty or incomplete placeholder rows.
5. **UI & Metadata**: Display SKU, Category, Sub-category, and GST% Rate as high-contrast badges within each line-item card. Show real-time Stock counts for each product during selection.
6. **Rounding Logic**: Mathematically round the Grand Total to the nearest whole integer. Explicitly calculate and display the difference as a 'Round Off' figure in the summary.
7. **Professional PDF Engine**: Use jspdf-autotable to generate documents. Ensure strict right-alignment for all numeric data (Qty, Rate, Total). Include a dedicated column for SKU and GST%. Ensure the 'Amount in Words' uses the Indian Numbering System based on the rounded total."

---

# Detailed Product & Bundle Prompt

Use this prompt to replicate the detailed Product module:

"Build a comprehensive Product Catalog module with Advanced Pricing and Bundle capabilities:

1. **Reactive Pricing Matrix**: Implement three-way reactive pricing. Landing Price = Purchase + Misc. Profit Amount = Landing * Profit%. Selling Price = Landing + Profit + GST. If a user enters a 'Final Price' (Manual Override), the system must back-calculate the Profit % and Profit Amount.
2. **Bundle Architecture**: Support an 'isBundle' toggle. When enabled, disable manual price entry. Provide a searchable 'Add Component' picker. Sum the Purchase and Selling prices of all component products to determine the Bundle's total costs and price reactively.
3. **Master Data Sync**: Automatically populate HSN Codes and GST Rates upon Category or Sub-category selection via a lookup table.
4. **Media Handler**: Implement an image upload field using Firebase Storage. Include a visual progress bar during the upload process and an instant preview once the URL is returned.
5. **SKU Generator**: Add a 'Generate SKU' function that constructs a unique identifier using prefixes from the Brand name, Category name, and a 4-digit timestamp suffix.
6. **Price History Tracking**: Maintain an internal array of objects (`priceHistory`) tracking every time a price is modified, logging both old and new Purchase/Selling prices with ISO timestamps.
7. **Cloning Logic**: Add a 'Clone' action that pre-fills the creation dialog with data from an existing product but resets the SKU, Serial Number, and ID fields for a new entry."

---

# Storage Analytics & Diagnostics Prompt

Use this prompt to replicate the Storage Analytics functionality:

"Build a robust Storage Analytics and Optimization Dashboard with the following technical requirements:

1. **KPI & Metrics Engine**:
   - Total Footprint: Calculate and display the total size of monitored files in GB.
   - Capacity Gauge: Show a progress bar indicating current disk utilization (e.g., 84%).
   - Index Snapshot: Display total file count and current monthly growth rate.

2. **Visual Analytics**:
   - Integrate a Pie Chart (Recharts) to show the breakdown of storage by file type (Logs, Backups, Media, Temp, Other).
   - Use tooltips that format bytes into human-readable MB/GB.

3. **Smart Optimization (AI Recommendations)**:
   - Flag optimization tasks: Truncate Logs (>90 days), Compress Media (>500MB), Archive Backups (>30 days).
   - Display impact (space saved) and confidence level for each.

4. **Dual-View Explorer**:
   - Registry View: Tabular list of top 50 largest files with absolute paths and deletion actions.
   - Directory Tree View: Recursive folder component showing aggregated sizes and file counts.

5. **Scan Workflow**:
   - Include a 'Deep Scan' trigger that re-indexes the file system and updates charts asynchronously.

6. **Role-Based Security**:
   - Restrict the module strictly to 'admin' roles with a professional 'Access Denied' state for others."
