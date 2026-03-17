'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';
import { numberToWordsInr } from '@/lib/utils';
import { format } from 'date-fns';
import { Address, SaleReturn, Customer, Store, Company } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { downloadReturnSlip } from '@/lib/actions';

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return '₹0.00';
    const fixedAmount = amount.toFixed(2);
    const parts = fixedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `₹${parts.join('.')}`;
};

const AddressBlock = ({ label, name, address, contact }: { label: string, name: string, address: Address, contact: {email?: string, phone?: string, gst?: string}}) => (
    <div>
        <h3 className="font-bold mb-1 uppercase text-xs text-gray-400">{label}</h3>
        <div className="flex justify-between items-start gap-4">
            <div className="flex-grow">
                <p className="font-bold text-lg">{name}</p>
                <p className="text-sm">{address.street}</p>
                <p className="text-sm">{`${address.city}, ${address.state}${address.zip ? ` - ${address.zip}` : ''}`}</p>
                <p className="text-sm">{address.country}</p>
            </div>
            <div className="text-right shrink-0 text-xs font-medium text-gray-600">
                {contact.email && <p>Email: {contact.email}</p>}
                {contact.phone && <p>Phone: {contact.phone}</p>}
                {contact.gst && <p>GSTIN: {contact.gst}</p>}
            </div>
        </div>
    </div>
);

const STORE_ID = 'store_main';

export default function ReturnSlipPage() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();

    const returnRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'salesReturns', id as string) : null, [firestore, id]);
    const { data: saleReturn, isLoading: isReturnLoading } = useDoc<SaleReturn>(returnRef);

    const customerRef = useMemoFirebase(() => firestore && saleReturn ? doc(firestore, 'stores', STORE_ID, 'customers', saleReturn.customerId) : null, [firestore, saleReturn]);
    const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);
    
    const storeRef = useMemoFirebase(() => firestore && saleReturn ? doc(firestore, 'stores', saleReturn.storeId) : null, [firestore, saleReturn]);
    const { data: store, isLoading: isStoreLoading } = useDoc<Store>(storeRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);


    if (isReturnLoading || isCustomerLoading || isStoreLoading || isCompanyLoading) {
         return (
            <div className="flex items-center justify-center h-screen bg-white">
                <p className="animate-pulse">Loading return slip...</p>
            </div>
        );
    }
    
    if (!saleReturn || !companyDetails) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center p-8 bg-gray-50 rounded-lg border max-w-sm">
                    <h1 className="text-2xl font-bold mb-2">Return Slip Not Found</h1>
                    <Button asChild className="w-full mt-4"><Link href="/sales">Go to Sales</Link></Button>
                </div>
            </div>
        );
    }
    
    const totalAmount = saleReturn.totalRefundAmount;
    const roundedTotal = Math.round(totalAmount);
    const roundOffAmount = roundedTotal - totalAmount;
    
    return (
        <div className="min-h-screen bg-white p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl flex justify-between items-center mb-8 print:hidden">
                <Button variant="ghost" asChild className="hover:bg-gray-100">
                    <Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => window.print()} className="border-gray-300">
                        <Printer className="mr-2 h-4 w-4" /> Print Document
                    </Button>
                    <Button onClick={() => downloadReturnSlip(saleReturn, customer ? [customer] : [], store ? [store] : [], companyDetails)}>
                        <FileDown className="mr-2 h-4 w-4" /> Save as PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white text-black p-6 sm:p-12 border border-gray-200 w-full max-w-4xl" id="return-slip-content">
                <header className="text-left border-b-4 border-gray-900 pb-8 mb-8">
                    <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase">{companyDetails.name}</h1>
                    <p className="text-sm text-gray-600 max-w-xs">{companyDetails.address}</p>
                    <div className="mt-4 flex gap-6 text-xs font-bold text-gray-500 uppercase">
                        {companyDetails.gstin && <p>GSTIN: <span className="text-gray-900">{companyDetails.gstin}</span></p>}
                        {companyDetails.phone && <p>Phone: <span className="text-gray-900">{companyDetails.phone}</span></p>}
                    </div>
                </header>
                
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Return Slip #{saleReturn.returnSequence}</h2>
                        <p className="text-sm text-gray-500 font-bold mt-1">DATE: {format(new Date(saleReturn.returnDate), 'PPP')}</p>
                        <p className="text-sm text-gray-500 font-bold">ORIGINAL INVOICE: #{saleReturn.originalInvoiceSequence}</p>
                        {store && <p className="text-sm text-gray-500 font-bold">STORE: {store.name}</p>}
                    </div>
                    <h2 className="text-5xl font-black text-gray-100 uppercase select-none">CREDIT</h2>
                </div>

                <div className="mb-12">
                    {customer && customer.addresses.find(a => a.isPrimary) && (
                        <AddressBlock 
                            label="CUSTOMER" 
                            name={customer.name} 
                            address={customer.addresses.find(a => a.isPrimary)!} 
                            contact={{ email: customer.email, phone: customer.phone, gst: customer.gstNumber }} 
                        />
                    )}
                </div>

                <div className="overflow-x-auto mb-12">
                     <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-900">
                                <th className="p-4 text-left font-black uppercase text-xs tracking-widest">Item Description</th>
                                <th className="p-4 text-right font-black uppercase text-xs tracking-widest">Unit Price</th>
                                <th className="p-4 text-right font-black uppercase text-xs tracking-widest">Qty</th>
                                <th className="p-4 text-right font-black uppercase text-xs tracking-widest">Refund</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {saleReturn.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900">{item.productName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Reason: {item.reason || 'N/A'}</p>
                                    </td>
                                    <td className="p-4 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="p-4 text-right font-bold">{item.sellableQuantity + item.unsellableQuantity}</td>
                                    <td className="p-4 text-right font-black">{formatCurrency(item.totalRefund)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-16 border-t pt-10">
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Refund Amount in Words</p>
                        <p className="text-sm font-bold italic text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                            {numberToWordsInr(roundedTotal)}
                        </p>
                    </div>
                    
                    <div className="w-full md:w-80 space-y-3 bg-gray-50 p-6 rounded-xl border">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Subtotal Refund</span>
                            <span>{formatCurrency(saleReturn.subTotalRefund)}</span>
                        </div>
                       <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>GST Refund</span>
                            <span>{formatCurrency(saleReturn.gstRefund)}</span>
                        </div>
                        {roundOffAmount !== 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 italic">
                                <span>ROUND OFF</span>
                                <span>{formatCurrency(roundOffAmount)}</span>
                            </div>
                        )}
                        <div className="border-t-2 border-gray-900 pt-4 flex justify-between items-center">
                            <span className="text-sm font-black uppercase">Net Credit</span>
                            <span className="text-3xl font-black text-gray-900">{formatCurrency(roundedTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { 
                        size: auto;
                        margin: 0mm; 
                    }
                    body { background: white !important; margin: 0; padding: 0; }
                    .print\:hidden { display: none !important; }
                    #return-slip-content { 
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