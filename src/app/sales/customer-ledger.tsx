
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale, SaleReturn, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, FileDown, UserSearch } from 'lucide-react';
import { format } from 'date-fns';
import { FormattedNumberCell } from '@/components/formatted-number-cell';
import { Combobox } from '@/components/ui/combobox';
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
        
        const customerSales = sales.filter(s => s.customerId === selectedCustomerId && (s.invoiceStatus === 'Unpaid' || s.invoiceStatus === 'Partially Paid'));
        const customerReturns = returns.filter(r => r.customerId === selectedCustomerId);
        
        const totalPending = customerSales.reduce((acc, s) => acc + (s.balanceAmount || s.totalAmount), 0);
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
            ...customerData.sales.map(s => ({
                Type: 'Invoice',
                Number: s.invoiceSequence,
                Date: format(new Date(s.saleDate), 'yyyy-MM-dd'),
                'Total Amount': s.totalAmount,
                'Pending Balance': s.balanceAmount || s.totalAmount,
                Items: s.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')
            })),
            ...customerData.returns.map(r => ({
                Type: 'Return',
                Number: r.returnSequence,
                Date: format(new Date(r.returnDate), 'yyyy-MM-dd'),
                'Refund Amount': r.totalRefundAmount,
                'Pending Balance': 0,
                Items: r.items.map(i => `${i.productName} (x${i.sellableQuantity + i.unsellableQuantity})`).join(', ')
            }))
        ];
        
        exportToExcel(exportData, `ledger_${customer?.name.replace(/\s+/g, '_')}`);
    };

    const handleExportPdf = () => {
        if (!customerData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        const title = `Pending Ledger: ${customer?.name}`;
        const headers = [['Type', 'No.', 'Date', 'Amount', 'Balance', 'Items']];
        const body = [
            ...customerData.sales.map(s => ['Invoice', s.invoiceSequence, format(new Date(s.saleDate), 'dd/MM/yy'), `Rs.${s.totalAmount.toLocaleString()}`, `Rs.${(s.balanceAmount || s.totalAmount).toLocaleString()}`, s.items.map(i => `${i.productName} x${i.quantity}`).join('\n')]),
            ...customerData.returns.map(r => ['Return', r.returnSequence, format(new Date(r.returnDate), 'dd/MM/yy'), `Rs.-${r.totalRefundAmount.toLocaleString()}`, '-', r.items.map(i => `${i.productName} x${i.sellableQuantity + i.unsellableQuantity}`).join('\n')])
        ];
        downloadGenericReportPdf(title, headers, body, `ledger_${customer?.name.replace(/\s+/g, '_')}`);
    };

    return (
        <Card className="border-2 shadow-sm">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Customer Pending Ledger</CardTitle>
                        <CardDescription>Consolidated statement of outstanding invoices and returns.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:max-w-sm">
                        <Combobox
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            placeholder="Select customer..."
                            searchPlaceholder="Search customers..."
                            notFoundText="No customer found."
                            className="h-10"
                        />
                        {selectedCustomerId && (
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" onClick={handleExportExcel} title="Export to Excel">
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleExportPdf} title="Download PDF">
                                    <FileDown className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!selectedCustomerId ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                        <UserSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Select a customer to view their detailed ledger statement.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="bg-muted/50 border-destructive/20 shadow-none">
                                <CardContent className="pt-6 text-center">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pending Invoices</p>
                                    <p className="text-2xl font-black text-destructive">
                                        <FormattedNumberCell value={customerData?.totalPending || 0} />
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/50 border-blue-200 shadow-none">
                                <CardContent className="pt-6 text-center">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Returns</p>
                                    <p className="text-2xl font-black text-blue-600">
                                        <FormattedNumberCell value={customerData?.totalRefunded || 0} />
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-primary/5 border-primary/20 shadow-none">
                                <CardContent className="pt-6 text-center">
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Net Balance Due</p>
                                    <p className="text-2xl font-black text-primary">
                                        <FormattedNumberCell value={customerData?.netBalance || 0} />
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Transaction Registry</h3>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/20">
                                            <TableHead className="font-bold">No.</TableHead>
                                            <TableHead className="font-bold">Type</TableHead>
                                            <TableHead className="font-bold">Date</TableHead>
                                            <TableHead className="text-right font-bold">Amount</TableHead>
                                            <TableHead className="text-right font-bold">Impact</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customerData?.sales.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium text-xs">
                                                    <Link href={`/invoice/${s.id}`} target="_blank" className="hover:underline text-primary">
                                                        #{s.invoiceSequence}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs">Invoice</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{format(new Date(s.saleDate), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right text-xs"><FormattedNumberCell value={s.totalAmount} /></TableCell>
                                                <TableCell className="text-right font-black text-destructive text-xs"><FormattedNumberCell value={s.balanceAmount || s.totalAmount} /></TableCell>
                                            </TableRow>
                                        ))}
                                        {customerData?.returns.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell className="font-medium text-xs">
                                                    <Link href={`/return-slip/${r.id}`} target="_blank" className="hover:underline text-primary">
                                                        {r.returnSequence}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs">Return Credit</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.returnDate), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right text-blue-600 font-medium text-xs">-<FormattedNumberCell value={r.totalRefundAmount} /></TableCell>
                                                <TableCell className="text-right text-blue-600 font-bold italic text-xs">Credit</TableCell>
                                            </TableRow>
                                        ))}
                                        {(customerData && customerData.sales.length === 0 && customerData.returns.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic text-xs">
                                                    No pending transactions found for this account.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
