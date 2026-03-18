
'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';
import { numberToWordsInr } from '@/lib/utils';
import { format } from 'date-fns';
import { Address, PurchaseOrder, Vendor, Company } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppShell } from '@/components/layout/app-shell';
import { downloadPurchaseOrder } from '@/lib/actions';

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AddressBlock = ({ label, name, address, contact }: { label: string, name: string, address: Address, contact: {email?: string, phone?: string, gst?: string}}) => (
    <div className="space-y-1">
        <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">{label}</h3>
        <div className="text-gray-800">
            <p className="font-bold text-lg">{name}</p>
            <p className="text-sm">{address.street}</p>
            <p className="text-sm">{`${address.city}, ${address.state}${address.zip ? ` - ${address.zip}` : ''}`}</p>
            <p className="text-sm">{address.country}</p>
            <div className="mt-2 text-xs text-gray-600 font-medium">
                {contact.email && <p>Email: {contact.email}</p>}
                {contact.phone && <p>Phone: {contact.phone}</p>}
                {contact.gst && <p className="font-black text-gray-900 mt-1">GSTIN: {contact.gst}</p>}
            </div>
        </div>
    </div>
);

const STORE_ID = 'store_main';

function PurchaseOrderContent() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();

    const poRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'purchaseOrders', id as string) : null, [firestore, id]);
    const { data: po, isLoading: isPoLoading } = useDoc<PurchaseOrder>(poRef);

    const vendorRef = useMemoFirebase(() => firestore && po ? doc(firestore, 'stores', STORE_ID, 'vendors', po.vendorId) : null, [firestore, po]);
    const { data: vendor, isLoading: isVendorLoading } = useDoc<Vendor>(vendorRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

    if (isPoLoading || isVendorLoading || isCompanyLoading) {
        return <div className="flex items-center justify-center h-screen bg-white"><p className="animate-pulse">Loading Purchase Order...</p></div>;
    }
    
    if (!po || !companyDetails) {
        return (
             <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center p-8 border rounded-lg shadow-sm">
                    <h1 className="text-2xl font-bold mb-4">Purchase Order Not Found</h1>
                    <Button asChild><Link href="/purchases">Go back to Purchases</Link></Button>
                </div>
            </div>
        );
    }
    
    const vendorAddress = vendor?.addresses.find(a => a.isPrimary) || vendor?.addresses[0];
    const totalAmount = po.totalAmount;
    const roundedTotal = Math.round(totalAmount);
    const roundOffAmount = roundedTotal - totalAmount;

    return (
        <div className="min-h-screen bg-white p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Button variant="ghost" asChild className="hover:bg-gray-100">
                    <Link href="/purchases"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchases</Link>
                </Button>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">
                        <Printer className="mr-2 h-4 w-4" /> Print PO
                    </Button>
                    <Button onClick={() => downloadPurchaseOrder(po, vendor ? [vendor] : [], companyDetails)} className="flex-1 sm:flex-none">
                        <FileDown className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white text-black p-6 sm:p-12 border border-gray-200 shadow-none rounded-none w-full max-w-5xl" id="printable-po">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-gray-900 pb-8 mb-10">
                    <div className="flex-1">
                        <h1 className="text-4xl font-black text-gray-900 mb-3 uppercase tracking-tight">{companyDetails.name}</h1>
                        <p className="text-sm text-gray-600 max-w-sm whitespace-pre-wrap leading-relaxed">{companyDetails.address}</p>
                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {companyDetails.gstin && <p>GSTIN: <span className="text-gray-900">{companyDetails.gstin}</span></p>}
                            {companyDetails.phone && <p>Phone: <span className="text-gray-900">{companyDetails.phone}</span></p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-6xl font-black text-gray-100 uppercase mb-6 leading-none select-none">PURCHASE ORDER</h2>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">PO NUMBER</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tight">#{po.purchaseOrderNumber}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ORDER DATE</p>
                                <p className="text-lg font-bold text-gray-800">{format(new Date(po.orderDate), 'PPP')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    {vendor && vendorAddress && (
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 max-w-md">
                            <AddressBlock 
                                label="VENDOR" 
                                name={vendor.name} 
                                address={vendorAddress} 
                                contact={{ email: vendor.email, phone: vendor.phone, gst: vendor.gstNumber }} 
                            />
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-12 min-w-[600px]">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-[10px] font-black text-gray-900 uppercase tracking-widest bg-gray-50">
                                <th className="py-4 text-left pl-4 w-12 text-gray-400">#</th>
                                <th className="py-4 text-left">Description</th>
                                <th className="py-4 text-left w-24">HSN</th>
                                <th className="py-4 text-right w-20">Qty</th>
                                <th className="py-4 text-right w-32">Unit Cost</th>
                                <th className="py-4 text-right pr-4 w-36">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {po.items.map((item, index) => (
                                <tr key={index} className="text-sm text-gray-800">
                                    <td className="py-5 pl-4 text-gray-400 font-mono">{index + 1}</td>
                                    <td className="py-5">
                                        <p className="font-bold text-gray-900">{item.productName}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{item.hsnCode || 'N/A'}</p>
                                    </td>
                                    <td className="py-5 font-mono text-xs">{item.hsnCode || '-'}</td>
                                    <td className="py-5 text-right font-black">{item.quantity}</td>
                                    <td className="py-5 text-right">{formatCurrency(item.unitCost)}</td>
                                    <td className="py-5 text-right pr-4 font-black text-gray-900">{formatCurrency(item.totalCost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-16 border-t border-gray-100 pt-10">
                    <div className="flex-1 space-y-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Amount in Words</p>
                            <p className="text-sm font-bold italic text-gray-800 bg-gray-50 p-4 rounded-lg border">
                                {numberToWordsInr(roundedTotal)}
                            </p>
                        </div>
                        {po.comments && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Special Instructions</p>
                                <p className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border border-dashed">{po.comments}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full md:w-80 space-y-3 bg-gray-50 p-6 rounded-xl border">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-gray-900">{formatCurrency(po.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>GST Amount</span>
                            <span className="text-gray-900">{formatCurrency(po.gstAmount)}</span>
                        </div>
                        {roundOffAmount !== 0 && (
                            <div className="flex justify-between text-[10px] font-black text-gray-900 italic uppercase">
                                <span>ROUND OFF</span>
                                <span>{formatCurrency(roundOffAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900 mt-2">
                            <span className="text-sm font-black text-gray-900 uppercase">Grand Total</span>
                            <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(roundedTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .print\:hidden { display: none !important; }
                    #printable-po { 
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

export default function PurchaseOrderPage() {
    return (
      <AppShell>
        <PurchaseOrderContent />
      </AppShell>
    );
}
