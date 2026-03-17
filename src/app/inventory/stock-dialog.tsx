'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { collection, query } from "firebase/firestore";
import { Product, Category, SubCategory, Vendor } from "@/lib/types";

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: allProducts } = useCollection<Product>(productsRef);

  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'categories')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'subCategories')) : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const filteredSubCategories = useMemo(() => {
      if (!selectedCategory || selectedCategory === 'all' || !subCategories) return [];
      return subCategories.filter(sc => sc.categoryId === selectedCategory);
  }, [selectedCategory, subCategories]);

  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    let prods = allProducts;
    if (selectedCategory && selectedCategory !== 'all') prods = prods.filter(p => p.category === selectedCategory);
    if (selectedSubCategory && selectedSubCategory !== 'all') prods = prods.filter(p => p.subCategory === selectedSubCategory);
    return prods.sort((a,b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedCategory, selectedSubCategory]);

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
          if (inventoryItem && allProducts) {
              const product = allProducts.find(p => p.id === inventoryItem.productId);
              setSelectedCategory(product?.category || 'all');
              setSelectedSubCategory(product?.subCategory || 'all');
          } else {
              setSelectedCategory('all');
              setSelectedSubCategory('all');
          }
      }
  }, [open, inventoryItem, form, allProducts]);
  
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
      <DialogContent className="max-w-[95vw] sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{inventoryItem ? `Adjust Stock for ${inventoryItem.productName}` : 'New Stock Entry'}</DialogTitle>
          <DialogDescription>Manually update inventory levels.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form id="stock-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
            {!inventoryItem && (
                 <div className="grid grid-cols-2 gap-4">
                    <Select value={selectedCategory} onValueChange={(value) => { setSelectedCategory(value); setSelectedSubCategory('all'); form.setValue('productId', ''); }}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.sort((a,b)=>a.name.localeCompare(b.name)).map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selectedSubCategory} onValueChange={(value) => { setSelectedSubCategory(value); form.setValue('productId', ''); }} disabled={filteredSubCategories.length === 0}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Sub-Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sub-Categories</SelectItem>
                        {filteredSubCategories.sort((a,b)=>a.name.localeCompare(b.name)).map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                </div>
            )}
            <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!inventoryItem}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a product" /></SelectTrigger></FormControl>
                    <SelectContent>{filteredProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl>
                    <SelectContent>{vendors?.sort((a,b)=>a.name.localeCompare(b.name)).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purchase Price (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} className="h-10"/></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quantity Adjustment</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 10 or -5" {...field} className="h-10 font-bold"/></FormControl>
                  <FormDescription className="text-[10px]">Positive adds stock, negative removes it.</FormDescription>
                  <FormMessage />
                </FormItem>
            )}/>
          </form>
        </Form>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 pt-4 border-t">
            <Button type="submit" form="stock-form" className="w-full sm:w-auto order-1 sm:order-2">Update Inventory</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
