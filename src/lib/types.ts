
export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isPrimary: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isMainStore: boolean;
  ownerId?: string;
}

export interface Company {
  id: string;
  name: string;
  shortName: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  displayLogo?: boolean;
  invoiceTerms?: string;
  invoicePrefix?: string;
  lastInvoiceNumber?: number;
  lastBillNumber?: number;
  lastGstPoNumber?: number;
  lastCashPoNumber?: number;
  signatureUrl?: string;
  useSignature?: boolean;
  noSignatureText?: string;
}

export interface PriceHistoryEntry {
  sellingPrice: number;
  purchasePrice: number;
  date: string; // ISO date string
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  serialNumber?: string;
  brand: string;
  category: string;
  subCategory?: string;
  handPreference?: 'Normal' | 'Left' | 'Right' | 'Blank';
  color1?: string;
  color2?: string;
  vendorId: string;
  purchasePrice: number;
  miscellaneousCost?: number;
  profitPercentage?: number;
  profitAmount?: number;
  sellingPrice: number;
  finalPrice?: number;
  description: string;
  hsnCode: string;
  gstRate: number;
  isBundle: boolean;
  bundleItems?: { productId: string; quantity: number }[];
  isActive: boolean;
  imageUrl?: string;
  priceHistory?: PriceHistoryEntry[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  stockBatches: {
    date: string;
    quantity: number;
    purchasePrice: number;
    vendorId: string;
    invoiceNumber?: string;
  }[];
  locationComment: string;
  lastStockUpdate: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  serialNumber?: string;
  brandId: string;
  brandName?: string;
  handPreference?: 'Normal' | 'Left' | 'Right' | 'Blank';
  color1?: string;
  color2?: string;
  quantity: number;
  unitPrice: number;
  costOfGoodsSold: number;
  discount: number;
  totalPrice: number;
  hsnCode: string;
  gstRate: number;
  categoryId?: string;
  subCategoryId?: string;
}

export interface Sale {
  id: string;
  storeId: string;
  saleDate: string;
  saleTime: string;
  dueDate: string;
  warrantyExpiryDate?: string;
  saleType: 'GST' | 'Cash';
  customerId: string;
  customerName: string;
  billingAddress: Address;
  shippingAddress?: Address;
  items: SaleItem[];
  subTotal: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  appliedCouponCode?: string;
  couponDiscount?: number;
  manualDiscountPercentage?: number;
  manualDiscountAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  balanceAmount?: number;
  invoiceStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  paymentMethod: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'Other' | 'Sponsored' | 'Replacement';
  paymentDetails?: string;
  invoiceSequence: string;
  courierCompany?: string;
  trackingNumber?: string;
  trackingLink?: string;
  numberOfBoxes?: number;
  createdBy?: string;
  createdByName?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'Other';
  reference?: string;
  notes?: string;
  createdBy?: string;
}

export interface Coupon {
  id: string;
  storeId: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchaseAmount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  timesUsed: number;
  maxUses: number;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  customerId: string;
  customerName: string;
  saleId?: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
  categoryId?: string;
  subCategoryId?: string;
  vendorId?: string;
}

export interface PurchaseOrder {
    id: string;
    storeId: string;
    deliveryStoreId: string;
    vendorId: string;
    vendorName: string;
    purchaseType: 'GST' | 'Cash';
    orderDate: string;
    expectedDeliveryDate: string;
    paymentDueDate: string;
    status: 'Pending' | 'Shipped' | 'Partially Received' | 'Received' | 'Cancelled';
    paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
    paymentMethod: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'Other';
    items: {
        productId: string;
        productName: string;
        color1?: string;
        color2?: string;
        imageUrl?: string;
        quantity: number;
        quantityReceived: number;
        unitCost: number;
        totalCost: number;
        hsnCode: string;
        gstRate: number;
    }[];
    subTotal: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    amountPaid?: number;
    balanceAmount?: number;
    purchaseOrderNumber: string;
    comments?: string;
    courierCompany?: string;
    trackingNumber?: string;
    trackingLink?: string;
    numberOfBoxes?: number;
    createdBy?: string;
    createdByName?: string;
}

export interface Customer {
  id: string;
  storeId: string;
  title: string;
  name: string;
  companyName?: string;
  customerType?: string;
  gstNumber?: string;
  addresses: Address[];
  birthday?: string | null;
  anniversary?: string | null;
  email: string;
  phone: string;
  referenceName?: string;
  referenceContact?: string;
  isApproved?: boolean;
  purpose?: string;
  createdAt?: any;
}

export interface Vendor {
    id: string;
    storeId: string;
    name: string;
    vendorType?: string;
    contactTitle?: string;
    contactPerson?: string;
    email: string;
    phone: string;
    gstNumber?: string;
    addresses: Address[];
    birthday?: string | null;
    anniversary?: string | null;
    products?: string[];
}

export interface Expense {
    id: string;
    storeId: string;
    companyId: string;
    date: string;
    expenseType?: string;
    category: string;
    subCategory?: string;
    brand?: string;
    description: string;
    amount: number;
    vendor?: string;
    paymentMethod?: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'Other';
    gstNumber?: string;
    gstRate?: number;
    gstAmount?: number;
}

export interface SaleReturnItem {
  productId: string;
  productName: string;
  unitPrice: number;
  sellableQuantity: number;
  unsellableQuantity: number;
  totalRefund: number;
  reason?: string;
  gstRate: number;
}

export interface SaleReturn {
  id: string;
  storeId: string;
  customerId: string;
  returnDate: string;
  originalSaleId: string;
  originalInvoiceSequence: string;
  returnSequence: string;
  customerName: string;
  items: SaleReturnItem[];
  subTotalRefund: number;
  gstRefund: number;
  cgstRefund: number;
  sgstRefund: number;
  igstRefund: number;
  totalRefundAmount: number;
}

export interface StockTransfer {
  id: string;
  date: string;
  productId: string;
  productName?: string;
  fromStoreName?: string;
  toStoreId: string;
  toStoreName?: string;
  quantity: number;
  notes?: string;
}

export interface Repair {
    id: string;
    storeId: string;
    customerId: string;
    customerName?: string;
    productId: string;
    productName?: string;
    issueDescription: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    estimatedCost?: number;
    actualCost?: number;
    createdAt: string;
    completedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  hsnCode?: string;
  gstRate?: number;
}

export interface ExpenseType {
  id: string;
  name: string;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  hsnCode?: string;
  gstRate?: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface CustomerType {
  id: string;
  name: string;
}

export interface VendorType {
  id: string;
  name: string;
}

export interface Color {
  id: string;
  name: string;
}

export interface HandPreference {
    id: string;
    name: string;
}

export interface Courier {
  id: string;
  name: string;
  trackingUrl?: string;
}

export interface Warranty {
  id: string;
  name: string;
  duration: string;
}

export interface EnquiryStatus {
  id: string;
  name: string;
}

export interface EnquiryType {
  id: string;
  name: string;
}

export interface EnquirySource {
  id: string;
  name: string;
}

export interface FollowUpType {
  id: string;
  name: string;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  hsnCode: string;
  gstRate: number;
  imageUrl?: string;
}

export interface FollowUp {
    id: string;
    date: string;
    notes: string;
    type: string;
    nextAction?: string;
    userId: string;
    userName: string;
}

export interface Quotation {
  id: string;
  storeId: string;
  quotationNumber: string;
  date: string;
  validUntil: string;
  deliveryDate: string;
  customerId: string;
  customerName: string;
  billingAddress: Address;
  items: QuotationItem[];
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  termsAndConditions: string;
  status: 'Draft' | 'Sent' | 'Converted' | 'Expired';
  createdBy?: string;
  createdByName?: string;
  followUps?: FollowUp[];
  latestFollowUp?: FollowUp;
  convertedToId?: string;
}

export interface EnquiryFollowUp {
    id: string;
    date: string;
    notes: string;
    type: string;
    nextAction?: string;
    userId: string;
    userName: string;
}

export interface EnquiryItem {
  productId: string;
  productName: string;
  brandId: string;
  categoryId: string;
  subCategoryId?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  totalPrice: number;
}

export interface Enquiry {
    id: string;
    storeId: string;
    enquiryNumber: string;
    date: string;
    customerId: string;
    customerName?: string;
    enquiry: string;
    status: string;
    convertedToId?: string;
    followUps?: EnquiryFollowUp[];
    latestFollowUp?: EnquiryFollowUp;
    items?: EnquiryItem[];
    enquiryTypeId?: string;
    sourceId?: string;
    saleType?: 'GST' | 'Cash';
    totalAmount?: number;
    createdBy?: string;
    createdByName?: string;
}


export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  action: string;
  ipAddress: string;
  details?: Record<string, any>;
}

export interface User {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'data-entry';
    isApproved: boolean;
}

export interface Note {
    id: string;
    userId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isPinned?: boolean;
    tags?: string[];
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  createdAt: string;
  updatedAt: string;
}
