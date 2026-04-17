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
import { Sale, SalePaymentRecord } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({ required_error: "Payment date is required." }),
  method: z.string().min(1, "Method is required."),
  notes: z.string().optional(),
});

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onSuccess: (updatedSale: Sale) => void;
}

export function RecordPaymentDialog({ open, onOpenChange, sale, onSuccess }: RecordPaymentDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: sale.balanceAmount || 0,
      date: new Date(),
      method: "Cash",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: sale.balanceAmount || 0,
        date: new Date(),
        method: "Cash",
        notes: "",
      });
    }
  }, [open, sale.balanceAmount, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const newPayment: SalePaymentRecord = {
      id: `spay_${Date.now()}`,
      amount: data.amount,
      date: data.date.toISOString(),
      method: data.method,
      updatedAt: new Date().toISOString(),
      notes: data.notes,
    };

    const newPaymentHistory = [...(sale.paymentHistory || []), newPayment];
    const totalPaid = newPaymentHistory.reduce((acc, p) => acc + p.amount, 0);
    const balance = sale.total - totalPaid;

    const updatedSale: Sale = {
      ...sale,
      amountPaid: totalPaid,
      balanceAmount: balance,
      status: balance <= 0.01 ? 'paid' : 'pending',
      paymentHistory: newPaymentHistory,
    };

    onSuccess(updatedSale);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for #{sale.invoiceSequence}</DialogTitle>
          <DialogDescription>Add a new payment entry for this invoice. Current balance: ₹{(sale.balanceAmount || 0).toLocaleString()}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount Received (₹)</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-10 border-muted-foreground/50 font-black text-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal h-10 border-muted-foreground/50", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 border-muted-foreground/50"><SelectValue placeholder="Select method" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="IMPS">IMPS</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="e.g. Received via GPay" {...field} className="min-h-20 border-muted-foreground/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="font-black uppercase tracking-widest">Update Balance</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}