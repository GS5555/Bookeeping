'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';
import { numberToWordsInr } from '@/lib/utils';
import { format } from 'date-fns';
import { Address, Quotation, Customer, Company } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { downloadQuotation } from '@/lib/actions';

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

export default function QuotationPage() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();

    const quotationRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'quotations', id as string) : null, [firestore, id]);
    const { data: quotation, isLoading: isQuotationLoading } = useDoc<Quotation>(quotationRef);

    const customerRef = useMemoFirebase(() => firestore && quotation ? doc(firestore, 'stores', STORE_ID, 'customers', quotation.customerId) : null, [firestore, quotation]);
    const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

    if (isQuotationLoading || isCustomerLoading || isCompanyLoading) {
        return <div className="flex items-center justify-center h-screen bg-white"><p>Loading quotation details...</p></div>;
    }
    
    if (!quotation || !companyDetails) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center p-8 border rounded-lg shadow-sm">
                    <h1 className="text-2xl font-bold mb-4">Quotation Not Found</h1>
                    <Button asChild><Link href="/quotations">Back to Quotations</Link></Button>
                </div>
            </div>
        );
    }
    
    const termsAndConditions = quotation.termsAndConditions?.split('\n') || [];
    const totalAmount = quotation.totalAmount;
    const roundedTotal = Math.round(totalAmount);
    const roundOffAmount = roundedTotal - totalAmount;

    return (
        <div className="min-h-screen bg-muted/20 p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Button variant="ghost" asChild className="hover:bg-white/50">
                    <Link href="/quotations"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotations</Link>
                </Button>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Quotation
                    </Button>
                    <Button onClick={() => downloadQuotation(quotation, customer ? [customer] : [], companyDetails)}>
                        <FileDown className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </div>

            <div className="bg-white text-black p-6 sm:p-12 border shadow-xl rounded-lg overflow-x-auto w-full max-w-4xl" id="printable-quotation">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-8 mb-8 min-w-[600px]">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">{companyDetails.name}</h1>
                        <p className="text-sm text-gray-600 max-w-xs">{companyDetails.address}</p>
                        <p className="text-sm font-bold text-gray-500 mt-2">GSTIN: {companyDetails.gstin}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-gray-200 uppercase mb-4 tracking-tighter">QUOTATION</h2>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-400">QUOTATION NUMBER</p>
                            <p className="text-lg font-bold">#{quotation.quotationNumber}</p>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400">DATE</p>
                                    <p className="text-sm font-semibold">{format(new Date(quotation.date), 'dd/MM/yyyy')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400">EXPIRY</p>
                                    <p className="text-sm font-semibold text-destructive">{format(new Date(quotation.validUntil), 'dd/MM/yyyy')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12 min-w-[600px]">
                    {customer && (
                        <AddressBlock 
                            label="PROPOSAL PREPARED FOR" 
                            name={customer.name} 
                            address={quotation.billingAddress} 
                            contact={{ email: customer.email, phone: customer.phone, gst: customer.gstNumber }} 
                        />
                    )}
                </div>

                <table className="w-full mb-12 min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-900 text-xs font-black text-gray-900 uppercase">
                            <th className="py-3 text-left">Item Description</th>
                            <th className="py-3 text-left w-24">HSN</th>
                            <th className="py-3 text-right w-20">GST</th>
                            <th className="py-3 text-right w-20">Qty</th>
                            <th className="py-3 text-right">Price</th>
                            <th className="py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {quotation.items.map((item, index) => (
                            <tr key={index} className="text-sm text-gray-800">
                                <td className="py-4 font-bold">{item.productName}</td>
                                <td className="py-4">{item.hsnCode}</td>
                                <td className="py-4 text-right">{item.gstRate}%</td>
                                <td className="py-4 text-right font-medium">{item.quantity}</td>
                                <td className="py-4 text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="py-4 text-right font-bold">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex flex-col md:flex-row justify-between gap-12 border-t pt-8 min-w-[600px]">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Amount in Words</p>
                        <p className="text-sm font-medium italic text-gray-700">{numberToWordsInr(roundedTotal)}</p>
                        {termsAndConditions.length > 0 && (
                            <div className="mt-8">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Important Terms & Conditions</p>
                                <ul className="text-[10px] text-gray-500 list-disc list-inside space-y-1">
                                    {termsAndConditions.map((term, i) => <li key={i}>{term}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-72 space-y-3 bg-gray-50 p-6 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Subtotal</span>
                            <span className="font-bold">{formatCurrency(quotation.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Tax (GST)</span>
                            <span className="font-bold">{formatCurrency(quotation.gstAmount)}</span>
                        </div>
                        {roundOffAmount !== 0 && (
                            <div className="flex justify-between text-xs text-gray-400 italic">
                                <span>Round Off</span>
                                <span>{formatCurrency(roundOffAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
                            <span className="text-lg font-black text-gray-900">ESTIMATED TOTAL</span>
                            <span className="text-2xl font-black text-gray-900">{formatCurrency(roundedTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-24 text-center text-xs text-gray-400 min-w-[600px]">
                    <p>Thank you for your interest in our products. This is a computer generated proposal.</p>
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
                    #printable-quotation { 
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