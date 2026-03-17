
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
import { collection } from "firebase/firestore";
import { Combobox } from "@/components/ui/combobox";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Edit } from "lucide-react";
import { format } from "date-fns";

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
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function RepairDialog({ open, onOpenChange, repair, onSuccess }: RepairDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!repair);
  
  const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
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
          reset({
              customerId: "",
              productId: "",
              issueDescription: "",
              status: "Pending",
              estimatedCost: 0,
              actualCost: 0,
          });
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
  
  const dialogTitle = repair ? (isEditing ? "Edit Repair Job" : "View Repair Job") : "Add New Repair Job";
  const dialogDescription = repair 
    ? `Details for repair job #${repair.id.slice(-6)}`
    : "Fill in the details for a new repair job.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {repair && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            {isEditing ? (
              <>
                <FormField control={form.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                     <Combobox
                      options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a customer..."
                      searchPlaceholder="Search customers..."
                      notFoundText="No customer found."
                    />
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedProducts?.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="issueDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Handle is broken, needs replacement." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="estimatedCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Cost (₹)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                 <FormField control={form.control} name="actualCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Cost (₹)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
              </>
            ) : (
              <div className="space-y-4">
                <ReadOnlyField label="Customer" value={customers?.find(c => c.id === getValues('customerId'))?.name} />
                <ReadOnlyField label="Product" value={products?.find(p => p.id === getValues('productId'))?.name} />
                <ReadOnlyField label="Issue Description" value={getValues('issueDescription')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label="Status" value={getValues('status')} />
                    <ReadOnlyField label="Estimated Cost" value={`₹${getValues('estimatedCost')?.toLocaleString() || '0'}`} />
                </div>
                <ReadOnlyField label="Actual Cost" value={getValues('actualCost') ? `₹${getValues('actualCost')?.toLocaleString()}` : 'Not set'} />
                <ReadOnlyField label="Created On" value={repair?.createdAt ? format(new Date(repair.createdAt), 'PPP') : 'N/A'} />
                <ReadOnlyField label="Completed On" value={repair?.completedAt ? format(new Date(repair.completedAt), 'PPP') : 'Not completed'} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              {isEditing && <Button type="submit">Save Repair Job</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
