
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Payment, Customer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Combobox } from "@/components/ui/combobox";
import { useCurrentUser } from "@/hooks/use-current-user";

const STORE_ID = 'store_main';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  date: z.date({ required_error: "Payment date is required." }),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payment: Payment) => void;
  customerId?: string;
}

export function PaymentDialog({ open, onOpenChange, onSuccess, customerId }: PaymentDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();

  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: customerId || "",
      amount: 0,
      paymentMethod: "Cash",
      reference: "",
      notes: "",
      date: new Date(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        customerId: customerId || "",
        amount: 0,
        paymentMethod: "Cash",
        reference: "",
        notes: "",
        date: new Date(),
      });
    }
  }, [open, customerId, form]);

  const onSubmit = (data: PaymentFormValues) => {
    if (!customers || !currentUser) return;
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) return;

    const submittedPayment: Payment = {
      id: `pay_${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      amount: data.amount,
      date: data.date.toISOString(),
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes,
      createdBy: currentUser.id,
    };
    onSuccess(submittedPayment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Lump Sum Payment</DialogTitle>
          <DialogDescription>Record a payment received from a customer. This will adjust their overall ledger balance.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Combobox
                    options={customers?.map(c => ({ value: c.id, label: c.name })) || []}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search customer..."
                    searchPlaceholder="Type name..."
                    notFoundText="No customer found."
                    disabled={!!customerId}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount Received (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="NEFT">NEFT</SelectItem>
                            <SelectItem value="IMPS">IMPS</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference # (Optional)</FormLabel>
                  <FormControl><Input placeholder="Txn ID, Cheque No, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="e.g. Lump sum payment for multiple invoices." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
