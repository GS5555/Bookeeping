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
import { PurchaseOrder, Product, Vendor, Courier, InventoryItem, Category, SubCategory } from "@/lib/types";
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
import { CalendarIcon, PlusCircle, Trash2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

const STORE_ID = 'store_main';

const poItemSchema = z.object({
    productId: z.string().optional(),
    sku: z.string().default(''),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1.").default(1),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").default(0),
    hsnCode: z.string().optional().default(""),
    gstRate: z.number().default(0),
    productName: z.string().optional().default(""),
});

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  purchaseType: z.enum(["GST", "Cash"]),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedDeliveryDate: z.date({ required_error: "Expected delivery date is required." }),
  items: z.array(poItemSchema).min(1, "At least one item is required."),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"]),
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially Paid"]),
  comments: z.string().optional().default(""),
  courierCompany: z.string().optional().default(""),
  trackingNumber: z.string().optional().default(""),
  trackingLink: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional().default(""),
  numberOfBoxes: z.coerce.number().int().min(1).default(1),
});

type POFormValues = z.infer<typeof formSchema>;

interface PODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (po: Omit<PurchaseOrder, 'id' | 'purchaseOrderNumber'>) => void;
}

export function PurchaseOrderDialog({ open, onOpenChange, onSuccess }: PODialogProps) {
  const firestore = useFirestore();

  const vendorsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name')) : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const couriersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'couriers'), orderBy('name')) : null, [firestore]);
  const { data: couriers } = useCollection<Courier>(couriersRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const sortedVendors = useMemo(() => [...(vendors || [])].sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const sortedProducts = useMemo(() => [...(products || [])].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCouriers = useMemo(() => [...(couriers || [])].sort((a, b) => a.name.localeCompare(b.name)), [couriers]);
  
  const form = useForm<POFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      purchaseType: "GST",
      orderDate: new Date(),
      expectedDeliveryDate: addDays(new Date(), 7),
      items: [{ productId: "", sku: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0 }],
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
        append({ productId: "", sku: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0 });
    }
  }, [open, reset, append]);

  const totals = useMemo(() => {
    let sub = 0;
    let gst = 0;
    watchedItems.forEach(item => {
        const lineSub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        sub += lineSub;
        if (watchedPurchaseType === 'GST') {
            gst += lineSub * ((Number(item.gstRate) || 0) / 100);
        }
    });
    const rawTotal = sub + gst;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    return { 
        subTotal: sub, 
        gstAmount: gst, 
        totalAmount: roundedTotal,
        roundOffAmount: roundOff
    };
  }, [watchedItems, watchedPurchaseType]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = watchedItems.findIndex((item, i) => item.productId === productId && i !== index);
    
    if (existingIndex > -1) {
        const currentQty = Number(getValues(`items.${existingIndex}.quantity`)) || 0;
        setValue(`items.${existingIndex}.quantity`, currentQty + (Number(getValues(`items.${index}.quantity`)) || 1));
        remove(index);
        toast({ title: "Item consolidated", description: `${product.name} quantity updated.` });
    } else {
        setValue(`items.${index}.productId`, product.id);
        setValue(`items.${index}.sku`, product.sku);
        setValue(`items.${index}.productName`, product.name);
        setValue(`items.${index}.unitPrice`, product.purchasePrice);
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.gstRate`, product.gstRate);
        
        if (index === watchedItems.length - 1) {
            append({ productId: "", sku: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0 });
        }
    }
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
            productId: item.productId!,
            sku: item.sku || product?.sku || '',
            productName: product?.name || 'Unknown Product',
            quantity: item.quantity,
            quantityReceived: 0,
            unitCost: item.unitPrice,
            totalCost: item.quantity * item.unitPrice,
            hsnCode: item.hsnCode || '',
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
      subTotal: totals.subTotal,
      gstAmount: totals.gstAmount,
      cgstAmount: totals.gstAmount / 2,
      sgstAmount: totals.gstAmount / 2,
      igstAmount: 0,
      roundOffAmount: totals.roundOffAmount,
      totalAmount: totals.totalAmount,
      comments: data.comments || "",
      courierCompany: data.courierCompany || "",
      trackingNumber: data.trackingNumber || "",
      trackingLink: data.trackingLink || "",
      numberOfBoxes: data.numberOfBoxes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Fill in the details to place a new order with a vendor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="po-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 overflow-visible">
                <FormField control={form.control} name="vendorId" render={({ field }) => (
                    <FormItem className="overflow-visible">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor <span className="text-destructive font-black">*</span></FormLabel>
                        <Combobox
                            options={sortedVendors?.map(v => ({ value: v.id, label: v.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a vendor"
                            searchPlaceholder="Type name..."
                            notFoundText="No vendor found."
                        />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", sku: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </div>
                {fields.map((field, index) => {
                    const selectedProdId = watchedItems[index]?.productId;
                    const product = products?.find(p => p.id === selectedProdId);
                    const stockItem = inventory?.find(i => i.productId === selectedProdId);
                    const currentStock = stockItem?.stockBatches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
                    const category = categories?.find(c => c.id === product?.category);
                    const subCategory = subCategories?.find(sc => sc.id === product?.subCategory);

                    return (
                        <Card key={field.id} className={cn("border-2 shadow-sm overflow-visible", selectedProdId ? "bg-primary/[0.03] border-primary/20" : "bg-card")}>
                            <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item #{index + 1}</span>
                                    {product && (
                                        <div className="flex gap-1 flex-wrap">
                                            <Badge className="text-[9px] font-black h-5 bg-blue-100 text-blue-700 border-blue-200 uppercase">SKU: {product.sku}</Badge>
                                            <Badge className="text-[9px] font-black h-5 bg-green-100 text-green-700 border-green-200 uppercase">GST: {product.gstRate}%</Badge>
                                            <Badge className={cn("text-[9px] font-black h-5 uppercase", currentStock < 10 ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200")}>
                                                Stock: {currentStock}
                                            </Badge>
                                            {category && <Badge className="text-[9px] font-black h-5 bg-purple-100 text-purple-700 border-purple-200 uppercase">CAT: {category.name}</Badge>}
                                            {subCategory && <Badge className="text-[9px] font-black h-5 bg-orange-100 text-orange-700 border-orange-200 uppercase">SUB: {subCategory.name}</Badge>}
                                        </div>
                                    )}
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end overflow-visible">
                                <div className="sm:col-span-6 overflow-visible">
                                    <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                        <FormItem className="overflow-visible">
                                            <Combobox
                                                options={sortedProducts?.map(p => ({ 
                                                    value: p.id, 
                                                    label: `${p.name} (${p.sku})`,
                                                    searchTerms: `${p.name} ${p.sku}`.toLowerCase()
                                                })) || []}
                                                value={f.value || ''}
                                                onChange={(val) => handleProductSelect(val, index)}
                                                placeholder="Search products..."
                                                searchPlaceholder="Type name or SKU..."
                                                notFoundText="No product found."
                                            />
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => <Input type="number" {...f} className="h-10 border-muted-foreground/50 bg-background" />} />
                                </div>
                                <div className="sm:col-span-4">
                                    <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => <Input type="number" {...f} className="h-10 font-black border-muted-foreground/50 bg-background" />} />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping & Logistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="courierCompany" render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl><SelectTrigger className="h-9 border-muted-foreground/50 bg-background"><SelectValue placeholder="Select Courier" /></SelectTrigger></FormControl>
                                <SelectContent>{sortedCouriers?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="trackingNumber" render={({ field }) => <FormItem><FormControl><Input placeholder="Tracking #" {...field} className="h-9 border-muted-foreground/50 bg-background" /></FormControl></FormItem>} />
                    <FormField control={form.control} name="numberOfBoxes" render={({ field }) => <FormItem><FormControl><Input type="number" {...field} className="h-9 border-muted-foreground/50 bg-background" /></FormControl></FormItem>} />
                </div>
            </div>

            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-inner space-y-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{totals.subTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm border-y py-2 border-primary/10"><span>Tax (GST)</span><span className="font-bold">₹{totals.gstAmount.toLocaleString()}</span></div>
                {Math.abs(totals.roundOffAmount) > 0.01 && (
                    <div className="flex justify-between text-xs italic text-muted-foreground">
                        <span>Round Off Adjustment</span>
                        <span className={cn("font-medium", totals.roundOffAmount < 0 ? "text-destructive" : "text-green-600")}>
                            {totals.roundOffAmount < 0 ? '-' : '+'}₹{Math.abs(totals.roundOffAmount).toFixed(2)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-4"><span className="text-xl font-black uppercase">Total Amount</span><span className="text-3xl font-black text-primary tracking-tighter">₹{totals.totalAmount.toLocaleString()}</span></div>
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
