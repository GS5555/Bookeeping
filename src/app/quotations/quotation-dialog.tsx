'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Quotation, Product, Customer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/hooks/use-toast";

const STORE_ID = 'store_main';

const quotationItemSchema = z.object({
    productId: z.string().optional(),
    productName: z.string().optional(),
    quantity: z.coerce.number().min(1).default(1),
    unitPrice: z.coerce.number().min(0).default(0),
    totalPrice: z.number().default(0),
    hsnCode: z.string().optional(),
    gstRate: z.number().default(0),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  date: z.date({ required_error: "Date is required." }),
  validUntil: z.date({ required_error: "Expiry is required." }),
  deliveryDate: z.date({ required_error: "Delivery date is required." }),
  items: z.array(quotationItemSchema).min(1, "At least one item required."),
  termsAndConditions: z.string().optional(),
  status: z.enum(["Draft", "Sent", "Converted", "Expired"]),
});

type QuotationFormValues = z.infer<typeof formSchema>;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Partial<Quotation>;
  onSuccess: (quotation: Omit<Quotation, 'id' | 'quotationNumber'>) => void;
  onConvertToSale?: (quotation: Quotation) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
);

export function QuotationDialog({ open, onOpenChange, quotation, onSuccess }: QuotationDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!quotation?.id);

  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  
  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const sortedProducts = useMemo(() => [...(products || [])].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCustomers = useMemo(() => [...(customers || [])].sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], status: 'Draft' },
  });

  const { control, handleSubmit, watch, setValue, reset, getValues } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items") || [];

  const totals = useMemo(() => {
    let subTotal = 0;
    let gstAmount = 0;
    watchedItems.forEach(item => {
        const linePrice = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        subTotal += linePrice;
        gstAmount += linePrice * ((Number(item.gstRate) || 0) / 100);
    });
    return { subTotal, gstAmount, totalAmount: Math.round(subTotal + gstAmount) };
  }, [watchedItems]);

  useEffect(() => {
    if (open) {
      if (quotation && quotation.id) {
        setIsEditing(false);
        reset({
          ...quotation,
          date: quotation.date ? new Date(quotation.date) : new Date(),
          validUntil: quotation.validUntil ? new Date(quotation.validUntil) : addDays(new Date(), 30),
          deliveryDate: quotation.deliveryDate ? new Date(quotation.deliveryDate) : addDays(new Date(), 7),
        } as any);
      } else {
        setIsEditing(true);
        reset({ customerId: "", date: new Date(), validUntil: addDays(new Date(), 30), deliveryDate: addDays(new Date(), 7), status: "Draft", items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0 }] });
      }
    }
  }, [open, quotation, reset]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = products?.find(prod => prod.id === productId); 
    if (!product) return;

    // Consolidation logic
    const existingIndex = watchedItems.findIndex((item, i) => item.productId === productId && i !== index);
    
    if (existingIndex > -1) {
        const currentQty = Number(getValues(`items.${existingIndex}.quantity`)) || 0;
        setValue(`items.${existingIndex}.quantity`, currentQty + (Number(getValues(`items.${index}.quantity`)) || 1));
        remove(index);
        toast({ title: "Item consolidated", description: `${product.name} quantity updated.` });
    } else {
        setValue(`items.${index}.productId`, product.id); 
        setValue(`items.${index}.productName`, product.name); 
        setValue(`items.${index}.unitPrice`, product.sellingPrice); 
        setValue(`items.${index}.hsnCode`, product.hsnCode); 
        setValue(`items.${index}.gstRate`, product.gstRate); 
        
        // Auto-append logic
        if (index === fields.length - 1) {
            append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0 });
        }
    }
  }

  const onSubmit = (data: QuotationFormValues) => {
    const customer = customers?.find(c => c.id === data.customerId);
    
    // Ignore empty line items
    const validItems = data.items.filter(i => i.productId && i.productId !== "").map(item => ({
        ...item,
        productId: item.productId!,
        productName: item.productName!,
        hsnCode: item.hsnCode || '',
        totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    }));
    
    if (validItems.length === 0) {
        toast({ title: "Error", description: "Select at least one product.", variant: "destructive" });
        return;
    }

    onSuccess({
      storeId: STORE_ID,
      customerName: customer?.name || 'Unknown',
      billingAddress: customer?.addresses.find(a => a.isPrimary) || ({} as any),
      ...data,
      items: validItems as any,
      date: data.date.toISOString(),
      validUntil: data.validUntil.toISOString(),
      deliveryDate: data.deliveryDate.toISOString(),
      subTotal: totals.subTotal,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
    } as any);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] flex flex-col p-0" 
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 border-b">
          <div className="flex justify-between items-center pr-6">
            <div><DialogTitle>{quotation?.id ? "View Quotation" : "New Quotation"}</DialogTitle></div>
            {quotation?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)} size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form id="quotation-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 overflow-visible">
                {isEditing ? (
                     <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem className="overflow-visible">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive">*</span></FormLabel>
                            <Combobox
                                options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select customer"
                                searchPlaceholder="Type name..."
                                notFoundText="No customer found."
                            />
                        </FormItem>
                    )}/>
                ) : <ReadOnlyField label="Customer" value={getValues('customerName')} />}
                {isEditing ? (
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Sent">Sent</SelectItem><SelectItem value="Converted">Converted</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select></FormItem>
                    )}/>
                 ) : <ReadOnlyField label="Status" value={getValues('status')} />}
            </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <Label className="text-lg font-black uppercase tracking-tight">Items</Label>
                    {isEditing && <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, hsnCode: "", gstRate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>}
                </div>
                {fields.map((field, index) => (
                    <Card key={field.id} className="border-2 shadow-sm bg-accent/5 overflow-visible">
                        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item #{index + 1}</span>
                            {isEditing && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-3 items-end overflow-visible">
                            {isEditing ? (
                                <FormField control={control} name={`items.${index}.productId`} render={({ field: f }) => (
                                    <FormItem className="overflow-visible">
                                        <Combobox 
                                            options={sortedProducts?.map(p => ({ 
                                                value: p.id, 
                                                label: `${p.name} (${p.sku})`,
                                                searchTerms: `${p.name} ${p.sku}`.toLowerCase()
                                            })) || []} 
                                            value={f.value || ""} 
                                            onChange={(v) => handleProductSelect(v, index)} 
                                            placeholder="Select Product" 
                                            searchPlaceholder="Type name or SKU..." 
                                            notFoundText="No product found." 
                                        />
                                    </FormItem>
                                )}/>
                            ) : <ReadOnlyField label="Product" value={getValues(`items.${index}.productName`)} />}
                            {isEditing ? <FormField control={control} name={`items.${index}.quantity`} render={({ field: f }) => <FormItem><FormControl><Input type="number" {...f} className="h-10"/></FormControl></FormItem>} /> : <ReadOnlyField label="Qty" value={getValues(`items.${index}.quantity`)} />}
                            {isEditing ? <FormField control={control} name={`items.${index}.unitPrice`} render={({ field: f }) => <FormItem><FormControl><Input type="number" {...f} className="h-10 font-black"/></FormControl></FormItem>} /> : <ReadOnlyField label="Price" value={`₹${getValues(`items.${index}.unitPrice`)?.toLocaleString()}`} />}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="rounded-2xl border-2 border-primary/20 p-6 sm:p-8 bg-primary/5 shadow-inner flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Est. Total</span>
                <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">₹{totals.totalAmount.toLocaleString()}</span>
            </div>
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            {isEditing ? <Button type="submit" form="quotation-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Quotation</Button> : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
