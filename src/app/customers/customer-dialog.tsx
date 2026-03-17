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
import { Customer, CustomerType, Address } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { indianStates, countries } from "@/lib/mock-data";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarIcon, PlusCircle, Trash2, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useCurrentUser } from "@/hooks/use-current-user";

const STORE_ID = 'store_main';

const addressSchema = z.object({
    id: z.string(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    isPrimary: z.boolean(),
});

const formSchema = z.object({
  title: z.string().optional(),
  name: z.string().min(1, 'Customer name is required'),
  companyName: z.string().optional(),
  customerType: z.string().optional(),
  email: z.string().email("Invalid email address.").or(z.literal("")).optional(),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  birthday: z.date().optional(),
  anniversary: z.date().optional(),
  referenceName: z.string().optional(),
  referenceContact: z.string().optional(),
  addresses: z.array(addressSchema)
    .refine(
        (addresses) => addresses.filter((a) => a.isPrimary).length <= 1,
        { message: "Only one address can be marked as primary." }
    ),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSuccess: (customer: Customer) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!customer);
  const firestore = useFirestore();
  const customerTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'customerTypes'), orderBy('name')) : null, [firestore]);
  const { data: customerTypes } = useCollection<CustomerType>(customerTypesRef);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { control, handleSubmit, getValues, setValue, reset } = form;

  useEffect(() => {
    if (open) {
      if (customer) {
        setIsEditing(false); // Start in view mode
        reset({
          ...customer,
          birthday: customer.birthday ? new Date(customer.birthday) : undefined,
          anniversary: customer.anniversary ? new Date(customer.anniversary) : undefined,
        });
      } else {
        setIsEditing(true); // New customer starts in edit mode
        reset({
            title: "Mr", name: "", companyName: "", customerType: "", email: "", phone: "", gstNumber: "",
            referenceName: "", referenceContact: "",
            addresses: [{ id: `addr_${Date.now()}`, street: "", city: "", state: "Maharashtra", zip: "", country: "India", isPrimary: true }],
        });
      }
    }
  }, [open, customer, reset]);


  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const onSubmit = (data: CustomerFormValues) => {
    const submittedCustomer: Omit<Customer, 'birthday' | 'anniversary'> & { birthday?: string, anniversary?: string } = {
      id: customer?.id || `cust_${Date.now()}`,
      storeId: customer?.storeId || 'store_123',
      ...data,
      title: data.title || '',
      name: data.name || 'Unnamed Customer',
      companyName: data.companyName || '',
      email: data.email || '',
      phone: data.phone || '',
    };

    if (data.birthday) { submittedCustomer.birthday = data.birthday.toISOString(); } 
    else { delete submittedCustomer.birthday; }
    
    if (data.anniversary) { submittedCustomer.anniversary = data.anniversary.toISOString(); }
    else { delete submittedCustomer.anniversary; }

    onSuccess(submittedCustomer as Customer);
  };
  
  const dialogTitle = customer ? (isEditing ? "Edit Customer" : "View Customer") : "Add New Customer";
  const dialogDescription = customer 
    ? `Details for: ${customer.name}` 
    : "Fill in the details to create a new customer.";

  const setPrimaryAddress = (index: number) => {
    const currentAddresses = getValues("addresses");
    const updatedAddresses = currentAddresses.map((addr, i) => ({ ...addr, isPrimary: i === index, }));
    setValue("addresses", updatedAddresses, { shouldValidate: true, shouldDirty: true });
  }

  const renderAddress = (address: Address) => {
    const parts = [
      address.street,
      address.city,
      address.state,
    ].filter(Boolean);
    
    let addressString = parts.join(', ');

    if (address.zip) {
        addressString = addressString ? `${addressString} - ${address.zip}` : address.zip;
    }

    if (address.country) {
        addressString = addressString ? `${addressString}, ${address.country}` : address.country;
    }
    
    return addressString || 'No address details';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {customer && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isEditing ? (
                <FormField control={control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Mr">Mr</SelectItem><SelectItem value="Ms">Ms</SelectItem><SelectItem value="Mrs">Mrs</SelectItem><SelectItem value="Dr">Dr</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Title" value={getValues('title')} />
              )}
              <div className="md:col-span-2">
                {isEditing ? (
                    <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Rohan Sharma" {...field} /></FormControl><FormMessage /></FormItem>)} />
                ) : (
                    <ReadOnlyField label="Full Name" value={getValues('name')} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                <FormField control={control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="e.g., rohan@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Email" value={getValues('email')} />
              )}
              {isEditing ? (
                <FormField control={control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="e.g., +91 98765 43210" {...field} /></FormControl><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Phone" value={getValues('phone')} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                <FormField control={control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Company Name" value={getValues('companyName')} />
              )}
              {isEditing ? (
                <FormField control={control} name="gstNumber" render={({ field }) => (<FormItem><FormLabel>GST Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., 29ABCDE1234F1Z5" {...field} /></FormControl><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="GST Number" value={getValues('gstNumber')} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                 <FormField control={control} name="customerType" render={({ field }) => (
                    <FormItem><FormLabel>Type of Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                        <SelectContent>{customerTypes?.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )}/>
              ) : (
                <ReadOnlyField label="Type of Customer" value={getValues('customerType')} />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                <FormField control={control} name="birthday" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Birthday (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1950} toYear={2010} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Birthday" value={getValues('birthday') ? format(new Date(getValues('birthday')), "PPP") : 'N/A'} />
              )}
              {isEditing ? (
                <FormField control={control} name="anniversary" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Anniversary (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              ) : (
                <ReadOnlyField label="Anniversary" value={getValues('anniversary') ? format(new Date(getValues('anniversary')), "PPP") : 'N/A'} />
              )}
            </div>
            <Separator />
            <div>
              <h3 className="text-base font-semibold mb-2">Reference</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <FormField control={control} name="referenceName" render={({ field }) => (<FormItem><FormLabel>Reference Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  ) : (
                    <ReadOnlyField label="Reference Name" value={getValues('referenceName')} />
                  )}
                  {isEditing ? (
                    <FormField control={control} name="referenceContact" render={({ field }) => (<FormItem><FormLabel>Reference Contact</FormLabel><FormControl><Input placeholder="e.g., 9998887776" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  ) : (
                    <ReadOnlyField label="Reference Contact" value={getValues('referenceContact')} />
                  )}
              </div>
            </div>
            <Separator />
            <div>
                <FormLabel>Addresses</FormLabel>
                <FormMessage>{form.formState.errors.addresses?.root?.message}</FormMessage>
                <div className="space-y-4 mt-2">
                    {fields.map((field, index) => {
                       const watchedCountry = form.watch(`addresses.${index}.country`);
                       return (
                        <Card key={field.id} className="relative">
                          {isEditing && (
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <Button type="button" size="sm" variant={field.isPrimary ? "default" : "outline"} onClick={() => setPrimaryAddress(index)}>{field.isPrimary ? "Primary Address" : "Set as Primary"}</Button>
                                {fields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-2" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>
                          )}
                          <CardContent className="space-y-4 pt-4">
                            {isEditing ? (
                              <>
                                <FormField control={form.control} name={`addresses.${index}.street`} render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="e.g., 123 Cricket Lane" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g., Bengaluru" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`addresses.${index}.state`} render={({ field }) => ( <FormItem><FormLabel>State / Province</FormLabel>{ watchedCountry === 'India' ? (<Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger></FormControl><SelectContent>{indianStates.map(state => (<SelectItem key={state} value={state}>{state}</SelectItem>))}</SelectContent></Select>) : (<FormControl><Input placeholder="e.g., California" {...field} /></FormControl>)}<FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`addresses.${index}.zip`} render={({ field }) => ( <FormItem><FormLabel>ZIP / Postal Code</FormLabel><FormControl><Input placeholder="e.g., 560001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name={`addresses.${index}.country`} render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><Select onValueChange={(value) => { field.onChange(value); setValue(`addresses.${index}.state`, ''); }} value={field.value || 'India'}><FormControl><SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl><SelectContent>{countries.map(country => (<SelectItem key={country} value={country}>{country}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                              </>
                            ) : (
                               <ReadOnlyField label={field.isPrimary ? "Primary Address" : "Address"} value={renderAddress(field as Address)} />
                            )}
                          </CardContent>
                        </Card>
                    )})}
                </div>
                {isEditing && (
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ id: `addr_${Date.now()}`, street: "", city: "", state: "Maharashtra", zip: "", country: "India", isPrimary: false })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Address
                  </Button>
                )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              {isEditing && <Button type="submit">Save Customer</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
