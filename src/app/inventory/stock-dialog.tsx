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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Product, Vendor } from "@/lib/types";
import { Combobox } from "@/components/ui/combobox";

const STORE_ID = 'store_main';

const formSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  vendorId: z.string().min(1, "Vendor is required."),
  storeId: z.string().min(1, "Store is required."),
  quantity: z.coerce.number().int().refine(val => val !== 0, { message: "Quantity cannot be zero." }),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive."),
});

export type StockFormValues = z.infer<typeof formSchema>;

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: StockFormValues) => void;
  inventoryItem?: any;
}

export function StockDialog({ open, onOpenChange, onSuccess, inventoryItem }: StockDialogProps) {
  const firestore = useFirestore();

  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: allProducts } = useCollection<Product>(productsRef);

  const vendorsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name')) : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const sortedProducts = useMemo(() => allProducts?.sort((a,b) => a.name.localeCompare(b.name)), [allProducts]);
  const sortedVendors = useMemo(() => vendors?.sort((a,b) => a.name.localeCompare(b.name)), [vendors]);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { productId: "", vendorId: "", storeId: STORE_ID, quantity: 1, purchasePrice: 0 },
  });

  useEffect(() => {
      if(open) {
          form.reset({
              productId: inventoryItem?.productId || '',
              vendorId: inventoryItem?.vendorId || '',
              storeId: STORE_ID,
              quantity: 1,
              purchasePrice: inventoryItem?.purchasePrice || 0,
          });
      }
  }, [open, inventoryItem, form]);
  
  const watchedProductId = form.watch('productId');
  useEffect(() => {
      if(watchedProductId) {
        const product = allProducts?.find(p => p.id === watchedProductId);
        if (product) {
            form.setValue('purchasePrice', product.purchasePrice);
            if(product.vendorId) form.setValue('vendorId', product.vendorId);
        }
      }
  }, [watchedProductId, allProducts, form]);

  const onSubmit = (data: StockFormValues) => {
    onSuccess(data);
    form.reset();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{inventoryItem ? `Adjust Stock: ${inventoryItem.productName}` : 'New Stock Entry'}</DialogTitle>
          <DialogDescription>Manually update inventory levels for a specific product.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="stock-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
            <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product <span className="text-destructive font-black">*</span></FormLabel>
                  <FormControl>
                      <Combobox
                          options={sortedProducts?.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a product"
                          searchPlaceholder="Type name..."
                          notFoundText="No product found."
                          disabled={!!inventoryItem}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor <span className="text-destructive font-black">*</span></FormLabel>
                  <FormControl>
                      <Combobox
                          options={sortedVendors?.map(v => ({ value: v.id, label: v.name })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a vendor"
                          searchPlaceholder="Type name..."
                          notFoundText="No vendor found."
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest">Price (₹)</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-10"/></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest">Qty (+/-)</FormLabel>
                    <FormControl><Input type="number" {...field} className="h-10 font-bold"/></FormControl>
                    </FormItem>
                )}/>
            </div>
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            <Button type="submit" form="stock-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Update Stock</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
