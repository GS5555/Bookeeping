
'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Enquiry, Company } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { downloadEnquiry } from '@/lib/actions';
import { useIsMounted } from '@/hooks/use-is-mounted';

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const STORE_ID = 'store_main';

export default function EnquirySlipPage() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();
    const isMounted = useIsMounted();

    const enquiryRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'enquiries', id as string) : null, [firestore, id]);
    const { data: enquiry, isLoading: isEnquiryLoading } = useDoc<Enquiry>(enquiryRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

    if (isEnquiryLoading || isCompanyLoading || !isMounted) {
        return <div className="flex items-center justify-center h-screen bg-white"><p className="animate-pulse font-medium">Loading enquiry details...</p></div>;
    }
    
    if (!enquiry || !companyDetails) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center p-8 border rounded-xl shadow-sm bg-gray-50 max-w-sm">
                    <h1 className="text-2xl font-bold mb-4">Enquiry Not Found</h1>
                    <Button asChild className="w-full"><Link href="/enquiries">Back to Enquiries</Link></Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Button variant="ghost" asChild className="hover:bg-gray-100">
                    <Link href="/enquiries"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
                </Button>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                    <Button variant="outline" onClick={() => window.print()} className="border-gray-300">
                        <Printer className="mr-2 h-4 w-4" /> Print Enquiry
                    </Button>
                    <Button onClick={() => downloadEnquiry(enquiry, companyDetails)} className="shadow-md">
                        <FileDown className="mr-2 h-4 w-4" /> Save as PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white text-black p-6 sm:p-12 border border-gray-200 shadow-none rounded-none w-full max-w-5xl" id="printable-enquiry">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-4 border-gray-900 pb-8 mb-10">
                    <div className="flex-1">
                        <h1 className="text-4xl font-black text-gray-900 mb-3 uppercase tracking-tight">{companyDetails.name}</h1>
                        <p className="text-sm text-gray-600 max-w-sm whitespace-pre-wrap leading-relaxed">{companyDetails.address}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-6xl font-black text-gray-100 uppercase mb-6 leading-none select-none">ENQUIRY SLIP</h2>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">SLIP NO.</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tight">{enquiry.enquiryNumber}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">DATE</p>
                                <p className="text-lg font-bold text-gray-800">{format(new Date(enquiry.date), 'PPP')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Customer Name</h3>
                    <p className="text-2xl font-black text-gray-900 uppercase">{enquiry.customerName || 'Walk-in Customer'}</p>
                </div>

                <div className="mb-12">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Requirement Details</h3>
                    <div className="p-6 bg-gray-50 border border-dashed rounded-lg">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{enquiry.enquiry}</p>
                    </div>
                </div>

                {enquiry.items && enquiry.items.length > 0 && (
                    <div className="overflow-x-auto">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Interested Products</h3>
                        <table className="w-full mb-12 min-w-[600px]">
                            <thead>
                                <tr className="border-b-2 border-gray-900 text-[10px] font-black text-gray-900 uppercase tracking-widest bg-gray-50">
                                    <th className="py-4 text-left pl-4">#</th>
                                    <th className="py-4 text-left">Description</th>
                                    <th className="py-4 text-left w-32">SKU</th>
                                    <th className="py-4 text-right w-20">GST %</th>
                                    <th className="py-4 text-right w-20">Qty</th>
                                    <th className="py-4 text-right pr-4 w-36">Approx. Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {enquiry.items.map((item, index) => (
                                    <tr key={index} className="text-sm text-gray-800 hover:bg-gray-50/50">
                                        <td className="py-5 pl-4 text-gray-400 font-mono">{index + 1}</td>
                                        <td className="py-5">
                                            <p className="font-bold text-gray-900">{item.productName}</p>
                                        </td>
                                        <td className="py-5 font-mono text-xs">{item.sku || 'N/A'}</td>
                                        <td className="py-5 text-right font-medium">{item.gstRate}%</td>
                                        <td className="py-5 text-right font-black">{item.quantity}</td>
                                        <td className="py-5 text-right pr-4 font-black text-gray-900">{formatCurrency(item.unitPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-16 pt-8 border-t text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <p>Generated on {format(new Date(), 'PPP p')} • {companyDetails.name}</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    .print\:hidden { display: none !important; }
                    #printable-enquiry { 
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
