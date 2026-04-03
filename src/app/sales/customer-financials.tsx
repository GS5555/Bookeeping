'use client';

import { useMemo, useState } from 'react';
import { Customer, Sale, Company } from '@/lib/types';
import { CustomerFinancialsCard } from './customer-financials-card';
import { PendingInvoicesDialog } from './pending-invoices-dialog';
import { generatePendingInvoicesEmailBody } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface CustomerFinancialsProps {
  sales: Sale[];
  customers: Customer[];
  companyDetails: Company | null;
}

export interface CustomerFinancialsData {
  customer: Customer;
  pendingInvoices: Sale[];
  totalPendingAmount: number;
}

export function CustomerFinancials({ sales, customers, companyDetails }: CustomerFinancialsProps) {
  const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerFinancialsData | null>(null);
  const [filterId, setFilterId] = useState<string>('all');

  const customerData = useMemo(() => {
    // Standardizing on 'status' and 'total' as per standardized Sale interface
    const pendingSales = sales.filter(sale => 
        (sale.status === 'pending' || sale.status === 'unpaid') || 
        (sale.balanceAmount && sale.balanceAmount > 0)
    );
    
    const customerMap = new Map<string, CustomerFinancialsData>();

    pendingSales.forEach(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      if (!customer) return;

      if (!customerMap.has(customer.id)) {
        customerMap.set(customer.id, {
          customer,
          pendingInvoices: [],
          totalPendingAmount: 0,
        });
      }

      const data = customerMap.get(customer.id)!;
      data.pendingInvoices.push(sale);
      data.totalPendingAmount += (sale.balanceAmount || sale.total || 0);
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalPendingAmount - a.totalPendingAmount);
  }, [sales, customers]);

  const filteredData = useMemo(() => {
    if (filterId === 'all') return customerData;
    return customerData.filter(d => d.customer.id === filterId);
  }, [customerData, filterId]);

  const handleSendReminder = (data: CustomerFinancialsData) => {
    if (!companyDetails) {
        toast({
            title: "Cannot Send Email",
            description: "Company details are not loaded. Please try again in a moment.",
            variant: "destructive"
        });
        return;
    }
    const { customer, pendingInvoices } = data;
    const subject = `Reminder: Outstanding Invoices from ${companyDetails.name}`;
    const body = generatePendingInvoicesEmailBody(customer, pendingInvoices, companyDetails);
    
    const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <>
        <PendingInvoicesDialog 
            data={selectedCustomerData}
            open={!!selectedCustomerData}
            onOpenChange={(open) => !open && setSelectedCustomerData(null)}
        />
        
        <Card className="border-2 shadow-sm h-full flex flex-col min-w-0">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Customer Accounts</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Receivables & Outstanding Balances
                    </CardDescription>
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={filterId} onValueChange={setFilterId}>
                        <SelectTrigger className="h-9 text-xs font-bold uppercase tracking-wider">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts ({customerData.length})</SelectItem>
                            {customerData.map(d => (
                                <SelectItem key={d.customer.id} value={d.customer.id}>
                                    {d.customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1 min-w-0">
                {filteredData.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {filteredData.map(data => (
                            <CustomerFinancialsCard 
                                key={data.customer.id} 
                                data={data}
                                onClick={() => setSelectedCustomerData(data)}
                                onSendReminder={() => handleSendReminder(data)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border-2 border-dashed">
                        <Users className="h-12 w-12 mb-4 opacity-10" />
                        <p className="text-xs font-black uppercase tracking-widest">No customers with outstanding balances</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </>
  );
}
