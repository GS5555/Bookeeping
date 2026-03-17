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
    if (typeof amount !== 'number') return 'Rs. 0.00';
    const fixedAmount = amount.toFixed(2);
    const parts = fixedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rs. ${parts.join('.')}`;
};

const AddressBlock = ({ label, name, address, contact }: { label: string, name: string, address: Address, contact: {email?: string, phone?: string, gst?: string}}) => (
    <div className="space-y-1">
        <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">{label}</h3>
        <div className="text-gray-800">
            <p className="font-bold text-lg">{name}</p>
            <p>{address.street}</p>
            <p>{`${address.city}, ${address.state}${address.zip ? ` - ${address.zip}` : ''}`}</p>
            <p>{address.country}</p>
            <div className="mt-2 text-sm text-gray-600">
                {contact.email && <p>Email: {contact.email}</p>}
                {contact.phone && <p>Phone: {contact.phone}</p>}
                {contact.gst && <p>GSTIN: {contact.gst}</p>}
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
        return <div className="flex items-center justify-center h-screen bg-white"><p>Loading Purchase Order...</p></div>;
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
        <div className="max-w-4xl mx-auto p-4 sm:p-8" id="po-page">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Button variant="ghost" asChild className="w-full sm:w-auto justify-start">
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

            <div className="bg-white text-black p-6 sm:p-12 border shadow-xl rounded-lg overflow-x-auto" id="printable-po">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-8 mb-8 min-w-[600px]">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">{companyDetails.name}</h1>
                        <p className="text-sm text-gray-600 max-w-xs">{companyDetails.address}</p>
                        <p className="text-sm font-bold text-gray-500 mt-2">GSTIN: {companyDetails.gstin}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-gray-200 uppercase mb-4 tracking-tighter">Purchase Order</h2>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-400">PO NUMBER</p>
                            <p className="text-lg font-bold">#{po.purchaseOrderNumber}</p>
                            <p className="text-xs font-bold text-gray-400 mt-4">ORDER DATE</p>
                            <p className="text-sm font-semibold">{format(new Date(po.orderDate), 'PPP')}</p>
                        </div>
                    </div>
                </div>

                {/* Vendor Address */}
                <div className="mb-12 min-w-[600px]">
                    {vendor && vendorAddress && (
                        <AddressBlock 
                            label="VENDOR" 
                            name={vendor.name} 
                            address={vendorAddress} 
                            contact={{ email: vendor.email, phone: vendor.phone, gst: vendor.gstNumber }} 
                        />
                    )}
                </div>

                {/* Items Table */}
                <table className="w-full mb-12 min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-900 text-xs font-black text-gray-900 uppercase">
                            <th className="py-3 text-left">Item Description</th>
                            <th className="py-3 text-left">HSN</th>
                            <th className="py-3 text-right">GST</th>
                            <th className="py-3 text-right">Qty</th>
                            <th className="py-3 text-right">Unit Cost</th>
                            <th className="py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {po.items.map((item, index) => (
                            <tr key={index} className="text-sm text-gray-800">
                                <td className="py-4">
                                    <p className="font-bold">{item.productName}</p>
                                    <p className="text-xs text-gray-500">{(item as any).brandName || 'Vendor Specific'}</p>
                                </td>
                                <td className="py-4">{item.hsnCode}</td>
                                <td className="py-4 text-right">{item.gstRate}%</td>
                                <td className="py-4 text-right font-medium">{item.quantity}</td>
                                <td className="py-4 text-right">{formatCurrency(item.unitCost)}</td>
                                <td className="py-4 text-right font-bold">{formatCurrency(item.totalCost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Summary */}
                <div className="flex flex-col md:flex-row justify-between gap-12 border-t pt-8 min-w-[600px]">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Amount in Words</p>
                        <p className="text-sm font-medium italic text-gray-700">{numberToWordsInr(roundedTotal)}</p>
                        {po.comments && (
                            <div className="mt-6">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Instructions</p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded border border-gray-100">{po.comments}</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-72 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Subtotal</span>
                            <span className="font-bold">{formatCurrency(po.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">GST Amount</span>
                            <span className="font-bold">{formatCurrency(po.gstAmount)}</span>
                        </div>
                        {roundOffAmount !== 0 && (
                            <div className="flex justify-between text-xs text-gray-400 italic">
                                <span>Round Off</span>
                                <span>{formatCurrency(roundOffAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-900">
                            <span className="text-lg font-black text-gray-900">GRAND TOTAL</span>
                            <span className="text-2xl font-black text-gray-900">{formatCurrency(roundedTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-24 flex justify-between gap-12 min-w-[600px]">
                    <div className="text-center flex-1">
                        <div className="h-px bg-gray-300 mb-2"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Prepared By</p>
                    </div>
                    <div className="text-center flex-1">
                        <div className="h-px bg-gray-300 mb-2"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Approved By</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    #printable-po { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important; 
                    }
                    @page { margin: 1cm; }
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