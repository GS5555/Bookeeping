
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
import { useEffect, useMemo } from "react";
import { InventoryItem, Product, Store } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  fromStoreId: z.string().min(1, "Source store is required."),
  toStoreId: z.string().min(1, "Destination store is required."),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number."),
}).refine(data => data.fromStoreId !== data.toStoreId, {
    message: "Source and destination stores cannot be the same.",
    path: ["toStoreId"],
});

type StockTransferFormValues = z.infer<typeof formSchema>;

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: StockTransferFormValues) => void;
  inventory: InventoryItem[];
  products: Product[];
  stores: Store[];
}

export function StockTransferDialog({ open, onOpenChange, onSuccess, inventory, products, stores }: StockTransferDialogProps) {
  const form = useForm<StockTransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      fromStoreId: "",
      toStoreId: "",
      quantity: 1,
    },
  });
  
  const watchedProductId = form.watch("productId");
  const watchedFromStoreId = form.watch("fromStoreId");

  const availableStock = inventory.find(i => i.productId === watchedProductId && i.storeId === watchedFromStoreId)?.quantity || 0;
  
  const sortedProducts = useMemo(() => products?.sort((a,b) => a.name.localeCompare(b.name)), [products]);
  const sortedStores = useMemo(() => stores?.sort((a,b) => a.name.localeCompare(b.name)), [stores]);

  const onSubmit = (data: StockTransferFormValues) => {
    if(data.quantity > availableStock) {
        toast({
            title: "Insufficient Stock",
            description: `Only ${availableStock} units available in the source store.`,
            variant: "destructive",
        });
        return;
    }
    onSuccess(data);
    form.reset();
  };

  useEffect(() => {
      if(open) {
          form.reset({
              productId: "",
              fromStoreId: "",
              toStoreId: "",
              quantity: 1,
          });
      }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Move inventory between your store locations.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product to transfer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromStoreId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedStores.map(store => (
                          <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toStoreId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedStores.map(store => (
                          <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Transfer</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  {watchedProductId && watchedFromStoreId && (
                      <p className="text-xs text-muted-foreground">
                          Available to transfer: {availableStock}
                      </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Transfer Stock</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
