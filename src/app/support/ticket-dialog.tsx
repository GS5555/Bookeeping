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
import { SupportTicket, Customer, Sale, Vendor } from "@/lib/types";
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
import { Combobox } from "@/components/ui/combobox";

const STORE_ID = 'store_main';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  saleId: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  status: z.enum(["Open", "In Progress", "Closed"]),
  priority: z.enum(["Low", "Medium", "High"]),
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
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

  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedVendors = useMemo(() => vendors?.sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const { watch, reset, control, getValues } = form;
  const watchedCustomerId = watch("customerId");

  const filteredSales = useMemo(() => {
    if (!watchedCustomerId || !sales) return [];
    return sales.filter(s => s.customerId === watchedCustomerId).sort((a,b) => b.saleDate.localeCompare(a.saleDate));
  }, [watchedCustomerId, sales]);
  
  useEffect(() => {
    if(open) {
      if (ticket) {
        setIsEditing(false);
        reset(ticket);
      } else {
        setIsEditing(true);
        reset({ customerId: "", saleId: "", subject: "", description: "", status: "Open", priority: "Medium", vendorId: "" });
      }
    }
  }, [open, ticket, reset]);

  const onSubmit = (data: TicketFormValues) => {
    const customerName = customers?.find(c => c.id === data.customerId)?.name || 'Unknown';
    let ticketId = ticket?.ticketId;
    
    if (!ticketId) {
        const lastNum = allTickets.reduce((max, t) => {
            const num = parseInt(t.ticketId.split('-').pop() || '0');
            return num > max ? num : max;
        }, 0);
        ticketId = `TKT-${new Date().getFullYear()}-${String(lastNum + 1).padStart(3, '0')}`;
    }

    onSuccess({
      id: ticket?.id || `tkt_${Date.now()}`,
      createdAt: ticket?.createdAt || new Date().toISOString(),
      ...data,
      customerName,
      ticketId,
    } as SupportTicket);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
           <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{ticket ? `Ticket #${ticket.ticketId}` : "Create Ticket"}</DialogTitle>
              <DialogDescription>Resolve customer inquiries and issues.</DialogDescription>
            </div>
            {ticket && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)} size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
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
                    <FormControl>
                        <Combobox
                            options={sortedCustomers?.map(c => ({ value: c.id, label: c.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select customer"
                            searchPlaceholder="Type name..."
                            notFoundText="No customer found."
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject <span className="text-destructive font-black">*</span></FormLabel><FormControl><Input {...field} className="h-10" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description <span className="text-destructive font-black">*</span></FormLabel><FormControl><Textarea {...field} className="min-h-24" /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={control} name="status" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select></FormItem>
                  )}/>
                  <FormField control={control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></FormItem>
                  )}/>
                </div>
              </>
            ) : (
                <div className="space-y-4 pt-2">
                    <ReadOnlyField label="Customer" value={ticket?.customerName} />
                    <ReadOnlyField label="Subject" value={getValues('subject')} />
                    <ReadOnlyField label="Description" value={getValues('description')} />
                    <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Status" value={getValues('status')} />
                        <ReadOnlyField label="Priority" value={getValues('priority')} />
                    </div>
                </div>
            )}
          </form>
        </Form>
        <DialogFooter className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
            {isEditing ? <Button type="submit" form="ticket-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Ticket</Button> : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
