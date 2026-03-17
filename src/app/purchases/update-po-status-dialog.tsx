

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
import { PurchaseOrder } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const receiveItemSchema = z.object({
  productId: z.string(),
  quantityToReceive: z.coerce.number().int().min(0).default(0),
});

const formSchema = z.object({
  invoiceNumber: z.string().optional(),
  receiptDate: z.date({ required_error: "A receipt date is required." }),
  items: z.array(receiveItemSchema),
}).superRefine((data, ctx) => {
    const hasItemsToReceive = data.items.some(item => item.quantityToReceive > 0);
    if (!hasItemsToReceive) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "You must receive at least one item.",
            path: ['items'],
        });
    }
});

export interface ReceivedStockInfo {
    poId: string;
    invoiceNumber?: string;
    receiptDate: Date;
    items: z.infer<typeof receiveItemSchema>[];
}

interface UpdatePoStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  onSuccess: (receivedInfo: ReceivedStockInfo) => void;
}

export function UpdatePoStatusDialog({ open, onOpenChange, purchaseOrder, onSuccess }: UpdatePoStatusDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      receiptDate: new Date(),
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (purchaseOrder && open) {
        const defaultItems = purchaseOrder.items.map(item => ({
            productId: item.productId,
            quantityToReceive: 0
        }));
        
        const validationSchema = z.object({
          invoiceNumber: z.string().optional(),
          receiptDate: z.date({ required_error: "A receipt date is required." }),
          items: z.array(receiveItemSchema.superRefine((data, ctx) => {
              const poItem = purchaseOrder.items.find(i => i.productId === data.productId);
              if (poItem) {
                  const remaining = poItem.quantity - (poItem.quantityReceived || 0);
                  if (data.quantityToReceive > remaining) {
                      ctx.addIssue({
                          code: z.ZodIssueCode.custom,
                          message: `Cannot receive more than remaining ${remaining}.`,
                          path: ['quantityToReceive']
                      });
                  }
              }
          })).superRefine((data, ctx) => {
               if (!data.some(item => item.quantityToReceive > 0)) {
                  ctx.addIssue({
                      code: z.ZodIssueCode.custom,
                      message: "You must receive at least one item.",
                      path: []
                  });
              }
          })
        });

        form.reset({
            invoiceNumber: "",
            receiptDate: new Date(),
            items: defaultItems
        });
        (form as any).resolver = zodResolver(validationSchema);

    }
  }, [purchaseOrder, open, replace, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onSuccess({
        poId: purchaseOrder.id,
        invoiceNumber: data.invoiceNumber,
        receiptDate: data.receiptDate,
        items: data.items
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
          <DialogDescription>
            Update received quantities for PO #{purchaseOrder.purchaseOrderNumber}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="receiptDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Receipt</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Invoice # (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., INV-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {fields.map((field, index) => {
                const poItem = purchaseOrder.items[index];
                if (!poItem) return null;
                 return (
                    <div key={field.id} className="space-y-2 border p-3 rounded-lg">
                        <p className="font-medium">{poItem.productName}</p>
                        <p className="text-xs text-muted-foreground">
                            Ordered: {poItem.quantity} | Received: {poItem.quantityReceived || 0} | Remaining: {poItem.quantity - (poItem.quantityReceived || 0)}
                        </p>
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantityToReceive`}
                            render={({ field: formField }) => (
                                <FormItem>
                                    <FormLabel>Receive Now</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            {...formField}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )
            })}
             <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Receive Stock</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
