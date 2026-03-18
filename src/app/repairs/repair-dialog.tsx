"use client";

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
import { Repair, Customer, Product } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Edit, Search } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

const STORE_ID = 'store_main';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  productId: z.string().min(1, "Product is required."),
  issueDescription: z.string().min(10, "Please provide a detailed description of the issue."),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]),
  estimatedCost: z.coerce.number().min(0).optional(),
  actualCost: z.coerce.number().min(0).optional(),
});

type RepairFormValues = z.infer<typeof formSchema>;

interface RepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair?: Repair;
  onSuccess: (repair: Repair) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function RepairDialog({ open, onOpenChange, repair, onSuccess }: RepairDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!repair);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const productsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { getValues, reset } = form;

  useEffect(() => {
    if(open) {
      if (repair) {
          setIsEditing(false);
          reset(repair);
      } else {
          setIsEditing(true);
          reset({ customerId: "", productId: "", issueDescription: "", status: "Pending", estimatedCost: 0, actualCost: 0 });
      }
    }
  }, [open, repair, reset]);

  const onSubmit = (data: RepairFormValues) => {
    const submittedRepair: Repair = {
      id: repair?.id || `repair_${Date.now()}`,
      storeId: repair?.storeId || STORE_ID,
      createdAt: repair?.createdAt || new Date().toISOString(),
      ...data,
    };
    onSuccess(submittedRepair);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{repair ? "Repair Details" : "Add New Repair Job"}</DialogTitle>
              <DialogDescription>Track maintenance and repairs for customer equipment.</DialogDescription>
            </div>
            {repair && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)} size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form id="repair-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isEditing ? (
              <>
                <FormField control={form.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive font-black">*</span></FormLabel>
                    <FormControl>
                        <Combobox
                            options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a customer"
                            searchPlaceholder="Search customers..."
                            notFoundText="No customer found."
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product <span className="text-destructive font-black">*</span></FormLabel>
                    <FormControl>
                        <Combobox
                            options={sortedProducts?.map(p => ({ value: p.id, label: p.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a product"
                            searchPlaceholder="Search products..."
                            notFoundText="No product found."
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="issueDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Issue Description <span className="text-destructive font-black">*</span></FormLabel>
                    <FormControl><Textarea {...field} className="min-h-24 border-muted-foreground/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-10 border-muted-foreground/50"><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="estimatedCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Est. Cost (₹)</FormLabel>
                      <FormControl><Input type="number" {...field} className="h-10 border-muted-foreground/50" /></FormControl>
                    </FormItem>
                  )}/>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-2">
                <ReadOnlyField label="Customer" value={customers?.find(c => c.id === getValues('customerId'))?.name} />
                <ReadOnlyField label="Product" value={products?.find(p => p.id === getValues('productId'))?.name} />
                <ReadOnlyField label="Issue" value={getValues('issueDescription')} />
                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Status" value={getValues('status')} />
                    <ReadOnlyField label="Estimated Cost" value={`₹${getValues('estimatedCost')?.toLocaleString()}`} />
                </div>
              </div>
            )}
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            {isEditing ? <Button type="submit" form="repair-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Job</Button> : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
