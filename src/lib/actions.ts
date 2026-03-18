
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Sale, PurchaseOrder, Address, SaleReturn, Product, Customer, Vendor, Expense, Coupon, Store, StockTransfer, InventoryItem, Company, Quotation, Enquiry } from './types';
import { numberToWordsInr } from '@/lib/utils';

// =================================================================================
// PDF Content Generation Helpers
// =================================================================================

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return 'Rs. 0.00';
    const fixedAmount = amount.toFixed(2);
    const parts = fixedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rs. ${parts.join('.')}`;
};

const addCompanyHeader = (doc: jsPDF, companyDetails: Company) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyDetails.name, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (companyDetails.address) {
        const addressLines = doc.splitTextToSize(companyDetails.address, pageWidth - 40);
        doc.text(addressLines, pageWidth / 2, 26, { align: 'center' });
    }
    let contactLine = [
        companyDetails.gstin ? `GSTIN: ${companyDetails.gstin}` : null,
        companyDetails.email ? `Email: ${companyDetails.email}` : null,
        companyDetails.phone ? `Phone: ${companyDetails.phone}` : null,
    ].filter(Boolean).join(' | ');
    doc.text(contactLine, pageWidth / 2, 34, { align: 'center' });
    doc.line(14, 38, pageWidth - 14, 38);
};

const addAddressBlock = (doc: jsPDF, label: string, name: string, address: Address, contact: {email?: string, phone?: string, gst?: string}, x: number, y: number) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, y);
    let yPos = y + 5;
    doc.text(name, x, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    if (address.street) { doc.text(address.street, x, yPos); yPos += 5; }
    doc.text(`${address.city}, ${address.state}${address.zip ? ` - ${address.zip}` : ''}`, x, yPos); yPos += 5;
    doc.text(address.country, x, yPos); yPos += 7;

    if (contact.email) { doc.text(`Email: ${contact.email}`, x, yPos); yPos += 5; }
    if (contact.phone) { doc.text(`Phone: ${contact.phone}`, x, yPos); yPos += 5; }
    if (contact.gst) { doc.text(`GSTIN: ${contact.gst || '-'}`, x, yPos); }
    return yPos;
};


// =================================================================================
// Invoice PDF Generation
// =================================================================================
const generateInvoiceDoc = (doc: jsPDF, sale: Sale, customers: Customer[], companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    
    const pageWidth = doc.internal.pageSize.getWidth();

    const customer = customers.find(c => c.id === sale.customerId);
    let lastY = 45;

    if (customer) {
        const billingContact = { email: customer.email, phone: customer.phone, gst: sale.customerGstNumber || customer.gstNumber };
        const addressEndY = addAddressBlock(doc, 'Bill To:', sale.customerName, sale.billingAddress, billingContact, 14, lastY);
        lastY = Math.max(lastY, addressEndY);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString('en-IN')}`, pageWidth - 14, 47, { align: 'right' });
    doc.text(`Invoice #: ${sale.invoiceSequence}`, pageWidth - 14, 52, { align: 'right' });
    
    doc.line(14, lastY + 5, pageWidth - 14, lastY + 5);
    lastY += 10;

    const isGstSale = sale.saleType === 'GST';
    const head = isGstSale 
        ? [['Sr.', 'Description', 'SKU', 'HSN', 'GST %', 'Qty', 'Rate', 'Total']] 
        : [['Sr.', 'Description', 'SKU', 'Qty', 'Rate', 'Total']];
    
    const body = sale.items.map((item, index) => {
        const desc = `${item.productName}${item.brandName ? ` (${item.brandName})` : ''}`;
        return isGstSale 
        ? [String(index + 1), desc, item.sku || 'N/A', String(item.hsnCode || ''), `${item.gstRate}%`, String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)]
        : [String(index + 1), desc, item.sku || 'N/A', String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)]
    });

    const footerStyles = { halign: 'right' as const };
    const totalFooterStyles = { ...footerStyles, fontStyle: 'bold' as const, fontSize: 11 };
    
    const summaryData = [
        [{ content: 'Subtotal', styles: footerStyles }, { content: formatCurrency(sale.subTotal), styles: footerStyles }],
    ];

    if ((sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0) > 0) {
        summaryData.push([{ content: 'Total Discount', styles: footerStyles }, { content: `-${formatCurrency((sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0))}`, styles: footerStyles }]);
    }

    if (isGstSale) {
        if (sale.cgstAmount > 0) summaryData.push([{ content: 'CGST', styles: footerStyles }, { content: formatCurrency(sale.cgstAmount), styles: footerStyles }]);
        if (sale.sgstAmount > 0) summaryData.push([{ content: 'SGST', styles: footerStyles }, { content: formatCurrency(sale.sgstAmount), styles: footerStyles }]);
        if (sale.igstAmount > 0) summaryData.push([{ content: 'IGST', styles: footerStyles }, { content: formatCurrency(sale.igstAmount), styles: footerStyles }]);
    }

    const roundedTotal = Math.round(sale.totalAmount);
    const roundOff = roundedTotal - sale.totalAmount;
    if (roundOff !== 0) summaryData.push([{ content: 'Round Off', styles: footerStyles }, { content: formatCurrency(roundOff), styles: footerStyles }]);
    
    summaryData.push([{ content: 'Grand Total', styles: totalFooterStyles }, { content: formatCurrency(roundedTotal), styles: totalFooterStyles }]);

    (doc as any).autoTable({
        startY: lastY, head, body, theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        columnStyles: { 
            0: { cellWidth: 10 }, 
            2: { cellWidth: 25 },
            4: { halign: 'right', cellWidth: 20 }, 
            5: { halign: 'right', cellWidth: 20 }, 
            6: { halign: 'right', cellWidth: 30 }, 
            7: { halign: 'right', cellWidth: 35 } 
        },
        foot: summaryData.map(row => ([{ ...row[0], colSpan: isGstSale ? 7 : 5 }, row[1]])),
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9).setFont('helvetica', 'italic').text(`Amount in Words: ${numberToWordsInr(roundedTotal)}`, 14, finalY);
    
    if (companyDetails.invoiceTerms) {
        finalY += 15;
        doc.setFontSize(10).setFont('helvetica', 'bold').text('Terms & Conditions:', 14, finalY);
        doc.setFontSize(8).setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(companyDetails.invoiceTerms, pageWidth - 28);
        doc.text(termsLines, 14, finalY + 5);
    }

    return doc;
};


// =================================================================================
// PO PDF Generation
// =================================================================================
const generatePurchaseOrderDoc = (doc: jsPDF, po: PurchaseOrder, vendors: Vendor[], companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(16).setFont('helvetica', 'bold').text('PURCHASE ORDER', pageWidth / 2, 45, { align: 'center' });
    
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`PO #: ${po.purchaseOrderNumber}`, 14, 55);
    doc.text(`Date: ${new Date(po.orderDate).toLocaleDateString('en-IN')}`, pageWidth - 14, 55, { align: 'right' });

    const vendor = vendors.find(v => v.id === po.vendorId);
    let lastY = 65;
    if (vendor && vendor.addresses[0]) {
        lastY = addAddressBlock(doc, 'Vendor:', po.vendorName, vendor.addresses[0], { email: vendor.email, phone: vendor.phone, gst: vendor.gstNumber }, 14, 65);
    }

    const head = [['Sr.', 'Description', 'SKU', 'HSN', 'GST %', 'Qty', 'Unit Cost', 'Total']];
    const body = po.items.map((item, i) => [String(i+1), item.productName, item.sku || 'N/A', item.hsnCode || '-', `${item.gstRate}%`, String(item.quantity), formatCurrency(item.unitCost), formatCurrency(item.totalCost)]);

    (doc as any).autoTable({
        startY: lastY + 10, head, body, theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: { 
            2: { cellWidth: 30 },
            4: { halign: 'right' }, 
            5: { halign: 'right' }, 
            6: { halign: 'right' }, 
            7: { halign: 'right' } 
        },
        foot: [[{ content: 'Total Amount', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(po.totalAmount), styles: { halign: 'right', fontStyle: 'bold' } }]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
    });

    return doc;
}

// =================================================================================
// Quotation PDF Generation
// =================================================================================
const generateQuotationDoc = (doc: jsPDF, quotation: Quotation, customers: Customer[], companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(16).setFont('helvetica', 'bold').text('QUOTATION', pageWidth / 2, 45, { align: 'center' });
    
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Quote #: ${quotation.quotationNumber}`, 14, 55);
    doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`, pageWidth - 14, 55, { align: 'right' });

    const customer = customers.find(c => c.id === quotation.customerId);
    let lastY = 65;
    if (customer) {
        lastY = addAddressBlock(doc, 'Proposal for:', quotation.customerName, quotation.billingAddress, { email: customer.email, phone: customer.phone }, 14, 65);
    }

    const head = [['Description', 'SKU', 'HSN', 'GST %', 'Qty', 'Price', 'Total']];
    const body = quotation.items.map(item => [item.productName, item.sku || 'N/A', item.hsnCode || '-', `${item.gstRate}%`, String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)]);

    (doc as any).autoTable({
        startY: lastY + 10, head, body, theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: { 
            1: { cellWidth: 30 },
            3: { halign: 'right' }, 
            4: { halign: 'right' }, 
            5: { halign: 'right' }, 
            6: { halign: 'right' } 
        },
        foot: [[{ content: 'Grand Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(quotation.totalAmount), styles: { halign: 'right', fontStyle: 'bold' } }]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
    });

    return doc;
}

// =================================================================================
// Enquiry PDF Generation
// =================================================================================
const generateEnquiryDoc = (doc: jsPDF, enquiry: Enquiry, companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(16).setFont('helvetica', 'bold').text('ENQUIRY SLIP', pageWidth / 2, 45, { align: 'center' });
    
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Enquiry #: ${enquiry.enquiryNumber}`, 14, 55);
    doc.text(`Date: ${new Date(enquiry.date).toLocaleDateString('en-IN')}`, pageWidth - 14, 55, { align: 'right' });

    doc.setFont('helvetica', 'bold').text('Customer Name:', 14, 65);
    doc.setFont('helvetica', 'normal').text(enquiry.customerName || 'N/A', 45, 65);

    doc.setFont('helvetica', 'bold').text('Requirement Details:', 14, 75);
    const enquiryLines = doc.splitTextToSize(enquiry.enquiry, pageWidth - 28);
    doc.setFont('helvetica', 'normal').text(enquiryLines, 14, 80);

    if (enquiry.items && enquiry.items.length > 0) {
        const head = [['Product Interested', 'SKU', 'GST %', 'Quantity', 'Approx. Value']];
        const body = enquiry.items.map(item => [item.productName, item.sku || 'N/A', `${item.gstRate}%`, String(item.quantity), formatCurrency(item.unitPrice)]);
        (doc as any).autoTable({
            startY: doc.getTextDimensions(enquiryLines).h + 85, head, body, theme: 'grid',
            headStyles: { fillColor: [100, 100, 100] },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
    }

    return doc;
}

// =================================================================================
// Public Actions
// =================================================================================

export const downloadInvoice = (sale: Sale, customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    generateInvoiceDoc(doc, sale, customers, companyDetails).save(`invoice-${sale.invoiceSequence}.pdf`);
};

export const downloadPurchaseOrder = (po: PurchaseOrder, vendors: Vendor[], companyDetails: Company) => {
    const doc = new jsPDF();
    generatePurchaseOrderDoc(doc, po, vendors, companyDetails).save(`po-${po.purchaseOrderNumber}.pdf`);
};

export const downloadQuotation = (quotation: Quotation, customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    generateQuotationDoc(doc, quotation, customers, companyDetails).save(`quotation-${quotation.quotationNumber}.pdf`);
}

export const downloadEnquiry = (enquiry: Enquiry, companyDetails: Company) => {
    const doc = new jsPDF();
    generateEnquiryDoc(doc, enquiry, companyDetails).save(`enquiry-${enquiry.enquiryNumber}.pdf`);
}

export const downloadBulkInvoices = (sales: Sale[], customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    sales.forEach((sale, index) => {
        generateInvoiceDoc(doc, sale, customers, companyDetails);
        if (index < sales.length - 1) doc.addPage();
    });
    doc.save(`invoices-bulk-${Date.now()}.pdf`);
};

export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
    saveAs(blob, `${fileName}.xlsx`);
};

export const downloadReturnSlip = (saleReturn: SaleReturn, customers: Customer[], stores: Store[], companyDetails: Company) => {
    const doc = new jsPDF();
    doc.text(`Return Slip ${saleReturn.returnSequence}`, 14, 20);
    doc.save(`return-${saleReturn.returnSequence}.pdf`);
};

export const downloadGenericReportPdf = (title: string, headers: string[][], data: any[][], fileName: string) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.text(title, 14, 15);
  (doc as any).autoTable({ head: headers, body: data, startY: 20, theme: 'grid' });
  doc.save(`${fileName}.pdf`);
};

export const generateShareText = (docType: string, number: string, name: string, companyName: string, link: string) => {
    return `Hi ${name},\n\nPlease find your ${docType} #${number} from ${companyName} here:\n${link}\n\nThank you!`;
}

export const generateInvoiceEmailBody = (sale: Sale, companyDetails: Company) => "Invoice Details Attached";
export const generatePurchaseOrderEmailBody = (po: PurchaseOrder, companyDetails: Company) => "PO Details Attached";
export const generateQuotationEmailBody = (quotation: Quotation, companyDetails: Company) => "Quotation Details Attached";
export const generateReturnSlipEmailBody = (saleReturn: SaleReturn, companyDetails: Company) => "Return Details Attached";
export const generatePendingInvoicesEmailBody = (customer: Customer, pending: Sale[], companyDetails: Company) => "Pending Invoice List Attached";
export const generateBirthdayGreetingEmailBody = (name: string, company: Company) => `Happy Birthday ${name}`;
export const generateAnniversaryGreetingEmailBody = (name: string, company: Company) => `Happy Anniversary ${name}`;
export const downloadBulkPurchaseOrders = (pos: any[], vendors: any[], company: any) => {};
export const exportFullBackup = (data: any, name: string) => {};
