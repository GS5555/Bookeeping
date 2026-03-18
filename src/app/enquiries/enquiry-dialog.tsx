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
import { Enquiry, Customer, Product, EnquiryStatus, InventoryItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { PlusCircle, Trash2, Edit, Package } from "lucide-react";
import { CustomerDialog } from "@/app/customers/customer-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STORE_ID = 'store_main';

const enquiryItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  gstRate: z.number().default(0),
  totalPrice: z.number().default(0),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  enquiry: z.string().min(5, "Please provide enquiry details."),
  status: z.string().min(1, "Status is required."),
  items: z.array(enquiryItemSchema).optional(),
});

type EnquiryFormValues = z.infer<typeof formSchema>;

interface EnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry?: Enquiry;
  onSuccess: (enquiry: Omit<Enquiry, 'id' | 'enquiryNumber'>) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
);

export function EnquiryDialog({ open, onOpenChange, enquiry, onSuccess }: EnquiryDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!enquiry?.id);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  
  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const inventoryRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'inventoryItems') : null, [firestore]);
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const statusesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'enquiryStatuses'), orderBy('name')) : null, [firestore]);
  const { data: statuses } = useCollection<EnquiryStatus>(statusesRef);

  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], status: "New" },
  });

  const { control, handleSubmit, reset, setValue, getValues, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items") || [];

  useEffect(() => {
    if (open) {
        if(enquiry) {
            setIsEditing(false);
            reset(enquiry);
        } else {
            setIsEditing(true);
            reset({ customerId: "", enquiry: "", status: "New", items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, gstRate: 0 }] });
        }
    }
  }, [open, enquiry, reset]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = products?.find(p => p.id === productId);
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
        setValue(`items.${index}.gstRate`, product.gstRate);
        
        // Auto-append logic
        if (index === watchedItems.length - 1) {
            append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, gstRate: 0 });
        }
    }
  }

  const onSubmit = (data: EnquiryFormValues) => {
    const customer = customers?.find(c => c.id === data.customerId);
    
    // Ignore empty line items
    const validItems = (data.items || []).filter(i => i.productId && i.productId !== "").map(item => ({
        ...item,
        totalPrice: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    }));

    onSuccess({
      storeId: STORE_ID,
      date: enquiry?.date || new Date().toISOString(),
      customerName: customer?.name || 'Unknown',
      ...data,
      items: validItems as any,
      createdBy: currentUser?.id,
      createdByName: currentUser?.displayName,
    } as any);
  };

  return (
    <>
      <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => { setValue('customerId', c.id); setIsCustomerDialogOpen(false); }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
            className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden" 
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 border-b">
            <div className="flex justify-between items-center pr-6">
                <div>
                    <DialogTitle>{enquiry?.id ? `Enquiry #${enquiry.enquiryNumber}` : "New Enquiry"}</DialogTitle>
                    <DialogDescription>Capture customer interests and leads.</DialogDescription>
                </div>
                {enquiry?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                    <Button onClick={() => setIsEditing(true)} size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                )}
            </div>
          </DialogHeader>
          <Form {...form}>
            <form id="enquiry-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 overflow-visible">
                  {isEditing ? (
                    <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem className="overflow-visible">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive">*</span></FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Combobox
                                        options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select customer"
                                        searchPlaceholder="Type name..."
                                        notFoundText="No customer found."
                                    />
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)} className="shrink-0 h-10 w-10"><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                        </FormItem>
                    )}/>
                  ) : <ReadOnlyField label="Customer" value={enquiry?.customerName} />}
                  {isEditing ? (
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger></FormControl><SelectContent>{statuses?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>
                    )}/>
                  ) : <ReadOnlyField label="Status" value={getValues('status')} />}
              </div>
              <FormField control={control} name="enquiry" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details <span className="text-destructive">*</span></FormLabel>{isEditing ? <FormControl><Textarea {...field} className="min-h-24" /></FormControl> : <div className="text-sm p-3 border rounded-md bg-muted whitespace-pre-wrap">{field.value}</div>}</FormItem>
              )}/>
              <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-lg font-black uppercase tracking-tight">Interested Products</Label>
                      {isEditing && <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, gstRate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>}
                  </div>
                  {fields.map((field, index) => {
                      const selectedProdId = watchedItems[index]?.productId;
                      const product = products?.find(p => p.id === selectedProdId);
                      const stockItem = inventory?.find(i => i.productId === selectedProdId);
                      const currentStock = stockItem?.stockBatches?.reduce((sum, b) => sum + b.quantity, 0) || 0;

                      return (
                        <Card key={field.id} className={cn("border-2 shadow-sm overflow-visible", selectedProdId ? "bg-primary/[0.03] border-primary/20" : "bg-accent/5")}>
                            <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Item #{index + 1}</span>
                                    {product && (
                                        <div className="flex gap-1">
                                            <Badge className="text-[9px] font-black h-5 bg-blue-100 text-blue-700 border-blue-200 uppercase">SKU: {product.sku}</Badge>
                                            <Badge className={cn("text-[9px] font-black h-5 uppercase", currentStock < 10 ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200")}>
                                                Stock: {currentStock}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                {isEditing && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end overflow-visible">
                                <div className="sm:col-span-10 overflow-visible">
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
                                                    onChange={(val) => handleProductSelect(val, index)}
                                                    placeholder="Select Product"
                                                    searchPlaceholder="Type name or SKU..."
                                                    notFoundText="No product found."
                                                />
                                            </FormItem>
                                        )}/>
                                    ) : <ReadOnlyField label="Product" value={getValues(`items.${index}.productName`)} />}
                                </div>
                                <div className="sm:col-span-2">
                                    {isEditing ? <FormField control={control} name={`items.${index}.quantity`} render={({ field: f }) => <FormItem><FormControl><Input type="number" {...f} className="h-10" /></FormControl></FormItem>} /> : <ReadOnlyField label="Qty" value={getValues(`items.${index}.quantity`)} />}
                                </div>
                            </CardContent>
                        </Card>
                      )
                  })}
              </div>
            </form>
          </Form>
          <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
              {isEditing ? <Button type="submit" form="enquiry-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Enquiry</Button> : null}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
