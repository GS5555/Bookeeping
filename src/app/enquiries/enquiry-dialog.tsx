'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Enquiry, EnquiryFollowUp, Customer, Quotation, Product, Brand, Category, SubCategory, EnquiryStatus, EnquiryType, EnquirySource, FollowUpType, User } from "@/lib/types";
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
import { collection, query, orderBy, doc, setDoc } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table";
import { followUpColumns } from "./columns";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomerDialog } from "@/app/customers/customer-dialog";
import { toast } from "@/hooks/use-toast";
import { QuotationDialog } from "@/app/quotations/quotation-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";

const STORE_ID = 'store_main';

const enquiryItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  brandId: z.string(),
  categoryId: z.string(),
  subCategoryId: z.string().optional(),
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
  convertedToId: z.string().optional(),
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
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
);

export function EnquiryDialog({ open, onOpenChange, enquiry, onSuccess }: EnquiryDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(!enquiry);
  
  const customersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
  const { data: customers } = useCollection<Customer>(customersRef);
  
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData } = useCollection<User>(usersRef);

  const enquiryStatusesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'enquiryStatuses'), orderBy('name')) : null, [firestore]);
  const { data: enquiryStatuses } = useCollection<EnquiryStatus>(enquiryStatusesRef);
  
  const enquiryTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'enquiryTypes'), orderBy('name')) : null, [firestore]);
  const { data: enquiryTypes } = useCollection<EnquiryType>(enquiryTypesRef);

  const enquirySourcesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'enquirySources'), orderBy('name')) : null, [firestore]);
  const { data: enquirySources } = useCollection<EnquirySource>(enquirySourcesRef);
  
  const followUpTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'followUpTypes'), orderBy('name')) : null, [firestore]);
  const { data: followUpTypes } = useCollection<FollowUpType>(followUpTypesRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);
  
  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);
  
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);
  
  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [newFollowUpType, setNewFollowUpType] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [itemFilters, setItemFilters] = useState<{ brandId: string; categoryId: string; subCategoryId: string; }[]>([]);

  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { control, handleSubmit, watch, reset, setValue, getValues } = form;
  const watchedItems = watch("items") || [];
  const watchedSaleType = watch("saleType");
  
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  const handleAppendItem = () => {
    append({ productId: "", productName: "", brandId: "", categoryId: "", quantity: 1, unitPrice: 0, gstRate: 0, totalPrice: 0 });
    setItemFilters(prev => [...prev, { brandId: 'all', categoryId: 'all', subCategoryId: 'all' }]);
  };
  
  const totals = useMemo(() => {
    let sub = 0;
    let gst = 0;
    watchedItems.forEach(item => {
      sub += item.totalPrice;
      if (watchedSaleType === 'GST') {
        gst += item.totalPrice * (item.gstRate / 100);
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
                saleType: enquiry.saleType || 'GST',
            });
            setItemFilters(enquiry.items?.map(item => ({ brandId: item.brandId || 'all', categoryId: item.categoryId || 'all', subCategoryId: item.subCategoryId || 'all' })) || []);
        } else {
            setIsEditing(true);
            reset({ customerId: "", enquiry: "", status: "New", convertedToId: "", followUps: [], items: [], saleType: 'GST' });
            setItemFilters([]);
        }
        setNewFollowUpNote("");
        setNewFollowUpType("");
        setNextAction("");
    }
  }, [open, enquiry, reset]);

  const handleAddFollowUp = () => {
    if (newFollowUpNote.trim() === "" || newFollowUpType.trim() === "" || !currentUser) {
        toast({ title: 'Missing Information', description: 'Please provide a note and select a follow-up type.', variant: 'destructive'});
        return;
    }
    const currentFollowUps = getValues("followUps") || [];
    const followUp: EnquiryFollowUp = {
        id: `fu_${Date.now()}`,
        date: new Date().toISOString(),
        notes: newFollowUpNote,
        type: newFollowUpType,
        nextAction: nextAction,
        userId: currentUser.id,
        userName: currentUser.displayName || 'Unknown User'
    };
    setValue("followUps", [...currentFollowUps, followUp]);
    setNewFollowUpNote("");
    setNewFollowUpType("");
    setNextAction("");
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
    };
    onSuccess(submittedEnquiry);
  };
  
  const enquiryAsQuotation = useMemo(() => {
    const formValues = getValues();
    const customer = customers?.find(c => c.id === formValues.customerId);
    if (!customer) return undefined;
    return {
        id: `qt_${Date.now()}`,
        customerId: formValues.customerId,
        customerName: customer.name,
        billingAddress: customer.addresses.find(a => a.isPrimary)!,
        items: formValues.items?.map(item => {
            const product = products?.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                productName: product?.name || item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                hsnCode: product?.hsnCode || '',
                gstRate: product?.gstRate || 0,
                imageUrl: product?.imageUrl || ''
            };
        }) || [],
        status: 'Draft'
    } as Partial<Quotation>;
  }, [getValues, customers, products]);

  const dialogTitle = enquiry?.id ? `Edit Enquiry #${enquiry.enquiryNumber}` : "Add New Enquiry";

  return (
    <>
      <CustomerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} onSuccess={(c) => { setValue('customerId', c.id); setIsCustomerDialogOpen(false); }} />
      <QuotationDialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen} onSuccess={() => {}} quotation={enquiryAsQuotation} onConvertToSale={() => {}} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-6 pb-4 border-b flex flex-row items-center justify-between">
            <div className="flex-1">
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription className="line-clamp-1">{enquiry?.id ? `Enquiry from ${enquiry.customerName}` : "Log a new customer enquiry."}</DialogDescription>
            </div>
            {enquiry?.id && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
            )}
          </DialogHeader>
          <Form {...form}>
            <form id="enquiry-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isEditing ? (
                <FormField
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                            <SelectContent>{customers?.sort((a,b)=>a.name.localeCompare(b.name)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)}><PlusCircle className="h-4 w-4" /></Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <ReadOnlyField label="Customer" value={customers?.find(c => c.id === getValues('customerId'))?.name} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <FormField control={control} name="enquiryTypeId" render={({ field }) => (
                      <FormItem><FormLabel>Type of Enquiry</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an enquiry type" /></SelectTrigger></FormControl><SelectContent>{enquiryTypes?.map(type => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                  ) : (
                    <ReadOnlyField label="Type of Enquiry" value={enquiryTypes?.find(t => t.id === getValues('enquiryTypeId'))?.name} />
                  )}
                  {isEditing ? (
                    <FormField control={control} name="sourceId" render={({ field }) => (
                        <FormItem><FormLabel>Source of Enquiry</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger></FormControl><SelectContent>{enquirySources?.map(source => ( <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                  ) : (
                    <ReadOnlyField label="Source of Enquiry" value={enquirySources?.find(s => s.id === getValues('sourceId'))?.name} />
                  )}
              </div>
              <FormField control={control} name="enquiry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enquiry Details</FormLabel>
                    {isEditing ? (
                        <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                    ) : (
                        <div className="text-sm p-3 border rounded-md bg-muted min-h-24 whitespace-pre-wrap">{field.value || 'No details provided.'}</div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              <div className="space-y-4">
                  <FormLabel className="text-base font-bold">Interested Products</FormLabel>
                  {fields.map((field, index) => (
                      <div key={field.id} className="space-y-3 border p-3 rounded-lg relative bg-accent/5">
                          {isEditing && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                          <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-2 items-start pt-2">
                                <FormField control={control} name={`items.${index}.productId`} render={({ field: formField }) => (
                                      <FormItem><Select onValueChange={(value) => {
                                              formField.onChange(value);
                                              const product = products?.find(p => p.id === value);
                                              if (product) {
                                                  setValue(`items.${index}.productName`, product.name);
                                                  setValue(`items.${index}.unitPrice`, product.finalPrice || product.sellingPrice);
                                                  setValue(`items.${index}.gstRate`, product.gstRate);
                                                  const qty = getValues(`items.${index}.quantity`) || 1;
                                                  setValue(`items.${index}.totalPrice`, (product.finalPrice || product.sellingPrice) * qty);
                                              }
                                          }} value={formField.value} disabled={!isEditing}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Product" /></SelectTrigger></FormControl>
                                            <SelectContent>{products?.sort((a,b)=>a.name.localeCompare(b.name)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                        </Select></FormItem>
                                  )}/>
                                  <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                                      <FormItem><FormControl><Input type="number" placeholder="Qty" {...field} disabled={!isEditing} className="h-10" /></FormControl></FormItem>
                                  )}/>
                                  <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                                      <FormItem><FormControl><Input type="number" placeholder="Price" {...field} disabled={!isEditing} className="h-10 font-bold" /></FormControl></FormItem>
                                  )}/>
                            </div>
                      </div>
                  ))}
                  {isEditing && <Button type="button" variant="outline" size="sm" onClick={handleAppendItem}><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>}
              </div>
              
              <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{totals.subTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{totals.totalAmount.toLocaleString()}</span></div>
              </div>
              
              <Separator />
              <FormField control={control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl><SelectContent>{enquiryStatuses?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>
              )}/>
              
              <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium">Follow-ups</h3>
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                      <Textarea value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} placeholder="Add a follow-up note..." className="h-20" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Select value={newFollowUpType} onValueChange={setNewFollowUpType}>
                              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                              <SelectContent>{followUpTypes?.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button type="button" size="sm" onClick={handleAddFollowUp}>Add Note</Button>
                      </div>
                  </div>
              </div>
            </form>
          </Form>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 pt-4 border-t bg-muted/5">
                {isEditing ? (
                    <Button type="submit" form="enquiry-form" className="w-full sm:w-auto">Save Changes</Button>
                ) : (
                    <Button type="button" onClick={handleSubmit(onSubmit)} className="w-full sm:w-auto">Save Interaction</Button>
                )}
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
