'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale, SaleReturn, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, FileDown, UserSearch } from 'lucide-react';
import { format } from 'date-fns';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToExcel, downloadGenericReportPdf } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

interface CustomerLedgerProps {
    sales: Sale[];
    returns: SaleReturn[];
    customers: Customer[];
}

export function CustomerLedger({ sales, returns, customers }: CustomerLedgerProps) {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

    const customerData = useMemo(() => {
        if (!selectedCustomerId) return null;
        
        const customerSales = sales.filter(s => s.customerId === selectedCustomerId && (s.status === 'pending' || (s.balanceAmount && s.balanceAmount > 0)));
        const customerReturns = returns.filter(r => r.customerId === selectedCustomerId);
        
        const totalPending = customerSales.reduce((acc, s) => acc + (s.balanceAmount || s.total || 0), 0);
        const totalRefunded = customerReturns.reduce((acc, r) => acc + r.totalRefundAmount, 0);
        
        return {
            sales: customerSales,
            returns: customerReturns,
            totalPending,
            totalRefunded,
            netBalance: totalPending - totalRefunded
        };
    }, [selectedCustomerId, sales, returns]);

    const handleExportExcel = () => {
        if (!customerData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        const exportData = [
            ...customerData.sales.map(s => ({ Type: 'Invoice', Number: s.invoiceSequence, Date: format(new Date(s.saleDate), 'yyyy-MM-dd'), Amount: s.total || 0, Balance: s.balanceAmount || s.total || 0 })),
            ...customerData.returns.map(r => ({ Type: 'Return', Number: r.returnSequence, Date: format(new Date(r.returnDate), 'yyyy-MM-dd'), Amount: r.totalRefundAmount, Balance: 0 }))
        ];
        exportToExcel(exportData, `ledger_${customer?.name.replace(/\s+/g, '_')}`);
    };

    const handleExportPdf = () => {
        if (!customerData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        const title = `Pending Ledger: ${customer?.name}`;
        const headers = [['Type', 'No.', 'Date', 'Amount', 'Balance']];
        const body = [
            ...customerData.sales.map(s => ['Invoice', s.invoiceSequence, format(new Date(s.saleDate), 'dd/MM/yy'), `Rs.${(s.total || 0).toLocaleString()}`, `Rs.${(s.balanceAmount || s.total || 0).toLocaleString()}`]),
            ...customerData.returns.map(r => ['Return', r.returnSequence, format(new Date(r.returnDate), 'dd/MM/yy'), `Rs.-${r.totalRefundAmount.toLocaleString()}`, '-'] as string[])
        ];
        downloadGenericReportPdf(title, headers, body, `ledger_${customer?.name.replace(/\s+/g, '_')}`);
    };

    return (
        <Card className="border-2 shadow-sm min-w-0">
            <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex-1">
                    <CardTitle>Customer Pending Ledger</CardTitle>
                    <CardDescription>Statement of outstanding invoices and returns.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:max-w-sm">
                    <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                        <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {selectedCustomerId && (
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={handleExportExcel}><Download className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={handleExportPdf}><FileDown className="h-4 w-4" /></Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="min-w-0">
                {!selectedCustomerId ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                        <UserSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Select a customer profile to view their balance.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                                <p className="text-[10px] font-black uppercase text-destructive/70 tracking-widest">Pending</p>
                                <p className="text-xl font-black text-destructive"><FormattedNumberCell value={customerData?.totalPending || 0} /></p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                                <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Returns</p>
                                <p className="text-xl font-black text-blue-600"><FormattedNumberCell value={customerData?.totalRefunded || 0} /></p>
                            </div>
                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                                <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Net Due</p>
                                <p className="text-xl font-black text-primary"><FormattedNumberCell value={customerData?.netBalance || 0} /></p>
                            </div>
                        </div>
                        <div className="rounded-md border overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader><TableRow className="bg-muted/20"><TableHead>No.</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {customerData?.sales.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium text-xs"><Link href={`/invoice/${s.id}`} target="_blank" className="hover:underline text-primary">#{s.invoiceSequence}</Link></TableCell>
                                            <TableCell className="text-xs">Invoice</TableCell>
                                            <TableCell className="text-xs">{format(new Date(s.saleDate), 'dd MMM yy')}</TableCell>
                                            <TableCell className="text-right font-black text-destructive text-xs"><FormattedNumberCell value={s.balanceAmount || s.total || 0} /></TableCell>
                                        </TableRow>
                                    ))}
                                    {customerData?.returns.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium text-xs"><Link href={`/return-slip/${r.id}`} target="_blank" className="hover:underline text-primary">{r.returnSequence}</Link></TableCell>
                                            <TableCell className="text-xs">Credit</TableCell>
                                            <TableCell className="text-xs">{format(new Date(r.returnDate), 'dd MMM yy')}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-600 text-xs">-<FormattedNumberCell value={r.totalRefundAmount} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
