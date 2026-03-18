
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
import { Input } from "@/components/ui/input";
import { Enquiry, EnquiryFollowUp, Customer, Product, EnquiryStatus, EnquiryType, EnquirySource, FollowUpType, User } from "@/lib/types";
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
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table";
import { followUpColumns } from "./columns";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { CustomerDialog } from "@/app/customers/customer-dialog";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STORE_ID = 'store_main';

const enquiryItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  gstRate: z.number(),
  totalPrice: z.number(),
});

const followUpSchema = z.object({
  id: z.string(),
  date: z.string(),
  notes: z.string().min(1, "Follow-up notes cannot be empty."),
  type: z.string().min(1, "Follow-up type is required."),
  nextAction: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  enquiry: z.string().min(10, "Please provide a detailed enquiry."),
  status: z.string().min(1, "Status is required."),
  enquiryTypeId: z.string().optional(),
  sourceId: z.string().optional(),
  followUps: z.array(followUpSchema).optional(),
  items: z.array(enquiryItemSchema).optional(),
  saleType: z.enum(["GST", "Cash"]).optional(),
});

type EnquiryFormValues = z.infer<typeof formSchema>;

interface EnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry?: Enquiry;
  onSuccess: (enquiry: Omit<Enquiry, 'id' | 'enquiryNumber'>) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
);

export function EnquiryDialog({ open, onOpenChange, enquiry, onSuccess }: EnquiryDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!enquiry);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersRef);

  const enquiryStatusesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'enquiryStatuses'), orderBy('name')) : null, [firestore]);
  const { data: enquiryStatuses } = useCollection<EnquiryStatus>(enquiryStatusesRef);
  
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const followUpTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'followUpTypes'), orderBy('name')) : null, [firestore]);
  const { data: followUpTypes } = useCollection<FollowUpType>(followUpTypesRef);

  const sortedProducts = useMemo(() => products?.sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedCustomers = useMemo(() => customers?.sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedStatuses = useMemo(() => enquiryStatuses?.sort((a, b) => a.name.localeCompare(b.name)), [enquiryStatuses]);

  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [newFollowUpType, setNewFollowUpType] = useState("");

  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { control, handleSubmit, watch, reset, setValue, getValues } = form;
  const watchedItems = watch("items") || [];
  const watchedSaleType = watch("saleType");
  
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  const totals = useMemo(() => {
    let sub = 0;
    let gst = 0;
    watchedItems.forEach(item => {
      sub += (item.totalPrice || 0);
      if (watchedSaleType === 'GST') {
        gst += (item.totalPrice || 0) * ((item.gstRate || 0) / 100);
      }
    });
    return { subTotal: sub, gstAmount: gst, totalAmount: sub + gst };
  }, [watchedItems, watchedSaleType]);

  useEffect(() => {
    if (open) {
        if(enquiry) {
            setIsEditing(false);
            reset({
                ...enquiry,
                followUps: enquiry.followUps || [],
                items: enquiry.items || [],
                saleType: (enquiry.saleType as any) || 'GST',
            });
        } else {
            setIsEditing(true);
            reset({ customerId: "", enquiry: "", status: "New", followUps: [], items: [], saleType: 'GST' });
        }
        setNewFollowUpNote("");
        setNewFollowUpType("");
    }
  }, [open, enquiry, reset]);

  const handleAddFollowUp = () => {
    if (newFollowUpNote.trim() === "" || newFollowUpType.trim() === "" || !currentUser) {
        toast({ title: 'Missing Information', description: 'Note and type required.', variant: 'destructive'});
        return;
    }
    const currentFollowUps = getValues("followUps") || [];
    const followUp: EnquiryFollowUp = {
        id: `fu_${Date.now()}`,
        date: new Date().toISOString(),
        notes: newFollowUpNote,
        type: newFollowUpType,
        userId: currentUser.id,
        userName: currentUser.displayName || 'Unknown User'
    };
    setValue("followUps", [...currentFollowUps, followUp]);
    setNewFollowUpNote("");
    setNewFollowUpType("");
  };

  const onSubmit = (data: EnquiryFormValues) => {
    const customerName = customers?.find(c => c.id === data.customerId)?.name || 'Unknown';
    const submittedEnquiry: Omit<Enquiry, 'id' | 'enquiryNumber'> = {
      storeId: STORE_ID,
      date: enquiry?.date || new Date().toISOString(),
      customerName,
      ...data,
      followUps: data.followUps || [],
      items: data.items || [],
      totalAmount: totals.totalAmount,
      createdBy: enquiry?.createdBy || currentUser?.id,
      createdByName: enquiry?.createdByName || currentUser?.displayName,
    } as any;
    onSuccess(submittedEnquiry);
  };

  return (
    <>
      <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => { setValue('customerId', c.id); setIsCustomerDialogOpen(false); }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 border-b">
            <div className="flex justify-between items-center pr-6">
                <div>
                    <DialogTitle>{enquiry?.id ? `Enquiry #${enquiry.enquiryNumber}` : "New Enquiry"}</DialogTitle>
                    <DialogDescription>Capture customer interests and follow-ups.</DialogDescription>
                </div>
                {enquiry?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                )}
            </div>
          </DialogHeader>
          
          <Form {...form}>
            <form id="enquiry-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {isEditing ? (
                    <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer <span className="text-destructive font-black">*</span></FormLabel>
                            <div className="flex gap-2">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                                    <SelectContent>{sortedCustomers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)} className="shrink-0 h-10 w-10"><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                  ) : (
                    <ReadOnlyField label="Customer" value={customers?.find(c => c.id === getValues('customerId'))?.name} />
                  )}
                  {isEditing ? (
                    <FormField control={control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status <span className="text-destructive font-black">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                                <SelectContent>{sortedStatuses?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )}/>
                  ) : (
                    <ReadOnlyField label="Status" value={getValues('status')} />
                  )}
              </div>

              <FormField control={control} name="enquiry" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Enquiry Details <span className="text-destructive font-black">*</span></FormLabel>
                    {isEditing ? <FormControl><Textarea {...field} className="min-h-24" /></FormControl> : <div className="text-sm p-3 border rounded-md bg-muted whitespace-pre-wrap">{field.value}</div>}
                    <FormMessage />
                  </FormItem>
              )}/>

              <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-lg font-black uppercase tracking-tight">Interested Products</Label>
                      {isEditing && <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0, gstRate: 0, totalPrice: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>}
                  </div>
                  {fields.map((field, index) => (
                      <Card key={field.id} className="border-2 shadow-sm bg-accent/5 overflow-hidden">
                          <CardHeader className="flex flex-row items-center justify-between py-2 px-4 bg-muted/20 border-b">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Item #{index + 1}</span>
                              {isEditing && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                          </CardHeader>
                          <CardContent className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                  <div className="sm:col-span-6">
                                      {isEditing ? (
                                          <FormField control={control} name={`items.${index}.productId`} render={({ field: f }) => (
                                              <Select onValueChange={(val) => {
                                                  f.onChange(val);
                                                  const p = sortedProducts?.find(prod => prod.id === val);
                                                  if(p) {
                                                      setValue(`items.${index}.productName`, p.name);
                                                      setValue(`items.${index}.unitPrice`, p.sellingPrice);
                                                      setValue(`items.${index}.gstRate`, p.gstRate);
                                                      setValue(`items.${index}.totalPrice`, p.sellingPrice * (getValues(`items.${index}.quantity`) || 1));
                                                  }
                                              }} value={f.value}>
                                                  <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl>
                                                  <SelectContent>{sortedProducts?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                              </Select>
                                          )}/>
                                      ) : <ReadOnlyField label="Product" value={getValues(`items.${index}.productName`)} />}
                                  </div>
                                  <div className="sm:col-span-2">
                                      {isEditing ? (
                                          <FormField control={control} name={`items.${index}.quantity`} render={({ field: f }) => <Input type="number" {...f} className="h-10" />} />
                                      ) : <ReadOnlyField label="Qty" value={getValues(`items.${index}.quantity`)} />}
                                  </div>
                                  <div className="sm:col-span-4">
                                      {isEditing ? (
                                          <FormField control={control} name={`items.${index}.unitPrice`} render={({ field: f }) => <Input type="number" {...f} className="h-10 font-black" />} />
                                      ) : <ReadOnlyField label="Price" value={`₹${getValues(`items.${index}.unitPrice`)?.toLocaleString()}`} />}
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>

              <div className="rounded-2xl border-2 border-primary/20 p-6 sm:p-8 bg-primary/5 shadow-inner flex justify-between items-center">
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Est. Total</span>
                  <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">₹{totals.totalAmount.toLocaleString()}</span>
              </div>

              <Separator />
              
              <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-tight">Follow-up Log</h3>
                  <div className="border rounded-lg overflow-hidden">
                      <DataTable columns={followUpColumns({ users: usersData || [] })} data={getValues("followUps") || []} />
                  </div>
                  {isEditing && (
                      <div className="p-4 border-2 border-dashed rounded-lg bg-muted/30 space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest">Add New Log Entry</Label>
                          <Textarea value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} placeholder="Interaction details..." />
                          <div className="flex flex-col sm:flex-row gap-2">
                              <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                                  <SelectTrigger className="flex-1 h-10"><SelectValue placeholder="Interaction Type" /></SelectTrigger>
                                  <SelectContent>{followUpTypes?.sort((a,b)=>a.name.localeCompare(b.name)).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                              <Button type="button" onClick={handleAddFollowUp} className="shrink-0 h-10">Add Entry</Button>
                          </div>
                      </div>
                  )}
              </div>
            </form>
          </Form>
          
          <DialogFooter className="p-6 border-t bg-muted/5 gap-2 flex flex-col sm:flex-row">
              {isEditing ? (
                  <Button type="submit" form="enquiry-form" className="w-full sm:w-auto order-1 sm:order-2 font-black uppercase tracking-widest">Save Enquiry</Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
