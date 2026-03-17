
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sale, SaleReturn, SaleReturnItem, Customer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo, useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { cn } from "@/lib/utils";

const STORE_ID = 'store_main';

const returnItemSchema = z.object({
  isSelected: z.boolean().default(false),
  productId: z.string(),
  productName: z.string(),
  unitPrice: z.number(),
  originalQuantity: z.number(),
  sellableQuantity: z.coerce.number().min(0).default(0),
  unsellableQuantity: z.coerce.number().min(0).default(0),
  refundAmount: z.coerce.number().min(0).default(0),
  reason: z.string().optional(),
  gstRate: z.number(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  originalSaleId: z.string().min(1, "Original invoice is required."),
  items: z.array(returnItemSchema)
    .min(1, "At least one item is required.")
    .superRefine((items, ctx) => {
        items.forEach((item, index) => {
            if (item.isSelected) {
                const totalReturned = Number(item.sellableQuantity) + Number(item.unsellableQuantity);
                if (totalReturned > item.originalQuantity) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Cannot return more than ${item.originalQuantity} units.`,
                        path: [index, 'sellableQuantity'],
                    });
                }
                if (totalReturned <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Quantity must be greater than 0 for selected items.`,
                        path: [index, 'sellableQuantity'],
                    });
                }
            }
        });
    }),
}).refine(
    (data) => data.items.some(item => item.isSelected),
    {
        message: "Please select at least one item to return.",
        path: ["items"],
    }
);

type ReturnFormValues = z.infer<typeof formSchema>;

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (saleReturn: SaleReturn) => void;
}

export function ReturnDialog({ open, onOpenChange, onSuccess }: ReturnDialogProps) {
  const [filteredInvoices, setFilteredInvoices] = useState<Sale[]>([]);
  const isMounted = useIsMounted();
  const firestore = useFirestore();

  const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);

  const sortedCustomers = useMemo(() => customers?.sort((a,b) => a.name.localeCompare(b.name)), [customers]);

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      originalSaleId: "",
      items: [],
    },
  });

  const { control, setValue, reset } = form;
  const { replace } = useFieldArray({ control, name: "items" });
  
  const watchedCustomerId = useWatch({ control, name: 'customerId' });
  const watchedSaleId = useWatch({ control, name: 'originalSaleId' });
  const watchedItems = useWatch({ control, name: 'items' }) || [];
  
  const [originalSale, setOriginalSale] = useState<Sale | null>(null);

  useEffect(() => {
      if (watchedCustomerId && sales) {
          setFilteredInvoices(sales.filter(s => s.customerId === watchedCustomerId));
          setValue('originalSaleId', '');
          replace([]);
      } else {
          setFilteredInvoices([]);
      }
  }, [watchedCustomerId, sales, replace, setValue]);

  useEffect(() => {
    if (watchedSaleId && sales) {
        const sale = sales.find(s => s.id === watchedSaleId);
        setOriginalSale(sale || null);
        if (sale) {
            const saleItems = sale.items.map(item => ({
                isSelected: false,
                productId: item.productId,
                productName: item.productName,
                unitPrice: item.unitPrice,
                originalQuantity: item.quantity,
                sellableQuantity: 0,
                unsellableQuantity: 0,
                refundAmount: 0,
                reason: '',
                gstRate: item.gstRate,
            }));
            replace(saleItems);
        }
    } else {
        replace([]);
        setOriginalSale(null);
    }
  }, [watchedSaleId, sales, replace]);

  const totals = useMemo(() => {
    const selectedItems = watchedItems.filter(item => item.isSelected);
    const subTotal = selectedItems.reduce((acc, item) => acc + (Number(item.refundAmount) || 0), 0);
    
    let totalGst = 0;
    if (originalSale && selectedItems.length > 0) {
        selectedItems.forEach(item => {
            const itemRefund = Number(item.refundAmount) || 0;
            const gstRate = Number(item.gstRate) || 0;
            totalGst += itemRefund * (gstRate / 100);
        });
    }
    
    return {
        totalRefundAmount: Math.round(subTotal + totalGst),
        subTotalRefund: subTotal,
        gstRefund: totalGst,
    };
  }, [watchedItems, originalSale]);

  const onSubmit = (data: ReturnFormValues) => {
    if (!sales) return;
    const originalSale = sales.find(s => s.id === data.originalSaleId);
    if (!originalSale) return;

    const returnedItems: SaleReturnItem[] = data.items
      .filter(item => item.isSelected)
      .map(item => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        sellableQuantity: Number(item.sellableQuantity),
        unsellableQuantity: Number(item.unsellableQuantity),
        totalRefund: Number(item.refundAmount),
        reason: item.reason,
        gstRate: item.gstRate,
    }));
    
    const submittedReturn: SaleReturn = {
      id: `ret_${Date.now()}`,
      storeId: originalSale.storeId, 
      customerId: data.customerId,
      returnDate: new Date().toISOString(),
      originalSaleId: originalSale.id,
      originalInvoiceSequence: originalSale.invoiceSequence,
      returnSequence: `RTN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      customerName: originalSale.customerName,
      items: returnedItems,
      subTotalRefund: totals.subTotalRefund,
      gstRefund: totals.gstRefund,
      cgstRefund: 0,
      sgstRefund: 0,
      igstRefund: 0,
      totalRefundAmount: totals.totalRefundAmount,
    };
    onSuccess(submittedReturn);
    form.reset();
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if(!isOpen) {
            form.reset();
        }
        onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Process New Return</DialogTitle>
          <DialogDescription>Choose an invoice, then check the items you wish to return. Adjust refund amounts for damages if necessary.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {sortedCustomers?.map(customer => (
                                <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="originalSaleId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Number</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!watchedCustomerId}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an invoice" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredInvoices.map(invoice => (
                                <SelectItem key={invoice.id} value={invoice.id}>
                                    {isMounted ? (
                                      `#${invoice.invoiceSequence} - ₹${invoice.totalAmount.toLocaleString()} (${new Date(invoice.saleDate).toLocaleDateString()})`
                                    ) : (
                                      <Skeleton className="h-4 w-40" />
                                    )}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            {watchedItems.length > 0 && (
                <div className="space-y-4">
                    <FormLabel className="text-lg font-black uppercase tracking-tight">Select Items to Return</FormLabel>
                    <FormMessage>{form.formState.errors.items?.root?.message || form.formState.errors.items?.message}</FormMessage>
                    {watchedItems.map((item, index) => {
                        const isSelected = item.isSelected;
                        return (
                            <div key={index} className={cn(
                                "space-y-3 border p-4 rounded-lg transition-colors shadow-sm",
                                isSelected ? "bg-accent/10 border-primary/50" : "bg-muted/20 border-border"
                            )}>
                               <div className="flex items-start gap-4">
                                   <FormField
                                       control={form.control}
                                       name={`items.${index}.isSelected`}
                                       render={({ field: selectionField }) => (
                                           <FormControl>
                                               <Checkbox
                                                   checked={selectionField.value}
                                                   onCheckedChange={(val) => {
                                                       selectionField.onChange(val);
                                                       if (val) {
                                                           const defaultQty = item.originalQuantity;
                                                           setValue(`items.${index}.sellableQuantity`, defaultQty);
                                                           setValue(`items.${index}.refundAmount`, defaultQty * item.unitPrice);
                                                       } else {
                                                           setValue(`items.${index}.sellableQuantity`, 0);
                                                           setValue(`items.${index}.unsellableQuantity`, 0);
                                                           setValue(`items.${index}.refundAmount`, 0);
                                                       }
                                                   }}
                                                   className="mt-1 h-5 w-5"
                                               />
                                           </FormControl>
                                       )}
                                   />
                                   <div className="flex-1">
                                       <div className="flex justify-between items-center">
                                            <p className="font-black text-base">{item.productName}</p>
                                            <p className="text-sm font-black text-primary">Invoice Price: ₹{item.unitPrice.toLocaleString()}</p>
                                       </div>
                                       <p className="text-xs text-muted-foreground font-medium">
                                           Original Quantity: {item.originalQuantity}
                                       </p>
                                   </div>
                               </div>

                               {isSelected && (
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                       <FormField
                                           control={form.control}
                                           name={`items.${index}.sellableQuantity`}
                                           render={({ field: formField }) => (
                                               <FormItem>
                                                   <FormLabel className="text-[10px] font-bold uppercase">Sellable (Restock)</FormLabel>
                                                   <FormControl>
                                                       <Input type="number" {...formField} className="h-8" onChange={(e) => {
                                                           formField.onChange(e);
                                                           const s = Number(e.target.value) || 0;
                                                           const u = Number(watchedItems[index].unsellableQuantity) || 0;
                                                           setValue(`items.${index}.refundAmount`, (s + u) * item.unitPrice);
                                                       }}/>
                                                   </FormControl>
                                                    <FormMessage />
                                               </FormItem>
                                           )}
                                       />
                                       <FormField
                                           control={form.control}
                                           name={`items.${index}.unsellableQuantity`}
                                           render={({ field: formField }) => (
                                               <FormItem>
                                                   <FormLabel className="text-[10px] font-bold uppercase">Unsellable (Scrap)</FormLabel>
                                                   <FormControl>
                                                       <Input type="number" {...formField} className="h-8" onChange={(e) => {
                                                           formField.onChange(e);
                                                           const u = Number(e.target.value) || 0;
                                                           const s = Number(watchedItems[index].sellableQuantity) || 0;
                                                           setValue(`items.${index}.refundAmount`, (s + u) * item.unitPrice);
                                                       }}/>
                                                   </FormControl>
                                                   <FormMessage />
                                               </FormItem>
                                           )}
                                       />
                                       <FormField
                                           control={form.control}
                                           name={`items.${index}.refundAmount`}
                                           render={({ field: formField }) => (
                                               <FormItem>
                                                   <FormLabel className="text-[10px] font-black uppercase text-blue-600">Line Refund (Editable)</FormLabel>
                                                   <FormControl>
                                                       <Input type="number" {...formField} className="h-8 border-blue-300 focus-visible:ring-blue-500 font-bold" />
                                                   </FormControl>
                                                   <FormDescription className="text-[9px]">Deduct for damage if needed.</FormDescription>
                                                   <FormMessage />
                                               </FormItem>
                                           )}
                                       />
                                       <FormField
                                            control={form.control}
                                            name={`items.${index}.reason`}
                                            render={({ field: formField }) => (
                                                <FormItem className="sm:col-span-3">
                                                    <FormLabel className="text-[10px] font-bold uppercase">Reason for Return</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g., Handle damage, size issue" {...formField} className="h-8" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                   </div>
                               )}
                            </div>
                        )
                    })}
                </div>
            )}
             
            <div className="space-y-2 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
                <h4 className="font-black text-xs uppercase tracking-widest text-primary">Accounting Summary</h4>
                <div className="flex justify-between text-sm"><span>Item Refund (Taxable)</span><span className="font-bold">₹{totals.subTotalRefund.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                 <div className="flex justify-between text-sm border-b pb-2"><span>Tax (GST) Refund</span><span className="font-bold">₹{totals.gstRefund.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                
                <div className="flex justify-between items-center font-black text-2xl pt-2">
                    <span className="tracking-tighter uppercase">Net Credit Refund</span>
                    <span className="text-primary tracking-tighter">₹{totals.totalRefundAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="font-black uppercase tracking-widest">Complete Return</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
