

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
import { Expense, Vendor, Category, Store, SubCategory, Company, ExpenseType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Combobox } from "@/components/ui/combobox";
import { useCurrentUser } from "@/hooks/use-current-user";

const STORE_ID = 'store_main';

const formSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  storeId: z.string().min(1, "Store is required."),
  companyId: z.string().min(1, "Company is required."),
  expenseType: z.string().optional(),
  category: z.string().min(1, "Category is required."),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  vendor: z.string().optional(),
  paymentMethod: z.enum(["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"]).default("Cash"),
  gstNumber: z.string().optional(),
  gstRate: z.coerce.number().min(0).max(100).optional().default(0),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  onSuccess: (expense: Expense) => void;
}

const ReadOnlyField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
    </div>
)

export function ExpenseDialog({ open, onOpenChange, expense, onSuccess }: ExpenseDialogProps) {
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!expense);
  const firestore = useFirestore();

  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);

  const expenseTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'expenseTypes') : null, [firestore]);
  const { data: expenseTypes } = useCollection<ExpenseType>(expenseTypesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);

  const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'companies') : null, [firestore]);
  const { data: companies } = useCollection<Company>(companiesRef);

  const sortedVendors = useMemo(() => vendors?.sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const sortedCategories = useMemo(() => categories?.sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const sortedExpenseTypes = useMemo(() => expenseTypes?.sort((a, b) => a.name.localeCompare(b.name)), [expenseTypes]);
  const sortedCompanies = useMemo(() => companies?.sort((a, b) => a.name.localeCompare(b.name)), [companies]);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { getValues } = form;

  useEffect(() => {
    if (open) {
      if (expense) {
        setIsEditing(false);
        form.reset({
          ...expense,
          date: new Date(expense.date),
          paymentMethod: expense.paymentMethod || "Cash",
        });
      } else {
        setIsEditing(true);
        form.reset({
          date: new Date(), storeId: STORE_ID, companyId: "", category: "", subCategory: "", brand: "",
          description: "", amount: 0, vendor: "", paymentMethod: "Cash", gstNumber: "", gstRate: 0,
        });
      }
    }
  }, [open, expense, form]);

  const watchedVendor = form.watch("vendor");
  const watchedAmount = form.watch("amount");
  const watchedGstRate = form.watch("gstRate");
  const watchedCategory = form.watch("category");

  const filteredSubCategories = useMemo(() => {
    if (!subCategories || !watchedCategory || !categories) return [];
    const selectedCategory = categories.find(c => c.name === watchedCategory);
    if (!selectedCategory) return [];
    return subCategories.filter(sc => sc.categoryId === selectedCategory.id).sort((a, b) => a.name.localeCompare(b.name));
  }, [subCategories, watchedCategory, categories]);

  useEffect(() => {
    form.setValue('subCategory', '');
  }, [watchedCategory, form]);

  useEffect(() => {
    if (watchedVendor) {
      const vendorDetails = vendors?.find(v => v.name === watchedVendor);
      form.setValue("gstNumber", vendorDetails?.gstNumber || "");
    } else {
        form.setValue("gstNumber", "");
    }
  }, [watchedVendor, form, vendors]);

  const { gstAmount, totalAmount } = useMemo(() => {
    const amount = watchedAmount || 0;
    const rate = watchedGstRate || 0;
    const gst = amount * (rate / 100);
    return {
        gstAmount: gst,
        totalAmount: amount + gst
    };
  }, [watchedAmount, watchedGstRate]);

  const onSubmit = (data: ExpenseFormValues) => {
    const submittedExpense: Expense = {
      id: expense?.id || `exp_${Date.now()}`,
      ...data,
      date: data.date.toISOString(),
      gstAmount: gstAmount,
    };
    onSuccess(submittedExpense);
  };
  
  const dialogTitle = expense ? (isEditing ? "Edit Expense" : "View Expense") : "Add New Expense";
  const dialogDescription = expense 
    ? `Details for expense: ${expense.description}` 
    : "Fill in the details for a new expense.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
           <div className="flex justify-between items-center pr-6">
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
            {expense && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {isEditing ? ( <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Date" value={getValues('date') ? format(new Date(getValues('date')), "PPP"): ''} /> )}
                 {isEditing ? ( <FormField control={form.control} name="companyId" render={({ field }) => ( <FormItem><FormLabel>Company</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger></FormControl><SelectContent>{sortedCompanies?.map(company => (<SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Company" value={companies?.find(c => c.id === getValues('companyId'))?.name || 'N/A'} /> )}
            </div>
            {isEditing ? ( <FormField control={form.control} name="expenseType" render={({ field }) => ( <FormItem><FormLabel>Type of Expense</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an expense type" /></SelectTrigger></FormControl><SelectContent>{sortedExpenseTypes?.map(type => (<SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Type of Expense" value={getValues('expenseType')} /> )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? ( <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{sortedCategories?.map(cat => (<SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Category" value={getValues('category')} /> )}
                {isEditing ? ( <FormField control={form.control} name="subCategory" render={({ field }) => ( <FormItem><FormLabel>Sub-Category</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={filteredSubCategories.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl><SelectContent>{filteredSubCategories.map(subCat => (<SelectItem key={subCat.id} value={subCat.name}>{subCat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Sub-Category" value={getValues('subCategory')} /> )}
            </div>
             {isEditing ? ( <FormField control={form.control} name="vendor" render={({ field }) => ( <FormItem><FormLabel>Vendor (Optional)</FormLabel><Combobox options={sortedVendors?.map(v => ({ value: v.name, label: v.name })) || []} value={field.value || ''} onChange={field.onChange} placeholder="Select a vendor..." searchPlaceholder="Search vendors..." notFoundText="No vendor found."/><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Vendor" value={getValues('vendor')} /> )}
             {isEditing ? ( <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., July store rent" {...field} /></FormControl><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Description" value={getValues('description')} /> )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? ( <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Amount (pre-tax)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Amount (pre-tax)" value={`₹${getValues('amount')?.toLocaleString('en-IN')}`} /> )}
                {isEditing ? ( <FormField control={form.control} name="paymentMethod" render={({ field }) => ( <FormItem><FormLabel>Mode of Payment</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a payment method" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="NEFT">NEFT</SelectItem><SelectItem value="RTGS">RTGS</SelectItem><SelectItem value="IMPS">IMPS</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Mode of Payment" value={getValues('paymentMethod')} /> )}
            </div>
            {isEditing ? ( <FormField control={form.control} name="gstNumber" render={({ field }) => ( <FormItem><FormLabel>Vendor GST Number</FormLabel><FormControl><Input placeholder="Auto-populates on vendor selection" {...field} readOnly /></FormControl><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="Vendor GST Number" value={getValues('gstNumber')} /> )}
            {isEditing ? ( <FormField control={form.control} name="gstRate" render={({ field }) => ( <FormItem><FormLabel>GST Rate (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 18" {...field} /></FormControl><FormMessage /></FormItem>)}/> ) : ( <ReadOnlyField label="GST Rate (%)" value={`${getValues('gstRate') || 0}%`} /> )}
            <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-medium">Summary</h4>
                <div className="flex justify-between"><span>Base Amount</span><span>₹{(watchedAmount || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>GST</span><span>₹{gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              {isEditing && <Button type="submit">Save Expense</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
