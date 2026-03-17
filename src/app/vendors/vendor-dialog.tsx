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
import { Product, Vendor, Category, SubCategory, VendorType, Address } from "@/lib/types";
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
  name: z.string().min(1, 'Vendor name is required'),
  vendorType: z.string().optional(),
  contactTitle: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email address.").or(z.literal("")).optional(),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  birthday: z.date().optional(),
  anniversary: z.date().optional(),
  addresses: z.array(addressSchema)
    .refine(
        (addresses) => addresses.filter((a) => a.isPrimary).length <= 1,
        { message: "Only one address can be marked as primary." }
    ),
  products: z.array(z.string()).optional(),
});

type VendorFormValues = z.infer<typeof formSchema>;

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
  onSuccess: (vendor: Vendor) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function VendorDialog({ open, onOpenChange, vendor, onSuccess }: VendorDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!vendor);
  
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: allProducts } = useCollection<Product>(productsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const vendorTypesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'vendorTypes'), orderBy('name')) : null, [firestore]);
  const { data: vendorTypes } = useCollection<VendorType>(vendorTypesRef);

  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSubCategoryFilter, setProductSubCategoryFilter] = useState('all');

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { control, handleSubmit, getValues, setValue, reset } = form;

  useEffect(() => {
    if (open) {
        if (vendor) {
            setIsEditing(false); // View mode
            reset({
              ...vendor,
              birthday: vendor.birthday ? new Date(vendor.birthday) : undefined,
              anniversary: vendor.anniversary ? new Date(vendor.anniversary) : undefined,
              products: vendor.products || [],
            });
        } else { // New vendor
            setIsEditing(true);
            reset({
                name: "",
                vendorType: "",
                contactTitle: "Mr",
                contactPerson: "",
                email: "",
                phone: "",
                gstNumber: "",
                addresses: [
                    { id: `addr_${Date.now()}`, street: "", city: "", state: "Maharashtra", zip: "", country: "India", isPrimary: true },
                ],
                products: [],
            });
        }
    }
  }, [open, vendor, reset]);


  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const onSubmit = (data: VendorFormValues) => {
    const submittedVendor: Vendor = {
      id: vendor?.id || `vend_${Date.now()}`,
      storeId: vendor?.storeId || STORE_ID,
      name: data.name,
      vendorType: data.vendorType || '',
      contactTitle: data.contactTitle || '',
      contactPerson: data.contactPerson || '',
      email: data.email || '',
      phone: data.phone || '',
      gstNumber: data.gstNumber || '',
      addresses: data.addresses,
      products: data.products || [],
      birthday: data.birthday ? data.birthday.toISOString() : null,
      anniversary: data.anniversary ? data.anniversary.toISOString() : null,
    };
    onSuccess(submittedVendor);
  };
  
  const dialogTitle = vendor ? (isEditing ? "Edit Vendor" : "View Vendor") : "Add New Vendor";
  const dialogDescription = vendor 
    ? `Details for: ${vendor.name}` 
    : "Fill in the details to create a new vendor.";

  const setPrimaryAddress = (index: number) => {
    const currentAddresses = getValues("addresses");
    const updatedAddresses = currentAddresses.map((addr, i) => ({
      ...addr,
      isPrimary: i === index,
    }));
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

  const sortedCategories = useMemo(() => categories?.sort((a,b) => a.name.localeCompare(b.name)), [categories]);

  const filteredSubCategories = useMemo(() => {
    if (!productCategoryFilter || productCategoryFilter === 'all' || !subCategories) return [];
    return subCategories.filter(sc => sc.categoryId === productCategoryFilter).sort((a,b) => a.name.localeCompare(b.name));
  }, [productCategoryFilter, subCategories]);

  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    let products = allProducts;
    if (productSubCategoryFilter && productSubCategoryFilter !== 'all') {
      products = products.filter(p => p.subCategory === productSubCategoryFilter);
    } else if (productCategoryFilter && productCategoryFilter !== 'all') {
      products = products.filter(p => p.category === productCategoryFilter);
    }
    return products.sort((a,b) => a.name.localeCompare(b.name));
  }, [allProducts, productCategoryFilter, productSubCategoryFilter]);

  const formId = "vendor-form";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
            <div className="flex justify-between items-start pr-6">
              <div>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>{dialogDescription}</DialogDescription>
              </div>
              {vendor && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                <FormField control={control} name="name" render={({ field }) => ( <FormItem><FormLabel>Vendor Name</FormLabel><FormControl><Input placeholder="e.g., Kookaburra Sports" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              ) : (
                <ReadOnlyField label="Vendor Name" value={getValues('name')} />
              )}
              {isEditing ? (
                <FormField control={control} name="vendorType" render={({ field }) => ( <FormItem><FormLabel>Type of Vendor</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent>{vendorTypes?.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
              ) : (
                <ReadOnlyField label="Type of Vendor" value={getValues('vendorType')} />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {isEditing ? (
                    <FormField control={control} name="contactTitle" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Mr">Mr</SelectItem><SelectItem value="Ms">Ms</SelectItem><SelectItem value="Mrs">Mrs</SelectItem><SelectItem value="Dr">Dr</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                 ) : (
                    <ReadOnlyField label="Title" value={getValues('contactTitle')} />
                 )}
                <div className="md:col-span-2">
                    {isEditing ? (
                         <FormField control={control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>Contact Person (Optional)</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    ) : (
                        <ReadOnlyField label="Contact Person" value={getValues('contactPerson')} />
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <FormLabel>Products Supplied (Optional)</FormLabel>
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Select value={productCategoryFilter} onValueChange={(value) => {setProductCategoryFilter(value); setProductSubCategoryFilter('all');}}>
                            <SelectTrigger><SelectValue placeholder="Filter by Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {sortedCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={productSubCategoryFilter} onValueChange={setProductSubCategoryFilter} disabled={!productCategoryFilter || productCategoryFilter === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Filter by Sub-Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sub-Categories</SelectItem>
                                {filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormField
                            control={form.control}
                            name="products"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={(value) => {
                                        const currentProducts = getValues("products") || [];
                                        if (!currentProducts.includes(value)) {
                                            field.onChange([...currentProducts, value]);
                                        }
                                    }}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select products to add..." />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {filteredProducts.map(product => (
                                                <SelectItem key={product.id} value={product.id} disabled={field.value?.includes(product.id)}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {getValues("products")?.map(productId => {
                            const product = allProducts?.find(p => p.id === productId);
                            if (!product) return null;
                            return (
                                <div key={productId} className="flex items-center gap-2 bg-muted p-1.5 rounded-md text-sm">
                                    <span>{product.name}</span>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5"
                                        onClick={() => {
                                            const currentProducts = getValues("products") || [];
                                            setValue("products", currentProducts.filter(id => id !== productId));
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                  </>
                ) : (
                    <ReadOnlyField label="" value={getValues("products")?.map(pId => allProducts?.find(p=>p.id===pId)?.name).join(', ') || 'None'}/>
                )}
            </div>
            <Separator />
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {isEditing ? (
                    <FormField control={control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="e.g., sales@kookaburra.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 ) : (
                    <ReadOnlyField label="Email" value={getValues('email')} />
                 )}
                 {isEditing ? (
                    <FormField control={control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="e.g., +91 9876543210" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                 ) : (
                    <ReadOnlyField label="Phone" value={getValues('phone')} />
                 )}
            </div>
             {isEditing ? (
                <FormField control={control} name="gstNumber" render={({ field }) => ( <FormItem><FormLabel>GST Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., 29ABCDE1234F1Z5" {...field} /></FormControl><FormMessage /></FormItem> )}/>
             ) : (
                <ReadOnlyField label="GST Number" value={getValues('gstNumber')} />
             )}
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
                <FormLabel>Addresses</FormLabel>
                <FormMessage>{form.formState.errors.addresses?.root?.message}</FormMessage>
                <div className="space-y-4 mt-2">
                    {fields.map((field, index) => {
                       const watchedCountry = form.watch(`addresses.${index}.country`);
                       return (
                        <Card key={field.id} className="relative">
                           {isEditing && (
                            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
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
                                <FormField control={form.control} name={`addresses.${index}.street`} render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="e.g., 123 Vendor Lane" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name={`addresses.${index}.city`} render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g., Melbourne" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`addresses.${index}.state`} render={({ field }) => ( <FormItem><FormLabel>State / Province</FormLabel>{ watchedCountry === 'India' ? (<Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger></FormControl><SelectContent>{indianStates.map(state => (<SelectItem key={state} value={state}>{state}</SelectItem>))}</SelectContent></Select>) : (<FormControl><Input placeholder="e.g., Victoria" {...field} /></FormControl>)}<FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`addresses.${index}.zip`} render={({ field }) => ( <FormItem><FormLabel>ZIP / Postal Code</FormLabel><FormControl><Input placeholder="e.g., 3000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name={`addresses.${index}.country`} render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><Select onValueChange={(value) => { field.onChange(value); setValue(`addresses.${index}.state`, ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl><SelectContent>{countries.map(country => (<SelectItem key={country} value={country}>{country}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
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
              {isEditing && <Button type="submit">Save Vendor</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
