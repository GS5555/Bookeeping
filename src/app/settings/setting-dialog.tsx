

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
import { Category, SubCategory, Brand, Color, Courier, Company, ExpenseType, Warranty, HandPreference, EnquiryStatus, CustomerType, VendorType } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Item = Category | SubCategory | Brand | Color | Courier | Company | ExpenseType | Warranty | HandPreference | EnquiryStatus | CustomerType | VendorType;
type ItemType = 'Category' | 'Sub-Category' | 'Brand' | 'Color' | 'Courier' | 'Company' | 'Expense Type' | 'Warranty' | 'Hand Preference' | 'Enquiry Status' | 'Customer Type' | 'Vendor Type';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  gstRate: z.coerce.number().optional(),
  categoryId: z.string().optional(),
  hsnCode: z.string().optional(),
  trackingUrl: z.string().url("Please enter a valid URL.").or(z.literal("")).optional(),
  duration: z.string().optional(),
});

type SettingFormValues = z.infer<typeof formSchema>;

interface SettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  itemType: ItemType | null;
  categories: Category[];
  onSuccess: (itemType: ItemType, item: Item) => void;
}

export function SettingDialog({ open, onOpenChange, item, itemType, categories, onSuccess }: SettingDialogProps) {
  
  const form = useForm<SettingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", gstRate: 0, categoryId: "", hsnCode: "", trackingUrl: "", duration: "" },
  });
  
  useEffect(() => {
    if (open && item) {
        form.reset({ 
            name: item.name,
            gstRate: 'gstRate' in item ? item.gstRate : undefined,
            categoryId: 'categoryId' in item ? item.categoryId : '',
            hsnCode: 'hsnCode' in item ? item.hsnCode : '',
            trackingUrl: 'trackingUrl' in item ? item.trackingUrl : '',
            duration: 'duration' in item ? item.duration : '',
        });
    } else if (open) {
        form.reset({ name: "", gstRate: 0, categoryId: "", hsnCode: "", trackingUrl: "", duration: "" });
    }
  }, [item, form, open]);

  const watchedCategoryId = form.watch("categoryId");

  useEffect(() => {
    if (itemType === 'Sub-Category' && watchedCategoryId && categories) {
        const parentCategory = categories.find(c => c.id === watchedCategoryId);
        if(parentCategory) {
            if(parentCategory.hsnCode) form.setValue('hsnCode', parentCategory.hsnCode);
            if(parentCategory.gstRate) form.setValue('gstRate', parentCategory.gstRate);
        }
    }
  }, [watchedCategoryId, categories, itemType, form]);


  const onSubmit = (data: SettingFormValues) => {
    if (!itemType) return;
    
    if(itemType === 'Sub-Category' && !data.categoryId) {
        form.setError('categoryId', { type: 'manual', message: 'Parent category is required.' });
        return;
    }
    
    if (itemType === 'Warranty' && !data.duration) {
      form.setError('duration', { type: 'manual', message: 'Duration code is required.' });
      return;
    }

    const submittedItem: Partial<Item> & { name: string } = {
      id: item?.id || '', // ID is handled by parent on creation
      name: data.name,
    };

    if (itemType === 'Category') {
        (submittedItem as Category).hsnCode = data.hsnCode;
        (submittedItem as Category).gstRate = data.gstRate;
    }
    if (itemType === 'Sub-Category' && data.categoryId) {
        (submittedItem as SubCategory).categoryId = data.categoryId;
        (submittedItem as SubCategory).hsnCode = data.hsnCode;
        (submittedItem as SubCategory).gstRate = data.gstRate;
    }
    if (itemType === 'Courier') {
        (submittedItem as Courier).trackingUrl = data.trackingUrl;
    }
    if (itemType === 'Warranty') {
        (submittedItem as Warranty).duration = data.duration || '';
    }

    onSuccess(itemType, submittedItem as Item);
  };
  
  const dialogTitle = `${item ? "Edit" : "Add"} ${itemType}`;
  const dialogDescription = `Enter the details for the ${itemType?.toLowerCase()}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {itemType === 'Sub-Category' && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a parent category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`${itemType} name`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {itemType === 'Warranty' && (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1m, 6m, 1y" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use 'm' for months and 'y' for years.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {(itemType === 'Sub-Category' || itemType === 'Category') && (
                <>
                <FormField
                  control={form.control}
                  name="hsnCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HSN Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter HSN Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gstRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

             {itemType === 'Courier' && (
                 <FormField
                  control={form.control}
                  name="trackingUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://courier.com/track?id=" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
