'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PurchaseOrder, Product, Vendor, Store, Courier, Category, SubCategory, HandPreference } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2, Truck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const STORE_ID = 'store_main';

const poItemSchema = z.object({
    productId: z.string().min(1, "Product is required."),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1.").default(1),
    unitCost: z.coerce.number().min(0, "Unit cost cannot be negative.").default(0),
    hsnCode: z.string(),
    gstRate: z.number(),
    imageUrl: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  purchaseType: z.enum(["GST", "Cash"]),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedDeliveryDate: z.date({ required_error: "Expected delivery date is required." }),
  items: z.array(poItemSchema).min(1, "At least one item is required."),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"]),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]),
  amountPaid: z.coerce.number().min(0).optional(),
  comments: z.string().optional(),
  courierCompany: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingLink: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
  numberOfBoxes: z.coerce.number().int().min(1, "Number of boxes must be at least 1.").default(1),
});

type POFormValues = z.infer<typeof formSchema>;

interface PODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (po: Omit<PurchaseOrder, 'id' | 'purchaseOrderNumber'>) => void;
}

export function PurchaseOrderDialog({ open, onOpenChange, onSuccess }: PODialogProps) {
  const firestore = useFirestore();
  const [productSearchOpen, setProductSearchOpen] = useState<{ [key: number]: boolean }>({});

  const vendorsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name')) : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const couriersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'couriers'), orderBy('name')) : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);

  const sortedVendors = useMemo(() => vendors?.sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCouriers = useMemo(() => couriers?.sort((a, b) => a.name.localeCompare(b.name)), [couriers]);
  
  const form = useForm<POFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      purchaseType: "GST",
      orderDate: new Date(),
      expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      items: [{ productId: "", quantity: 1, unitCost: 0, hsnCode: '', gstRate: 0 }],
      paymentMethod: 'Other',
      paymentStatus: 'Unpaid',
      comments: '',
      courierCompany: "",
      trackingNumber: "",
      trackingLink: "",
      numberOfBoxes: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { setValue, reset, watch, getValues } = form;

  const watchedItems = watch("items") || [];
  const watchedPurchaseType = watch("purchaseType");

  useEffect(() => {
    if (open) {
        reset();
        append({ productId: "", quantity: 1, unitCost: 0, hsnCode: '', gstRate: 0 });
    }
  }, [open, reset, append]);

  const { subTotal, totalAmount, gstAmount } = useMemo(() => {
    let sub = 0;
    let gst = 0;
    watchedItems.forEach(item => {
        const lineSub = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        sub += lineSub;
        if (watchedPurchaseType === 'GST') {
            gst += lineSub * ((Number(item.gstRate) || 0) / 100);
        }
    });
    return { subTotal: sub, gstAmount: gst, totalAmount: Math.round(sub + gst) };
  }, [watchedItems, watchedPurchaseType]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
        setValue(`items.${index}.productId`, product.id);
        setValue(`items.${index}.unitCost`, product.purchasePrice);
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.gstRate`, product.gstRate);
        
        if (index === watchedItems.length - 1) {
            append({ productId: "", quantity: 1, unitCost: 0, hsnCode: '', gstRate: 0 });
        }
    }
    setProductSearchOpen(prev => ({ ...prev, [index]: false }));
  }

  const onSubmit = (data: POFormValues) => {
    const vendor = vendors?.find(v => v.id === data.vendorId);
    if (!vendor) return;

    const validItems = data.items.filter(i => i.productId && i.productId !== "");
    if (validItems.length === 0) {
        toast({ title: "Validation Error", description: "At least one product must be selected.", variant: "destructive" });
        return;
    }

    const poItems = validItems.map(item => {
        const product = products?.find(p => p.id === item.productId);
        return {
            productId: item.productId,
            productName: product?.name || 'Unknown Product',
            quantity: item.quantity,
            quantityReceived: 0,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            hsnCode: item.hsnCode,
            gstRate: item.gstRate,
        }
    });

    onSuccess({
      storeId: STORE_ID,
      deliveryStoreId: STORE_ID,
      vendorId: vendor.id,
      vendorName: vendor.name,
      purchaseType: data.purchaseType,
      orderDate: data.orderDate.toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate.toISOString(),
      paymentDueDate: addDays(data.orderDate, 30).toISOString(),
      status: 'Pending',
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      items: poItems as any,
      subTotal,
      gstAmount,
      cgstAmount: gstAmount / 2,
      sgstAmount: gstAmount / 2,
      igstAmount: 0,
      totalAmount,
      comments: data.comments,
      courierCompany: data.courierCompany,
      trackingNumber: data.trackingNumber,
      trackingLink: data.trackingLink,
      numberOfBoxes: data.numberOfBoxes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Fill in the details to place a new order with a vendor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="po-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor <span className="text-destructive font-black">*</span></FormLabel>
                        <FormControl>
                            <Combobox
                                options={sortedVendors?.map(v => ({ value: v.id, label: v.name })) || []}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a vendor"
                                searchPlaceholder="Search vendors..."
                                notFoundText="No vendor found."
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="purchaseType" render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Purchase Type</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="GST" /></FormControl><FormLabel className="font-normal">GST</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )}/>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <FormLabel className="text-lg font-black uppercase tracking-tight">Line Items</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1, unitCost: 0, hsnCode: '', gstRate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </div>
                {fields.map((field, index) => (
                    <Card key={field.id} className="border-2 shadow-sm overflow-hidden bg-accent/5">
                        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item #{index + 1}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-6">
                                <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                    <FormItem>
                                        <Popover open={productSearchOpen[index]} onOpenChange={(o) => setProductSearchOpen(prev => ({ ...prev, [index]: o }))}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between h-10 font-normal border-muted-foreground/50">
                                                    <span className="truncate">{f.value ? products?.find(p => p.id === f.value)?.name : "Search products..."}</span>
                                                    <Search className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search Name or SKU..." />
                                                    <CommandList>
                                                        <CommandEmpty>No results.</CommandEmpty>
                                                        <CommandGroup>
                                                            {sortedProducts?.map(p => (
                                                                <CommandItem key={p.id} value={`${p.name} ${p.sku}`} onSelect={() => handleProductSelect(p.id, index)}>
                                                                    <div className="flex flex-col"><span className="font-bold">{p.name}</span><span className="text-[10px] opacity-70">SKU: {p.sku}</span></div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="sm:col-span-2">
                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => <Input type="number" {...f} className="h-10 border-muted-foreground/50" />} />
                            </div>
                            <div className="sm:col-span-4">
                                <FormField control={form.control} name={`items.${index}.unitCost`} render={({ field: f }) => <Input type="number" {...f} className="h-10 font-black border-muted-foreground/50" />} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping & Logistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="courierCompany" render={({ field }) => (
                        <FormItem className="lg:col-span-2"><FormLabel className="text-[10px] font-bold uppercase">Courier</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-9 border-muted-foreground/50"><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent>{sortedCouriers?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                    )}/>
                    <FormField control={form.control} name="trackingNumber" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-bold uppercase">Tracking #</FormLabel><FormControl><Input {...field} className="h-9 border-muted-foreground/50" /></FormControl></FormItem>} />
                    <FormField control={form.control} name="numberOfBoxes" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-bold uppercase">Boxes</FormLabel><FormControl><Input type="number" {...field} className="h-9 border-muted-foreground/50" /></FormControl></FormItem>} />
                </div>
            </div>

            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-inner space-y-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{subTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm border-y py-2 border-primary/10"><span>Tax (GST)</span><span className="font-bold">₹{gstAmount.toLocaleString()}</span></div>
                <div className="flex justify-between items-center pt-4"><span className="text-xl font-black uppercase">Total Amount</span><span className="text-3xl font-black text-primary tracking-tighter">₹{totalAmount.toLocaleString()}</span></div>
            </div>
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            <Button type="submit" form="po-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Create PO</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
