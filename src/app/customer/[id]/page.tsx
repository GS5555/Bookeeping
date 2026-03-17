'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, ArrowLeft, Phone, Mail, MapPin, ReceiptText } from 'lucide-react';
import { format } from 'date-fns';
import { Sale, Customer, Company, Payment } from '@/lib/types';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, setDoc } from 'firebase/firestore';
import { AppShell } from '@/components/layout/app-shell';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { PaymentDialog } from '@/app/sales/payment-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STORE_ID = 'store_main';

function CustomerContent() {
    const params = useParams();
    const { id } = params;
    const firestore = useFirestore();
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    const customerRef = useMemoFirebase(() => firestore && id ? doc(firestore, 'stores', STORE_ID, 'customers', id as string) : null, [firestore, id]);
    const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);

    const salesRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'sales'), where('customerId', '==', id), orderBy('saleDate', 'desc'));
    }, [firestore, id]);
    const { data: sales, isLoading: isSalesLoading } = useCollection<Sale>(salesRef);

    const paymentsRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'customers', id as string, 'payments'), orderBy('date', 'desc'));
    }, [firestore, id]);
    const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsRef);
    
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    if (isCustomerLoading || isSalesLoading || isPaymentsLoading) return <div className="flex items-center justify-center h-screen"><p>Loading profile...</p></div>;
    if (!customer) return <div className="flex items-center justify-center h-screen"><p>Customer not found.</p></div>;

    const totalInvoiced = sales?.reduce((acc, sale) => acc + sale.totalAmount, 0) || 0;
    const totalPaymentsReceived = payments?.reduce((acc, pay) => acc + pay.amount, 0) || 0;
    const netBalance = totalInvoiced - totalPaymentsReceived;
    
    const primaryAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];

    const handlePaymentSuccess = async (payment: Payment) => {
        if (!firestore) return;
        try {
            const payRef = doc(firestore, 'stores', STORE_ID, 'customers', customer.id, 'payments', payment.id);
            await setDoc(payRef, payment);
            setIsPaymentDialogOpen(false);
            toast({ title: "Payment Recorded", description: `Lump sum of ₹${payment.amount.toLocaleString()} received.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" });
        }
    }

    const ledger = [
        ...(sales || []).map(s => ({ type: 'Invoice' as const, id: s.id, no: s.invoiceSequence, date: s.saleDate, amount: s.totalAmount, debit: true })),
        ...(payments || []).map(p => ({ type: 'Payment' as const, id: p.id, no: p.reference || 'Lump Sum', date: p.date, amount: p.amount, debit: false }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8" id="customer-statement">
            <PaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} customerId={customer.id} onSuccess={handlePaymentSuccess} />
            
            <div className="flex justify-between items-center print:hidden">
                <Button variant="ghost" asChild><Link href="/customers"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
                <div className="flex gap-2">
                    <Button onClick={() => setIsPaymentDialogOpen(true)}><ReceiptText className="mr-2 h-4 w-4" /> Receive Payment</Button>
                    <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print Statement</Button>
                </div>
            </div>

            <div className="bg-white text-black p-8 rounded-lg shadow-lg border border-gray-200 printable-content">
                <div className="flex justify-between items-start border-b pb-8 mb-8">
                    <div>
                        <h1 className="text-4xl font-black mb-2 uppercase">{customer.name}</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">{customer.companyName}</p>
                        <div className="mt-6 space-y-1 text-xs font-bold text-gray-400">
                            {customer.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {customer.email}</p>}
                            {customer.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {customer.phone}</p>}
                            {primaryAddress && (
                                <p className="flex items-center gap-2 max-w-xs">
                                    <MapPin className="h-3 w-3 shrink-0" /> 
                                    {`${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zip}`}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-6">
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em] mb-1">Net Outstanding Balance</p>
                            <p className={cn("text-4xl font-black tracking-tighter", netBalance > 0 ? "text-destructive" : "text-green-600")}>
                                <FormattedNumberCell value={netBalance} />
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Total Billed</p>
                                <p className="text-lg font-black"><FormattedNumberCell value={totalInvoiced} /></p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Total Paid</p>
                                <p className="text-lg font-black text-green-600"><FormattedNumberCell value={totalPaymentsReceived} /></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Chronological Ledger</h3>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 border-b-2 border-black">
                                <TableHead className="font-black text-[10px] text-black uppercase">Date</TableHead>
                                <TableHead className="font-black text-[10px] text-black uppercase">Transaction No / Type</TableHead>
                                <TableHead className="text-right font-black text-[10px] text-black uppercase">Debit (Invoice)</TableHead>
                                <TableHead className="text-right font-black text-[10px] text-black uppercase">Credit (Payment)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.length ? ledger.map((entry, idx) => (
                                <TableRow key={`${entry.type}-${entry.id}-${idx}`} className="hover:bg-gray-50 border-b border-gray-100">
                                    <TableCell className="text-xs font-bold text-gray-500">{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black">{entry.type === 'Invoice' ? `#${entry.no}` : entry.no}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{entry.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-black">
                                        {entry.debit ? <FormattedNumberCell value={entry.amount} /> : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-black text-green-600">
                                        {!entry.debit ? <FormattedNumberCell value={entry.amount} /> : '-'}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">No ledger activity recorded.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-16 pt-8 border-t text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <p>Generated on {format(new Date(), 'PPP p')} • {companyDetails?.name || 'Store Management System'}</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .printable-content { box-shadow: none !important; border: none !important; padding: 0 !important; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}

export default function CustomerProfilePage() {
    return (
        <AppShell>
            <CustomerContent />
        </AppShell>
    );
}