'use client';

import { useMemo, useState } from 'react';
import { Customer, Sale, Company } from '@/lib/types';
import { CustomerFinancialsCard } from './customer-financials-card';
import { PendingInvoicesDialog } from './pending-invoices-dialog';
import { generatePendingInvoicesEmailBody } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';

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

  const customerData = useMemo(() => {
    const pendingSales = sales.filter(sale => sale.invoiceStatus === 'Unpaid' || sale.invoiceStatus === 'Partially Paid');
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
      data.totalPendingAmount += (sale.balanceAmount || sale.totalAmount);
    });

    return Array.from(customerMap.values());
  }, [sales, customers]);

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


  if (customerData.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-8">
            <p>No customers with outstanding balances.</p>
        </div>
    );
  }

  return (
    <>
        <PendingInvoicesDialog 
            data={selectedCustomerData}
            open={!!selectedCustomerData}
            onOpenChange={(open) => !open && setSelectedCustomerData(null)}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customerData.map(data => (
                <CustomerFinancialsCard 
                    key={data.customer.id} 
                    data={data}
                    onClick={() => setSelectedCustomerData(data)}
                    onSendReminder={() => handleSendReminder(data)}
                />
            ))}
        </div>
    </>
  );
}
