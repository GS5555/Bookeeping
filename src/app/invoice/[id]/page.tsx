
'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';
import { numberToWordsInr } from '@/lib/utils';
import { format } from 'date-fns';
import { Address, Sale, Customer, Company } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { downloadInvoice } from '@/lib/actions';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AddressBlock = ({ label, name, address, contact }: { label: string, name: string, address: Address, contact: {email?: string, phone?: string, gst?: string}}) => (
    <div className="space-y-1">
        <div className="font-bold text-gray-900 uppercase text-xs tracking-wider mb-1">{label}</div>
        <div className="text-gray-800">
            <p className="font-bold text-lg">{name}</p>
            <p className="text-sm">{address.street}</p>
            <p className="text-sm">{`${address.city}, ${address.state}${address.zip ? ` - ${address.zip}` : ''}`}</p>
            <p className="text-sm">{address.country}</p>
            <div className="mt-2 text-xs text-gray-600 font-medium">
                {contact.email && <p>Email: {contact.email}</p>}
                {contact.phone && <p>Phone: {contact.phone}</p>}
                {contact.gst && <p className="font-black text-gray-900 mt-1 uppercase">GSTIN: {contact.gst}</p>}
            </div>
        </div>
    </div>
);

const STORE_ID = 'store_main';

export default function InvoicePage() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();
    const isMounted = useIsMounted();

    const saleRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'sales', id as string) : null, [firestore, id]);
    const { data: sale, isLoading: isSaleLoading } = useDoc<Sale>(saleRef);

    const customerRef = useMemoFirebase(() => firestore && sale ? doc(firestore, 'stores', STORE_ID, 'customers', sale.customerId) : null, [firestore, sale]);
    const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

    if (isSaleLoading || isCustomerLoading || isCompanyLoading || !isMounted) {
        return <div className="flex items-center justify-center h-screen bg-white"><p className="animate-pulse font-medium text-lg">Loading TAX INVOICE details...</p></div>;
    }
    
    if (!sale || !companyDetails) {
        return (
            <div className="flex items-center justify-center h-screen bg-white text-center">
                <div className="p-8 border rounded-xl shadow-sm bg-gray-50 max-sm">
                    <h1 className="text-2xl font-bold mb-4">TAX INVOICE Not Found</h1>
                    <Button asChild className="w-full"><Link href="/sales">Back to Sales</Link></Button>
                </div>
            </div>
        );
    }
    
    const isGstSale = sale.saleType === 'GST';
    const termsAndConditions = companyDetails.invoiceTerms?.split('\n') || [];
    const totalAmount = sale.total;
    
    const rawTotal = (sale.subTotal || 0) + (sale.gstAmount || 0) - (sale.couponDiscount || 0) - (sale.manualDiscountAmount || 0);
    const roundOffAmount = sale.roundOffAmount !== undefined ? sale.roundOffAmount : (sale.total - rawTotal);

    return (
        <div className="min-h-screen bg-white p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Button variant="ghost" asChild className="hover:bg-gray-100 font-bold uppercase tracking-widest text-xs">
                    <Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                    <Button variant="outline" onClick={() => window.print()} className="border-gray-300 font-black uppercase text-xs">
                        <Printer className="mr-2 h-4 w-4" /> Print TAX Invoice
                    </Button>
                    <Button onClick={() => downloadInvoice(sale, customer ? [customer] : [], companyDetails)} className="shadow-md font-black uppercase text-xs">
                        <FileDown className="mr-2 h-4 w-4" /> Save as PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white text-black p-6 sm:p-12 border border-gray-200 shadow-none rounded-none w-full max-w-5xl" id="printable-invoice">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-gray-900 pb-8 mb-10">
                    <div className="flex-1">
                        <h1 className="text-4xl font-black text-gray-900 mb-3 uppercase tracking-tight">{companyDetails.name}</h1>
                        <p className="text-sm text-gray-600 max-w-sm whitespace-pre-wrap leading-relaxed">{companyDetails.address}</p>
                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {companyDetails.gstin && <p>GSTIN: <span className="text-gray-900">{companyDetails.gstin}</span></p>}
                            {companyDetails.phone && <p>Phone: <span className="text-gray-900">{companyDetails.phone}</span></p>}
                            {companyDetails.email && <p>Email: <span className="text-gray-900 lowercase">{companyDetails.email}</span></p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-6xl font-black text-gray-100 uppercase mb-6 leading-none select-none">TAX INVOICE</h2>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">TAX INVOICE NO.</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tight">{sale.invoiceSequence}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">INVOICE DATE</p>
                                <p className="text-lg font-bold text-gray-800">{format(new Date(sale.saleDate), 'PPP')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-12">
                    {customer && (
                        <AddressBlock 
                            label="BILLED TO" 
                            name={customer.name} 
                            address={sale.billingAddress} 
                            contact={{ 
                                email: customer.email, 
                                phone: customer.phone, 
                                gst: sale.customerGstNumber || customer.gstNumber 
                            }} 
                        />
                    )}
                    <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-200">
                        {sale.shippingAddress && sale.shippingAddress.id !== sale.billingAddress.id ? (
                            <AddressBlock 
                                label="SHIPPED TO" 
                                name={customer?.name || ''} 
                                address={sale.shippingAddress} 
                                contact={{}} 
                            />
                        ) : (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Shipping same as billing</p>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-12 min-w-[600px]">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-[10px] font-black text-gray-900 uppercase tracking-widest bg-gray-50">
                                <th className="py-4 text-left pl-4 w-12 text-gray-400">#</th>
                                <th className="py-4 text-left">Description</th>
                                <th className="py-4 text-left w-32">SKU</th>
                                {isGstSale && <th className="py-4 text-left w-24">HSN</th>}
                                <th className="py-4 text-right w-20">GST %</th>
                                <th className="py-4 text-right w-20">Qty</th>
                                <th className="py-4 text-right w-32">Rate</th>
                                <th className="py-4 text-right pr-4 w-36">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sale.items.map((item, index) => (
                                <tr key={index} className="text-sm text-gray-800 hover:bg-gray-50/50">
                                    <td className="py-5 pl-4 text-gray-400 font-mono">{index + 1}</td>
                                    <td className="py-5">
                                        <p className="font-bold text-gray-900">{item.productName}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{item.brandName || 'N/A'}</p>
                                    </td>
                                    <td className="py-5 font-mono text-xs">{item.sku || 'N/A'}</td>
                                    {isGstSale && <td className="py-5 font-mono text-xs">{item.hsnCode || '-'}</td>}
                                    <td className="py-5 text-right font-medium">{item.gstRate}%</td>
                                    <td className="py-5 text-right font-black">{item.quantity}</td>
                                    <td className="py-5 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-5 text-right pr-4 font-black text-gray-900">{formatCurrency(item.totalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-16 border-t border-gray-100 pt-10">
                    <div className="flex-1 space-y-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Amount in Words</p>
                            <p className="text-sm font-bold italic text-gray-800 bg-gray-50 p-4 rounded-lg border leading-relaxed">
                                {numberToWordsInr(totalAmount)}
                            </p>
                        </div>
                        {termsAndConditions.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Terms & Conditions</p>
                                <ul className="text-[10px] text-gray-500 font-medium space-y-1.5 list-disc list-inside">
                                    {termsAndConditions.map((term, i) => <li key={i}>{term}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full md:w-80 space-y-3 bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-gray-900">{formatCurrency(sale.subTotal)}</span>
                        </div>
                        
                        {(sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0) > 0 && (
                            <div className="flex justify-between text-xs font-bold text-red-600 uppercase tracking-widest">
                                <span>Discount</span>
                                <span>-{formatCurrency((sale.couponDiscount || 0) + (sale.manualDiscountAmount || 0))}</span>
                            </div>
                        )}
                        
                        {isGstSale && (
                            <div className="space-y-2 border-y border-gray-200 py-3 my-2">
                                {sale.cgstAmount > 0 && <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>CGST</span><span>{formatCurrency(sale.cgstAmount)}</span></div>}
                                {sale.sgstAmount > 0 && <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>SGST</span><span>{formatCurrency(sale.sgstAmount)}</span></div>}
                                {sale.igstAmount > 0 && <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>IGST</span><span>{formatCurrency(sale.igstAmount)}</span></div>}
                            </div>
                        )}
                        
                        {Math.abs(roundOffAmount) > 0.01 && (
                            <div className="flex justify-between text-[10px] font-black uppercase italic border-t pt-2 border-gray-200">
                                <span className="text-gray-500">Round Off Adjustment</span>
                                <span className={cn(roundOffAmount < 0 ? "text-destructive" : "text-green-600")}>
                                    {roundOffAmount < 0 ? '-' : '+'}{formatCurrency(Math.abs(roundOffAmount))}
                                </span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900 mt-2">
                            <span className="text-sm font-black text-gray-900 uppercase">Grand Total</span>
                            <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .print\:hidden { display: none !important; }
                    #printable-invoice { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 1.5cm !important; 
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
