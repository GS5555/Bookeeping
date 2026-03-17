
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Sale, PurchaseOrder, Address, SaleReturn, Product, Customer, Vendor, Expense, Coupon, Store, StockTransfer, InventoryItem, Company, Quotation } from './types';
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
    if (companyDetails.address) doc.text(companyDetails.address, pageWidth / 2, 26, { align: 'center' });
    let contactLine = [
        companyDetails.gstin ? `GSTIN: ${companyDetails.gstin}` : null,
        companyDetails.email ? `Email: ${companyDetails.email}` : null,
        companyDetails.website ? `Web: ${companyDetails.website}` : null,
        companyDetails.phone ? `Phone: ${companyDetails.phone}` : null,
    ].filter(Boolean).join(' | ');
    doc.text(contactLine, pageWidth / 2, 32, { align: 'center' });
    doc.line(14, 36, pageWidth - 14, 36);
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
    let lastY = 42;

    if (customer) {
        const billingContact = { email: customer.email, phone: customer.phone, gst: customer.gstNumber };
        const addressEndY = addAddressBlock(doc, 'Bill To:', sale.customerName, sale.billingAddress, billingContact, 14, lastY);
        lastY = Math.max(lastY, addressEndY);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Date: ${new Date(sale.saleDate).toLocaleDateString('en-IN')}`, pageWidth - 14, 47, { align: 'right' });
    doc.text(`Tax Invoice #: ${sale.invoiceSequence}`, pageWidth - 14, 52, { align: 'right' });
    
    if (sale.shippingAddress && sale.shippingAddress.id !== sale.billingAddress.id) {
        lastY = addAddressBlock(doc, 'Ship To:', sale.customerName, sale.shippingAddress, {}, 14, lastY + 5);
    }
    
    doc.line(14, lastY + 3, 196, lastY + 3);
    
    if (sale.courierCompany || sale.trackingNumber) {
        let shippingY = lastY + 6;
        doc.setFontSize(9).setFont('helvetica', 'bold');
        if (sale.courierCompany) {
            doc.text(`Shipped Via: ${sale.courierCompany}`, 14, shippingY);
            if (sale.trackingNumber) {
                doc.setFont('helvetica', 'normal').text(`AWB: ${sale.trackingNumber}`, 60, shippingY);
            }
            shippingY += 5;
        }
        if (sale.trackingLink) {
            doc.setFont('helvetica', 'bold').text(`Track:`, 14, shippingY);
            doc.setFont('helvetica', 'normal').textWithLink(sale.trackingLink, 25, shippingY, { url: sale.trackingLink });
            shippingY += 5;
        }
        lastY = shippingY;
        doc.line(14, lastY, 196, lastY);
    }


    const isGstSale = sale.saleType === 'GST';
    const head = isGstSale 
        ? [['Sr. No.', 'Brand', 'Item', 'HSN', 'GST Rate', 'Qty', 'Unit Price', 'Total']] 
        : [['Sr. No.', 'Brand', 'Item', 'Qty', 'Unit Price', 'Total']];
    
    const body = sale.items.map((item, index) => {
        const itemDescription = `${item.productName}${item.color1 ? ` (${item.color1}${item.color2 ? ` / ${item.color2}` : ''})` : ''}`;
        
        return isGstSale 
        ? [
            String(index + 1),
            item.brandName || 'N/A',
            itemDescription,
            String(item.hsnCode), `${String(item.gstRate)}%`, String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)
          ]
        : [
            String(index + 1),
            item.brandName || 'N/A',
            itemDescription,
            String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)
          ]
    });

    const footerStyles = { halign: 'right' };
    const totalFooterStyles = { ...footerStyles, fontStyle: 'bold', fontSize: 11 };
    
    const summaryData = [];
    summaryData.push([{ content: 'Subtotal', styles: footerStyles }, { content: formatCurrency(sale.subTotal), styles: footerStyles}]);

    const totalDiscount = (sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0);
    if(totalDiscount > 0) {
        summaryData.push([{ content: 'Discount', styles: {...footerStyles, textColor: [200, 0, 0]} }, { content: `-${formatCurrency(totalDiscount)}`, styles: {...footerStyles, textColor: [200, 0, 0]} }]);
    }

    if (isGstSale) {
        summaryData.push([{ content: 'CGST', styles: footerStyles }, { content: formatCurrency(sale.cgstAmount), styles: footerStyles }]);
        summaryData.push([{ content: 'SGST', styles: footerStyles }, { content: formatCurrency(sale.sgstAmount), styles: footerStyles }]);
        summaryData.push([{ content: 'IGST', styles: footerStyles }, { content: formatCurrency(sale.igstAmount), styles: footerStyles }]);
    }

    const roundedTotal = Math.round(sale.totalAmount);
    const roundOffAmount = roundedTotal - sale.totalAmount;
    
    if (roundOffAmount !== 0) {
        summaryData.push([{ content: 'ROUND OFF', styles: footerStyles }, { content: formatCurrency(roundOffAmount), styles: footerStyles }]);
    }

    summaryData.push([{ content: 'Total', styles: totalFooterStyles }, { content: formatCurrency(roundedTotal), styles: totalFooterStyles }]);
    
    const colSpan = isGstSale ? 7 : 5;
    const mappedFoot = summaryData.map(row => ([{...row[0], colSpan}, row[1]]));
    
    const amountInWords = numberToWordsInr(roundedTotal);
    mappedFoot.push([{ 
        content: `Amount in Words: ${amountInWords}`, 
        colSpan: isGstSale ? 8 : 6, 
        styles: { fontStyle: 'italic', fontSize: 9, halign: 'left' } 
    }]);

    (doc as any).autoTable({
        startY: lastY + 5, head, body, theme: 'grid',
        didDrawCell: (data: any) => {
            if (data.section === 'body' && data.row.index === data.table.body.length - 1) {
                doc.setDrawColor(0, 0, 0); // Set line color to black for the final border
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 
            3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } 
        },
        foot: mappedFoot,
        footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], lineWidth: 0.1, lineColor: [0, 0, 0] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    if (companyDetails.invoiceTerms) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions', 14, finalY);
        finalY += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const termsWithBullets = companyDetails.invoiceTerms.split('\n').map(term => `• ${term}`);
        const termsLines = doc.splitTextToSize(termsWithBullets.join('\n'), 182);
        doc.text(termsLines, 14, finalY);
    }

    return doc;
};


// =================================================================================
// PO PDF Generation
// =================================================================================
const generatePurchaseOrderDoc = (doc: jsPDF, po: PurchaseOrder, vendors: Vendor[], companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    doc.setFontSize(22).setFont('helvetica', 'bold').text(`Purchase Order`, 14, 48);
    
    const poNumberText = `#${po.purchaseOrderNumber}`;
    const dateText = `Date: ${new Date(po.orderDate).toLocaleDateString('en-IN')}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(12).setFont('helvetica', 'normal');
    doc.text(poNumberText, 14, 54);
    doc.text(dateText, pageWidth - 14, 54, { align: 'right'});

    const vendor = vendors.find(v => v.id === po.vendorId);
    let lastY = 70;
    if(vendor) {
        const vendorContact = { email: vendor.email, phone: vendor.phone, gst: vendor.gstNumber };
        const vendorAddress = vendor.addresses.find(a => a.isPrimary);
        if(vendorAddress) lastY = addAddressBlock(doc, 'Vendor:', po.vendorName, vendorAddress, vendorContact, 14, 70);
    }
    doc.line(14, lastY, 196, lastY);
    lastY += 2;
    
    if (po.courierCompany || po.trackingNumber) {
        doc.setFontSize(9).setFont('helvetica', 'bold');
        let shippingY = lastY;
        if (po.courierCompany) {
            doc.text(`Shipped Via: ${po.courierCompany}`, 14, shippingY);
            if (po.trackingNumber) {
                doc.setFont('helvetica', 'normal').text(`AWB: ${po.trackingNumber}`, 60, shippingY);
            }
            shippingY += 5;
        }
        if (po.trackingLink) {
            doc.setFont('helvetica', 'bold').text(`Track:`, 14, shippingY);
            doc.setFont('helvetica', 'normal').textWithLink(po.trackingLink, 25, shippingY, { url: po.trackingLink });
            shippingY += 5;
        }
        lastY = shippingY;
        doc.line(14, lastY, 196, lastY);
    }

    const head = [['Item', 'HSN', 'GST', 'Qty', 'Unit Cost', 'Total']];
    const body = po.items.map(item => [
        `${item.productName}${item.color1 ? ` (${item.color1}${item.color2 ? ` / ${item.color2}` : ''})` : ''}`,
        String(item.hsnCode), `${String(item.gstRate)}%`, String(item.quantity), formatCurrency(item.unitCost), formatCurrency(item.totalCost)
    ]);
    
    const footerStyles = { halign: 'right' };
    const totalFooterStyles = { ...footerStyles, fontStyle: 'bold', fontSize: 11 };
    
    const summaryData = [
        [{ content: 'Subtotal', styles: footerStyles }, { content: formatCurrency(po.subTotal), styles: footerStyles }],
        [{ content: 'CGST', styles: footerStyles }, { content: formatCurrency(po.cgstAmount), styles: footerStyles }],
        [{ content: 'SGST', styles: footerStyles }, { content: formatCurrency(po.sgstAmount), styles: footerStyles }],
        [{ content: 'IGST', styles: footerStyles }, { content: formatCurrency(po.igstAmount), styles: footerStyles }],
    ];
    
    const roundedTotal = Math.round(po.totalAmount);
    const roundOffAmount = roundedTotal - po.totalAmount;
    if (roundOffAmount !== 0) {
        summaryData.push([{ content: 'ROUND OFF', styles: footerStyles }, { content: formatCurrency(roundOffAmount), styles: footerStyles }]);
    }
    summaryData.push([{ content: 'Total', styles: totalFooterStyles }, { content: formatCurrency(roundedTotal), styles: totalFooterStyles }]);

    const mappedFoot = summaryData.map(row => ([{ ...row[0], colSpan: 5 }, row[1]]));
    
    const amountInWords = numberToWordsInr(roundedTotal);
    mappedFoot.push([{ 
        content: `Amount in Words: ${amountInWords}`, 
        colSpan: 6, 
        styles: { fontStyle: 'italic', fontSize: 9, halign: 'left' } 
    }]);

    (doc as any).autoTable({
        startY: lastY + 2, head, body, theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        foot: mappedFoot,
        footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], lineWidth: 0.1, lineColor: [0, 0, 0] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (po.comments) {
        doc.setFontSize(9).setFont('helvetica', 'bold').text('Comments', 14, finalY);
        finalY += 5;
        doc.setFontSize(8).setFont('helvetica', 'normal');
        const commentLines = doc.splitTextToSize(po.comments, 182);
        doc.text(commentLines, 14, finalY);
    }
    return doc;
}

// =================================================================================
// Quotation PDF Generation
// =================================================================================
const generateQuotationDoc = (doc: jsPDF, quotation: Quotation, customers: Customer[], companyDetails: Company): jsPDF => {
    addCompanyHeader(doc, companyDetails);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Quotation #${quotation.quotationNumber}`, 14, 48);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(quotation.date).toLocaleDateString('en-IN')}`, 14, 54);
    doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`, 14, 59);
    doc.line(14, 63, 196, 63);

    const customer = customers.find(c => c.id === quotation.customerId);
    let lastY = 70;
    if(customer) {
        const billingContact = { email: customer.email, phone: customer.phone, gst: customer.gstNumber };
        lastY = addAddressBlock(doc, 'Bill To:', quotation.customerName, quotation.billingAddress, billingContact, 14, 70);
    }
    doc.line(14, lastY, 196, lastY);
    lastY += 2;

    const head = [['Item', 'HSN', 'GST', 'Qty', 'Unit Price', 'Total']];
    const body = quotation.items.map(item => [
        item.productName,
        item.hsnCode, `${item.gstRate}%`, item.quantity, formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)
    ]);
    const footerStyles = { halign: 'right' };
    const totalFooterStyles = { ...footerStyles, fontStyle: 'bold', fontSize: 11 };
    
    const summaryData = [
        [{ content: 'Subtotal', styles: footerStyles }, { content: formatCurrency(quotation.subTotal), styles: footerStyles }],
        [{ content: 'GST', styles: footerStyles }, { content: formatCurrency(quotation.gstAmount), styles: footerStyles }],
    ];
    
    const roundedTotal = Math.round(quotation.totalAmount);
    const roundOffAmount = roundedTotal - quotation.totalAmount;
    if (roundOffAmount !== 0) {
        summaryData.push([{ content: 'ROUND OFF', styles: footerStyles }, { content: formatCurrency(roundOffAmount), styles: footerStyles }]);
    }
    summaryData.push([{ content: 'Total', styles: totalFooterStyles }, { content: formatCurrency(roundedTotal), styles: totalFooterStyles }]);
    
    const mappedFoot = summaryData.map(row => ([{...row[0], colSpan: 5 }, row[1]]));
    const amountInWords = numberToWordsInr(roundedTotal);
    mappedFoot.push([{ 
        content: `Amount in Words: ${amountInWords}`, 
        colSpan: 6, 
        styles: { fontStyle: 'italic', fontSize: 9, halign: 'left' } 
    }]);

    (doc as any).autoTable({
        startY: lastY + 2, head, body, theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        foot: mappedFoot,
        footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], lineWidth: 0.1, lineColor: [0, 0, 0] }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    if (quotation.termsAndConditions) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions', 14, finalY);
        finalY += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const termsWithBullets = quotation.termsAndConditions.split('\n').map(term => `• ${term}`);
        const termsLines = doc.splitTextToSize(termsWithBullets.join('\n'), 182);
        doc.text(termsLines, 14, finalY);
    }
    
    return doc;
}


// =================================================================================
// Return Slip PDF Generation
// =================================================================================
const generateReturnSlipDoc = (saleReturn: SaleReturn, customers: Customer[], stores: Store[], companyDetails: Company): jsPDF => {
    const doc = new jsPDF();
    addCompanyHeader(doc, companyDetails);
    const store = stores.find(s => s.id === saleReturn.storeId);
    doc.setFontSize(22).setFont('helvetica', 'bold').text(`Return Slip #${saleReturn.returnSequence}`, 14, 48);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Return Date: ${new Date(saleReturn.returnDate).toLocaleDateString('en-IN')}`, 14, 54);
    doc.text(`Original Invoice: #${saleReturn.originalInvoiceSequence}`, 14, 59);
    if (store) doc.text(`Return Processed At: ${store.name}`, 14, 64);
    doc.line(14, 68, 196, 68);
    
    const customer = customers.find(c => c.id === saleReturn.customerId);
    let lastY = 75;
    if (customer) {
        const customerContact = { email: customer.email, phone: customer.phone, gst: customer.gstNumber };
        const customerAddress = customer.addresses.find(a => a.isPrimary);
        if (customerAddress) lastY = addAddressBlock(doc, 'Customer:', saleReturn.customerName, customerAddress, customerContact, 14, 75);
    }
    doc.line(14, lastY, 196, lastY);

    const head = [['Item', 'Sellable', 'Unsellable', 'Price', 'Refund', 'Reason']];
    const body = saleReturn.items.map(item => [
        String(item.productName), String(item.sellableQuantity), String(item.unsellableQuantity),
        formatCurrency(item.unitPrice), formatCurrency(item.totalRefund), String(item.reason || '')
    ]);
    
    const footerStyles = { halign: 'right' };
    const totalFooterStyles = { ...footerStyles, fontStyle: 'bold', fontSize: 11 };
    

    const summaryData = [
        [{ content: 'Subtotal Refund', styles: footerStyles }, { content: formatCurrency(saleReturn.subTotalRefund), styles: footerStyles }],
        [{ content: 'CGST Refund', styles: footerStyles }, { content: formatCurrency(saleReturn.cgstRefund), styles: footerStyles }],
        [{ content: 'SGST Refund', styles: footerStyles }, { content: formatCurrency(saleReturn.sgstRefund), styles: footerStyles }],
        [{ content: 'IGST Refund', styles: footerStyles }, { content: formatCurrency(saleReturn.igstRefund), styles: footerStyles }],
    ];
    
    const roundedTotal = Math.round(saleReturn.totalRefundAmount);
    const roundOffAmount = roundedTotal - saleReturn.totalRefundAmount;
    if (roundOffAmount !== 0) {
        summaryData.push([{ content: 'ROUND OFF', styles: footerStyles }, { content: formatCurrency(roundOffAmount), styles: footerStyles }]);
    }
    summaryData.push([{ content: 'Total Refund Amount', styles: totalFooterStyles }, { content: formatCurrency(roundedTotal), styles: totalFooterStyles }]);
    
    const mappedFoot = summaryData.map(row => ([{ ...row[0], colSpan: 5 }, row[1]]));

    const amountInWords = numberToWordsInr(roundedTotal);
    mappedFoot.push([{ 
        content: `Amount in Words: ${amountInWords}`, 
        colSpan: 6, 
        styles: { fontStyle: 'italic', fontSize: 9, halign: 'left' } 
    }]);
    
    (doc as any).autoTable({
        startY: lastY + 2, head, body, theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        foot: mappedFoot,
        footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], lineWidth: 0.1, lineColor: [0, 0, 0] }
    });
    return doc;
}


// =================================================================================
// Public Actions
// =================================================================================

export const getInvoicePdfBlob = (sale: Sale, customers: Customer[], companyDetails: Company): Blob => {
    const doc = new jsPDF();
    generateInvoiceDoc(doc, sale, customers, companyDetails);
    return doc.output('blob');
};

export const getPurchaseOrderPdfBlob = (po: PurchaseOrder, vendors: Vendor[], companyDetails: Company): Blob => {
    const doc = new jsPDF();
    generatePurchaseOrderDoc(doc, po, vendors, companyDetails);
    return doc.output('blob');
};

export const getQuotationPdfBlob = (quotation: Quotation, customers: Customer[], companyDetails: Company): Blob => {
    const doc = new jsPDF();
    generateQuotationDoc(doc, quotation, customers, companyDetails);
    return doc.output('blob');
};

export const downloadInvoice = (sale: Sale, customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    generateInvoiceDoc(doc, sale, customers, companyDetails).save(`invoice-${sale.invoiceSequence}.pdf`);
};

export const downloadBulkInvoices = (sales: Sale[], customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    sales.forEach((sale, index) => {
        generateInvoiceDoc(doc, sale, customers, companyDetails);
        if (index < sales.length - 1) {
            doc.addPage();
        }
    });
    doc.save(`invoices-bulk-${Date.now()}.pdf`);
};

export const printBulkInvoices = (sales: Sale[], customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    sales.forEach((sale, index) => {
        generateInvoiceDoc(doc, sale, customers, companyDetails);
        if (index < sales.length - 1) {
            doc.addPage();
        }
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
};


export const downloadPurchaseOrder = (po: PurchaseOrder, vendors: Vendor[], companyDetails: Company) => {
     const doc = new jsPDF();
    generatePurchaseOrderDoc(doc, po, vendors, companyDetails).save(`po-${po.purchaseOrderNumber}.pdf`);
};

export const downloadBulkPurchaseOrders = (pos: PurchaseOrder[], vendors: Vendor[], companyDetails: Company) => {
    const doc = new jsPDF();
    pos.forEach((po, index) => {
        generatePurchaseOrderDoc(doc, po, vendors, companyDetails);
        if (index < pos.length - 1) {
            doc.addPage();
        }
    });
    doc.save(`purchase-orders-bulk-${Date.now()}.pdf`);
}

export const downloadReturnSlip = (saleReturn: SaleReturn, customers: Customer[], stores: Store[], companyDetails: Company) => generateReturnSlipDoc(saleReturn, customers, stores, companyDetails).save(`return-${saleReturn.returnSequence}.pdf`);

export const downloadQuotation = (quotation: Quotation, customers: Customer[], companyDetails: Company) => {
    const doc = new jsPDF();
    generateQuotationDoc(doc, quotation, customers, companyDetails).save(`quotation-${quotation.quotationNumber}.pdf`);
}

export const printContent = (doc: jsPDF) => doc.autoPrint();

// =================================================================================
// Excel / Backup Actions
// =================================================================================

export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
    saveAs(blob, `${fileName}.xlsx`);
};

export const exportWithDataValidation = (
  mainSheetData: any[],
  mainSheetName: string,
  validations: Record<string, string[]>,
  fileName: string
) => {
    const wb = XLSX.utils.book_new();

    // 1. Main Data Sheet
    const mainWs = XLSX.utils.json_to_sheet(mainSheetData);
    XLSX.utils.book_append_sheet(wb, mainWs, mainSheetName);

    // 2. Hidden Sheet for Validation Lists
    const validationSheet = XLSX.utils.aoa_to_sheet([]);
    let valColIndex = 0;
    
    const headers: string[] = mainSheetData.length > 0 ? Object.keys(mainSheetData[0]) : [];

    Object.entries(validations).forEach(([columnName, values]) => {
        if (values.length === 0) return;

        const mainColIndex = headers.indexOf(columnName);
        if (mainColIndex !== -1) {
            // Write validation values to the hidden sheet
            XLSX.utils.sheet_add_aoa(validationSheet, [values], { origin: { r: 0, c: valColIndex } });

            // Define the range for the dropdown in the hidden sheet
            const validationRange = `'ValidationData'!$${XLSX.utils.encode_col(valColIndex)}$1:$${XLSX.utils.encode_col(valColIndex)}${values.length}`;
            
            // Apply data validation to the target column in the main sheet
            if (!mainWs['!dataValidation']) mainWs['!dataValidation'] = [];
            
            const validationRule = {
                sqref: XLSX.utils.encode_range({ s: { c: mainColIndex, r: 1 }, e: { c: mainColIndex, r: 1048575 } }), // Apply to column from row 2 downwards
                validation: {
                    type: "list",
                    allowBlank: true,
                    showDropDown: true,
                    formula1: validationRange
                }
            };
            mainWs['!dataValidation'].push(validationRule);
            
            valColIndex++;
        }
    });

    // Add the hidden validation sheet to the workbook
    if (valColIndex > 0) {
        XLSX.utils.book_append_sheet(wb, validationSheet, 'ValidationData');
        // Hide the sheet
        if(!wb.Workbook) wb.Workbook = { Sheets: [] };
        const sheetState = { state: "hidden" };
        const sheetIndex = wb.SheetNames.indexOf('ValidationData');
        if (wb.Workbook.Sheets) {
            (wb.Workbook.Sheets[sheetIndex] as any) = sheetState;
        } else {
             wb.Workbook.Sheets = [sheetState as any];
        }
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `${fileName}.xlsx`);
};


export const exportFullBackup = (data: { [key: string]: any[] }, fileName: string) => {
    const workbook = XLSX.utils.book_new();

    for (const [sheetName, sheetData] of Object.entries(data)) {
        if (sheetData.length === 0) continue;
        
        let flatData;
        if (sheetName === 'Customers' || sheetName === 'Vendors') {
            flatData = sheetData.map(item => {
                const flatItem: any = { ...item };
                const primaryAddress = item.addresses?.find((a: Address) => a.isPrimary) || item.addresses?.[0];
                if (primaryAddress) {
                    flatItem.street = primaryAddress.street;
                    flatItem.city = primaryAddress.city;
                    flatItem.state = primaryAddress.state;
                    flatItem.zip = primaryAddress.zip;
                    flatItem.country = primaryAddress.country;
                }
                delete flatItem.addresses; // Remove the original complex object
                return flatItem;
            });
        } else {
             flatData = sheetData.map(item => {
                const flatItem: any = {};
                for(const key in item) {
                    if (typeof item[key] === 'object' && item[key] !== null && Array.isArray(item[key])) {
                        flatItem[key] = JSON.stringify(item[key]);
                    } else {
                        flatItem[key] = item[key];
                    }
                }
                return flatItem;
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(flatData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
    saveAs(blob, `${fileName}.xlsx`);
}

// =================================================================================
// Generic Report PDF Action
// =================================================================================
export const downloadGenericReportPdf = (title: string, headers: string[][], data: any[][], fileName: string) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.text(title, 14, 15);
  (doc as any).autoTable({
    head: headers,
    body: data,
    startY: 20,
    theme: 'grid'
  });
  doc.save(`${fileName}.pdf`);
};


// =================================================================================
// Email Body & Share Generation
// =================================================================================

export const generateShareText = (docType: string, number: string, name: string, companyName: string, link: string) => {
    return `Hi ${name},\n\nPlease find your ${docType} #${number} from ${companyName} here:\n${link}\n\nThank you!`;
}

export const handleShare = async (title: string, text: string, url: string, files?: File[]) => {
    const shareData: ShareData = { title, text, url, files };
    if (files && navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share(shareData);
        return { success: true };
      } catch (error) {
        console.error('Error sharing files natively:', error);
        return { success: false, fallback: true };
      }
    } else if (navigator.share) { // Fallback to sharing just text/url
        try {
            await navigator.share({ title, text, url });
            return { success: true };
        } catch(error) {
            console.error('Error sharing text/url:', error);
            return { success: false, fallback: true };
        }
    }
    // If no native share support at all
    return { success: false, fallback: true };
};

const generateHtmlEmailTemplate = (title: string, preheader: string, content: string, companyDetails: Company) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f4f4f7; color: #333; }
            .container { max-width: 600px; margin: 20px auto; background-color: #fff; border-radius: 8px; border: 1px solid #e2e2e2; overflow: hidden; }
            .header { background-color: #0d2e4a; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #888; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .totals-table { width: 100%; max-width: 300px; margin-left: auto; margin-top: 20px; }
            .totals-table td { padding: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>${companyDetails.name}</h1></div>
            <div class="content">
                <h2>${title}</h2>
                <p>${preheader}</p>
                ${content}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${companyDetails.name}. All rights reserved.</p>
                ${companyDetails.address ? `<p>${companyDetails.address}</p>` : ''}
            </div>
        </div>
    </body>
    </html>
  `;
}

export const generateInvoiceEmailBody = (sale: Sale, companyDetails: Company): string => {
    const roundedTotal = Math.round(sale.totalAmount);
    const content = `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${sale.items.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.unitPrice)}</td>
                        <td>${formatCurrency(item.totalPrice)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <table class="totals-table">
            <tr><td>Subtotal:</td><td style="text-align: right;">${formatCurrency(sale.subTotal)}</td></tr>
            ${(sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0) > 0 ? `<tr><td>Discount:</td><td style="text-align: right;">-${formatCurrency((sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0))}</td></tr>` : ''}
            ${sale.gstAmount > 0 ? `<tr><td>GST:</td><td style="text-align: right;">${formatCurrency(sale.gstAmount)}</td></tr>` : ''}
            ${Math.round(sale.totalAmount) - sale.totalAmount !== 0 ? `<tr><td>ROUND OFF:</td><td style="text-align: right;">${formatCurrency(Math.round(sale.totalAmount) - sale.totalAmount)}</td></tr>` : ''}
            <tr><td style="font-weight: bold;">Total:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(roundedTotal)}</td></tr>
             <tr><td style="font-weight: bold;">Amount Paid:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(sale.amountPaid || 0)}</td></tr>
             ${(sale.balanceAmount || 0) > 0 ? `<tr><td style="font-weight: bold; color: #d9534f;">Balance Due:</td><td style="text-align: right; font-weight: bold; color: #d9534f;">${formatCurrency(sale.balanceAmount || 0)}</td></tr>` : ''}
        </table>
    `;
    return generateHtmlEmailTemplate(
        `Tax Invoice #${sale.invoiceSequence}`,
        `Hi ${sale.customerName}, thank you for your purchase from ${companyDetails.name}. Here are the details of your invoice.`,
        content,
        companyDetails
    );
}

export const generatePurchaseOrderEmailBody = (po: PurchaseOrder, companyDetails: Company): string => {
    const roundedTotal = Math.round(po.totalAmount);
    const content = `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${po.items.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.unitCost)}</td>
                        <td>${formatCurrency(item.totalCost)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <table class="totals-table">
            <tr><td>Subtotal:</td><td style="text-align: right;">${formatCurrency(po.subTotal)}</td></tr>
            <tr><td>GST:</td><td style="text-align: right;">${formatCurrency(po.gstAmount)}</td></tr>
             ${Math.round(po.totalAmount) - po.totalAmount !== 0 ? `<tr><td>ROUND OFF:</td><td style="text-align: right;">${formatCurrency(Math.round(po.totalAmount) - po.totalAmount)}</td></tr>` : ''}
            <tr><td style="font-weight: bold;">Total:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(roundedTotal)}</td></tr>
        </table>
    `;
     return generateHtmlEmailTemplate(
        `Purchase Order #${po.purchaseOrderNumber}`,
        `Hi ${po.vendorName}, please find our purchase order attached.`,
        content,
        companyDetails
    );
}

export const generateReturnSlipEmailBody = (saleReturn: SaleReturn, companyDetails: Company): string => {
    const roundedTotal = Math.round(saleReturn.totalRefundAmount);
     const content = `
        <p>Original Invoice: #${saleReturn.originalInvoiceSequence}</p>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty Returned</th>
                    <th>Total Refund</th>
                </tr>
            </thead>
            <tbody>
                ${saleReturn.items.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.sellableQuantity + item.unsellableQuantity}</td>
                        <td>${formatCurrency(item.totalRefund)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
         <table class="totals-table">
            <tr><td style="font-weight: bold;">Total Refund:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(roundedTotal)}</td></tr>
        </table>
    `;
    return generateHtmlEmailTemplate(
        `Return Slip #${saleReturn.returnSequence}`,
        `Hi ${saleReturn.customerName}, this is a confirmation for your recent return.`,
        content,
        companyDetails
    );
}

export const generateQuotationEmailBody = (quotation: Quotation, companyDetails: Company): string => {
    const roundedTotal = Math.round(quotation.totalAmount);
    const content = `
        <p>This quotation is valid until ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}.</p>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${quotation.items.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.unitPrice)}</td>
                        <td>${formatCurrency(item.totalPrice)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <table class="totals-table">
            <tr><td>Subtotal:</td><td style="text-align: right;">${formatCurrency(quotation.subTotal)}</td></tr>
            <tr><td>GST:</td><td style="text-align: right;">${formatCurrency(quotation.gstAmount)}</td></tr>
            <tr><td style="font-weight: bold;">Total:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(roundedTotal)}</td></tr>
        </table>
    `;
    return generateHtmlEmailTemplate(
        `Quotation #${quotation.quotationNumber}`,
        `Hi ${quotation.customerName}, as requested, here is your quotation.`,
        content,
        companyDetails
    );
};

export const generatePendingInvoicesEmailBody = (customer: Customer, pendingInvoices: Sale[], companyDetails: Company): string => {
    const totalPendingAmount = pendingInvoices.reduce((acc, inv) => acc + (inv.balanceAmount || inv.totalAmount), 0);
    const roundedTotal = Math.round(totalPendingAmount);

    const content = `
        <p>This is a friendly reminder that you have outstanding invoices with a total balance of <strong>${formatCurrency(roundedTotal)}</strong>.</p>
        <p>Please find the details of the pending invoices below:</p>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                </tr>
            </thead>
            <tbody>
                ${pendingInvoices.map(invoice => `
                    <tr>
                        <td>${invoice.invoiceSequence}</td>
                        <td>${new Date(invoice.saleDate).toLocaleDateString('en-IN')}</td>
                        <td>${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                        <td>${formatCurrency(invoice.balanceAmount || invoice.totalAmount)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <table class="totals-table">
            <tr><td style="font-weight: bold;">Total Outstanding:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(roundedTotal)}</td></tr>
        </table>
        <p>Please arrange for the payment at your earliest convenience. You can view individual invoices by logging into your account.</p>
    `;

    return generateHtmlEmailTemplate(
        `Reminder: Your Outstanding Invoices from ${companyDetails.name}`,
        `Hi ${customer.name}, you have a total outstanding balance of ${formatCurrency(roundedTotal)}.`,
        content,
        companyDetails
    );
};


export const generateBirthdayGreetingEmailBody = (name: string, companyDetails: Company): string => {
    const subject = `Happy Birthday, ${name}!`;
    const body = `Dear ${name},\n\nAll of us at ${companyDetails.name} would like to wish you a very happy birthday!\n\nWe hope you have a wonderful day filled with joy and celebration.\n\nAs a small token of our appreciation, please enjoy a special discount on your next purchase. Use code BDAY15 at checkout for 15% off.\n\nBest wishes,\nThe Team at ${companyDetails.name}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const generateAnniversaryGreetingEmailBody = (name: string, companyDetails: Company): string => {
    const subject = `Happy Anniversary, ${name}!`;
    const body = `Dear ${name},\n\nWarmest wishes on your anniversary from everyone at ${companyDetails.name}!\n\nWe appreciate your continued association with us and hope you have a memorable day.\n\nBest regards,\nThe Team at ${companyDetails.name}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
