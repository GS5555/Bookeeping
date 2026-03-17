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
import { Textarea } from "@/components/ui/textarea";
import { Coupon } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters.").toUpperCase(),
  description: z.string().min(1, "Description is required."),
  discountType: z.enum(["percentage", "fixed"], {
    required_error: "You need to select a discount type.",
  }),
  discountValue: z.coerce.number().positive("Discount value must be positive."),
  minPurchaseAmount: z.coerce.number().min(0, "Minimum purchase amount cannot be negative."),
  validUntil: z.date({
    required_error: "An expiration date is required.",
  }),
  maxUses: z.coerce.number().int().positive("Max uses must be a positive integer."),
  isActive: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof formSchema>;

interface CouponDialogProps {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon;
  onSuccess: (coupon: Coupon) => void;
}

export function CouponDialog({ children, open, onOpenChange, coupon, onSuccess }: CouponDialogProps) {
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: coupon ? {
        ...coupon,
        validUntil: new Date(coupon.validUntil)
    } : {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      minPurchaseAmount: 0,
      maxUses: 100,
      isActive: true,
    },
  });

  const onSubmit = (data: CouponFormValues) => {
    const submittedCoupon: Coupon = {
      id: coupon?.id || `coup_${Date.now()}`,
      storeId: coupon?.storeId || 'store_123',
      createdAt: coupon?.createdAt || new Date(),
      timesUsed: coupon?.timesUsed || 0,
      validFrom: coupon?.validFrom || new Date(),
      ...data,
    };
    onSuccess(submittedCoupon);
  };
  
  const dialogTitle = coupon ? "Edit Coupon" : "Add New Coupon";
  const dialogDescription = coupon 
    ? `Editing coupon code: ${coupon.code}` 
    : "Fill in the details to create a new promotional coupon.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SUMMER25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 25% off on all bats" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Discount Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                        >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="percentage" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Percentage (%)
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="fixed" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Fixed Amount (₹)
                            </FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Value</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expires On</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                            Is this coupon currently active?
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Coupon</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
