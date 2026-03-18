
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
import { SupportTicket, Customer, Sale, Vendor, Category, SubCategory } from "@/lib/types";
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { Edit } from "lucide-react";
import { format } from "date-fns";

const STORE_ID = 'store_main';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  saleId: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  status: z.enum(["Open", "In Progress", "Closed"]),
  priority: z.enum(["Low", "Medium", "High"]),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  vendorId: z.string().optional(),
});

type TicketFormValues = z.infer<typeof formSchema>;

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: SupportTicket;
  allTickets: SupportTicket[];
  onSuccess: (ticket: SupportTicket) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function TicketDialog({ open, onOpenChange, ticket, allTickets, onSuccess }: TicketDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!ticket);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);

  const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'sales') : null, [firestore]);
  const { data: sales } = useCollection<Sale>(salesRef);
  
  const vendorsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name')) : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'categories'), orderBy('name')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'subCategories'), orderBy('name')) : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedVendors = useMemo(() => vendors?.sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const sortedCategories = useMemo(() => categories?.sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const { watch, reset, control, getValues } = form;
  const watchedCustomerId = watch("customerId");
  const watchedCategoryId = watch("categoryId");

  const filteredSales = useMemo(() => {
    if (!watchedCustomerId || !sales) return [];
    return sales.filter(s => s.customerId === watchedCustomerId).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [watchedCustomerId, sales]);
  
  const filteredSubCategories = useMemo(() => {
    if (!watchedCategoryId || !subCategories) return [];
    return subCategories.filter(sc => sc.categoryId === watchedCategoryId).sort((a,b) => a.name.localeCompare(b.name));
  }, [watchedCategoryId, subCategories]);
  
  useEffect(() => {
    if(open) {
      if (ticket) {
        setIsEditing(false); // view mode
        reset(ticket);
      } else { // new ticket
        setIsEditing(true);
        reset({
            customerId: "",
            saleId: "",
            subject: "",
            description: "",
            status: "Open",
            priority: "Medium",
            categoryId: "",
            subCategoryId: "",
            vendorId: "",
        });
      }
    }
  }, [open, ticket, reset]);


  const onSubmit = (data: TicketFormValues) => {
    const customerName = customers?.find(c => c.id === data.customerId)?.name || 'Unknown';
    let ticketId = ticket?.ticketId;
    
    if (!ticketId) {
        const lastTicketIdNum = allTickets.reduce((max, t) => {
            const num = parseInt(t.ticketId.split('-')[2]);
            return num > max ? num : max;
        }, 0);
        const newIdNum = lastTicketIdNum + 1;
        ticketId = `TKT-${new Date().getFullYear()}-${String(newIdNum).padStart(3, '0')}`;
    }

    const submittedTicket: SupportTicket = {
      id: ticket?.id || `tkt_${Date.now()}`,
      createdAt: ticket?.createdAt || new Date().toISOString(),
      ...data,
      customerName,
      ticketId,
    };
    onSuccess(submittedTicket);
  };
  
  const dialogTitle = ticket ? (isEditing ? `Edit Ticket #${ticket.ticketId}` : `View Ticket #${ticket.ticketId}`) : "Create New Support Ticket";
  const dialogDescription = ticket 
    ? `Viewing ticket for ${ticket.customerName}` 
    : "Fill in the details to create a new support ticket.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
           <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {ticket && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form id="ticket-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isEditing ? (
              <>
                <FormField control={control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive font-black">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                        <SelectContent>{sortedCustomers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="saleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Related Sale (Optional)</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || ''} disabled={filteredSales.length === 0}>
                      <FormControl>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select a sale" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSales.map(sale => <SelectItem key={sale.id} value={sale.id}>#{sale.invoiceSequence}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject <span className="text-destructive font-black">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g., Broken bat handle" {...field} className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description <span className="text-destructive font-black">*</span></FormLabel>
                    <FormControl><Textarea placeholder="Provide a detailed description of the issue..." {...field} className="min-h-24" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="vendorId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assign to Vendor (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl>
                        <SelectContent>{sortedVendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</FormLabel>
                      <Select onValueChange={(value) => {field.onChange(value); form.setValue('subCategoryId', '')}} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>{sortedCategories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={control} name="subCategoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sub-Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={filteredSubCategories.length === 0}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select sub-category" /></SelectTrigger></FormControl>
                        <SelectContent>{filteredSubCategories.map(subCat => <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Priority" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </>
            ) : (
                <div className="space-y-4 pt-2">
                    <ReadOnlyField label="Customer" value={ticket?.customerName} />
                    <ReadOnlyField label="Related Sale" value={sales?.find(s => s.id === getValues('saleId'))?.invoiceSequence || 'N/A'} />
                    <ReadOnlyField label="Subject" value={getValues('subject')} />
                    <ReadOnlyField label="Description" value={getValues('description')} />
                    <ReadOnlyField label="Assigned Vendor" value={vendors?.find(v => v.id === getValues('vendorId'))?.name} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <ReadOnlyField label="Category" value={categories?.find(c => c.id === getValues('categoryId'))?.name} />
                         <ReadOnlyField label="Sub-Category" value={subCategories?.find(sc => sc.id === getValues('subCategoryId'))?.name} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ReadOnlyField label="Status" value={getValues('status')} />
                        <ReadOnlyField label="Priority" value={getValues('priority')} />
                    </div>
                     <ReadOnlyField label="Created On" value={ticket?.createdAt ? format(new Date(ticket.createdAt), 'PPP') : 'N/A'} />
                </div>
            )}
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            {isEditing ? (
                <Button type="submit" form="ticket-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Ticket</Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
