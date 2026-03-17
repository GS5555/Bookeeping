
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
  inventoryItem?: any; // Loosening type to handle aggregated product view
}

export function StockDialog({ open, onOpenChange, onSuccess, inventoryItem }: StockDialogProps) {
  const firestore = useFirestore();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stores', STORE_ID, 'products'));
  }, [firestore]);
  const { data: allProducts } = useCollection<Product>(productsCollectionRef);

  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);
  const sortedVendors = useMemo(() => vendors?.sort((a,b) => a.name.localeCompare(b.name)), [vendors]);

  const categoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'categories')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'subCategories')) : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const sortedCategories = useMemo(() => categories?.sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  const filteredSubCategories = useMemo(() => {
      if (!selectedCategory || !subCategories) return [];
      return subCategories.filter(sc => sc.categoryId === selectedCategory).sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [selectedCategory, subCategories]);

  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    let products = allProducts;
    if (selectedCategory && selectedCategory !== 'all') {
        const categoryDetails = categories?.find(c => c.id === selectedCategory);
        if(categoryDetails) {
            products = products.filter(p => p.category === categoryDetails.id);
        }
    }
    if (selectedSubCategory && selectedSubCategory !== 'all') {
         const subCategoryDetails = subCategories?.find(sc => sc.id === selectedSubCategory);
         if(subCategoryDetails) {
            products = products.filter(p => p.subCategory === subCategoryDetails.id);
         }
    }
    return products.sort((a,b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedCategory, selectedSubCategory, categories, subCategories]);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      vendorId: "",
      storeId: STORE_ID,
      quantity: 1,
      purchasePrice: 0,
    },
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
              setSelectedCategory(product?.category || '');
              setSelectedSubCategory(product?.subCategory || '');
          } else {
              setSelectedCategory('');
              setSelectedSubCategory('');
          }
      }
  }, [open, inventoryItem, form, allProducts]);
  
  const watchedProductId = form.watch('productId');
  useEffect(() => {
      if(watchedProductId) {
        const product = allProducts?.find(p => p.id === watchedProductId);
        if (product) {
            form.setValue('purchasePrice', product.purchasePrice);
            form.setValue('vendorId', product.vendorId);
        }
      }
  }, [watchedProductId, allProducts, form]);

  const onSubmit = (data: StockFormValues) => {
    onSuccess(data);
    form.reset();
  };
  
  const dialogTitle = inventoryItem ? `Adjust Stock for ${inventoryItem.productName}` : 'New Stock Entry';
  const dialogDescription = inventoryItem 
    ? `Use negative numbers to decrease stock (will be removed from oldest batches first).`
    : "Select a product and vendor for a new manual stock entry.";
    
  const formId = "stock-form";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-between items-start pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            <Button type="submit" form={formId}>Update Stock</Button>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!inventoryItem && (
                 <div className="grid grid-cols-2 gap-4">
                    <Select onValueChange={(value) => { setSelectedCategory(value); setSelectedSubCategory('all'); form.setValue('productId', ''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {sortedCategories?.map(category => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      onValueChange={(value) => { setSelectedSubCategory(value); form.setValue('productId', ''); }} 
                      disabled={filteredSubCategories.length === 0}
                      value={selectedSubCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sub-Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sub-Categories</SelectItem>
                        {filteredSubCategories.map(subCategory => (
                          <SelectItem key={subCategory.id} value={subCategory.id}>{subCategory.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            )}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!!inventoryItem}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredProducts?.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                   <Combobox
                      options={sortedVendors?.map(v => ({ value: v.id, label: v.name })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a vendor..."
                      searchPlaceholder="Search vendors..."
                      notFoundText="No vendor found."
                      disabled={!!inventoryItem?.vendorId}
                    />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="Enter purchase price for this batch" {...field} />
                    </FormControl>
                    <FormDescription>Defaults to product's current price.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10 or -5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Update Stock</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
