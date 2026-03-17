
'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CircleDollarSign, PlusCircle, Wallet, Upload, Download, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import React, { useState, useMemo } from 'react';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Expense, Company, Vendor, Store, Category, SubCategory } from '@/lib/types';
import { ExpenseDialog } from './expense-dialog';
import { toast } from '@/hooks/use-toast';
import { exportWithDataValidation, exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, writeBatch, getDocs, where, deleteDoc, setDoc } from 'firebase/firestore';

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

export default function ExpensesPage() {
    const firestore = useFirestore();
    const expensesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'expenses'), orderBy('date', 'desc'), limit(50));
    }, [firestore]);
    const { data: expensesData, isLoading: areExpensesLoading } = useCollection<Expense>(expensesCollectionRef);
    
    const companiesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'companies') : null, [firestore]);
    const { data: companies } = useCollection<Company>(companiesCollectionRef);
    
    const vendorsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
    const { data: vendors } = useCollection<Vendor>(vendorsCollectionRef);
    
    const storesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores') : null, [firestore]);
    const { data: stores } = useCollection<Store>(storesCollectionRef);

    const categoriesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesCollectionRef);

    const subCategoriesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
    const { data: subCategories } = useCollection<SubCategory>(subCategoriesCollectionRef);

    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const isMounted = useIsMounted();

    const expenses = useMemo(() => {
        if (!expensesData) return [];
        return expensesData.map(expense => ({
            ...expense,
            companyName: companies?.find(c => c.id === expense.companyId)?.name || 'N/A'
        }));
    }, [expensesData, companies]);

    const handleAdd = () => {
        setEditingExpense(undefined);
        setIsExpenseDialogOpen(true);
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsExpenseDialogOpen(true);
    };

    const handleDelete = async (expenseId: string) => {
        if (!firestore) return;
        try {
          await deleteDoc(doc(firestore, 'stores', STORE_ID, 'expenses', expenseId));
          toast({ title: "Success!", description: "Expense deleted successfully." });
        } catch (error) {
           console.error("Error deleting expense:", error);
           toast({ title: "Error", description: "Could not delete expense.", variant: "destructive" });
        }
    };

    const handleSuccess = async (expense: Expense) => {
        if (!firestore) return;
        const message = editingExpense ? "Expense updated successfully." : "Expense added successfully.";
        try {
            const expenseDocRef = doc(firestore, 'stores', STORE_ID, 'expenses', expense.id);
            await setDoc(expenseDocRef, expense, { merge: true });
            setIsExpenseDialogOpen(false);
            setEditingExpense(undefined);
            toast({ title: "Success!", description: message });
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Error", description: "Could not save expense.", variant: "destructive" });
        }
    };

     const handleExport = () => {
        if (!expenses) return;
        const dataToExport = expenses.map(e => ({
            date: e.date,
            company: e.companyName,
            category: e.category,
            subCategory: e.subCategory || '',
            brand: e.brand || '',
            description: e.description,
            amount: e.amount,
            vendor: e.vendor || '',
        }));
        exportToExcel(dataToExport, 'expenses_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { date: new Date().toISOString().split('T')[0], store: stores?.find(s => s.isMainStore)?.name || '', company: companies?.[0]?.name || '', category: "Utilities", subCategory: "Internet", brand: "", description: "Monthly internet bill", amount: 2000, vendor: vendors?.[0]?.name || '', paymentMethod: "UPI", gstRate: 18, gstNumber: vendors?.find(v => v.name === vendors?.[0]?.name)?.gstNumber || '' },
        ];
        const validations = {
            store: stores?.map(s => s.name) || [],
            company: companies?.map(c => c.name) || [],
            category: categories?.map(c => c.name) || [],
            subCategory: subCategories?.map(sc => sc.name) || [],
            vendor: vendors?.map(v => v.name) || [],
            paymentMethod: ["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash", "Other"],
        };
        exportWithDataValidation(sampleData, 'Expenses', validations, 'expenses_import_sample');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!firestore || !companies || !stores) return;
        const file = event.target.files?.[0];
        if (!file) {
             if(event.target) event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);
                
                if (json.length === 0) {
                    toast({ title: "Import Failed", description: "The Excel file is empty.", variant: "destructive" });
                    return;
                }

                const batch = writeBatch(firestore);
                let newCount = 0;
                let updateCount = 0;

                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const rowNum = i + 2;

                    const requiredFields = ['date', 'company', 'category', 'description', 'amount', 'store'];
                    for(const field of requiredFields) {
                        if (!item[field]) {
                            toast({ title: "Import Failed", description: `Row ${rowNum}: '${field}' is required.`, variant: "destructive" });
                            return;
                        }
                    }

                    const company = companies.find(c => c.name.toLowerCase() === item.company?.toLowerCase());
                    const store = stores.find(s => s.name.toLowerCase() === item.store?.toLowerCase());
                    if (!company) {
                         toast({ title: "Import Failed", description: `Row ${rowNum}: Company '${item.company}' not found.`, variant: "destructive" });
                        return;
                    }
                    if (!store) {
                         toast({ title: "Import Failed", description: `Row ${rowNum}: Store '${item.store}' not found.`, variant: "destructive" });
                        return;
                    }

                    const expenseDate = item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString();
                    const amount = Number(item.amount) || 0;
                    const gstRate = Number(item.gstRate) || 0;
                    const gstAmount = amount * (gstRate / 100);

                    const expenseData: Omit<Expense, 'id'> = {
                        storeId: store?.id || '',
                        companyId: company?.id || '',
                        date: expenseDate,
                        category: item.category,
                        subCategory: item.subCategory,
                        brand: item.brand,
                        description: item.description,
                        amount: amount,
                        vendor: item.vendor,
                        paymentMethod: item.paymentMethod,
                        gstRate,
                        gstAmount,
                        gstNumber: item.gstNumber,
                    };

                    // Check for existing expense to avoid duplicates
                    const expensesRef = collection(firestore, 'stores', STORE_ID, 'expenses');
                    const q = query(expensesRef, 
                        where("date", "==", expenseDate), 
                        where("description", "==", item.description),
                        where("amount", "==", amount)
                    );
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        const newDocRef = doc(expensesRef);
                        batch.set(newDocRef, { ...expenseData, id: newDocRef.id });
                        newCount++;
                    } else {
                        // We choose to skip duplicates for expenses instead of updating
                        updateCount++;
                    }
                }
                
                if (newCount > 0) {
                    await batch.commit();
                }

                toast({
                    title: "Import Successful!",
                    description: `${newCount} expenses imported. ${updateCount} duplicate rows were skipped.`,
                });

            } catch (error) {
                 console.error("Import Error:", error);
                toast({
                    title: "Import Error",
                    description: "There was an error processing the file. Please ensure it's a valid Excel file and the format is correct.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsArrayBuffer(file);
        if(event.target) event.target.value = '';
    };

    const summaryData: SummaryCardData[] = useMemo(() => {
        const safeExpenses = expenses || [];
        const totalExpense = safeExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        return [
            { title: "Total Expenses", value: isMounted ? `₹${totalExpense.toLocaleString('en-IN')}` : '₹...', icon: Wallet },
            { title: "Total Transactions", value: safeExpenses.length.toString(), icon: CircleDollarSign }
        ];
    }, [expenses, isMounted]);

    const chartData = useMemo(() => {
        if(!expenses) return [];
        const expensesByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category;
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(expensesByCategory).map(([name, total]) => ({ name, total }));
    }, [expenses]);

    const chartConfig: ChartConfig = useMemo(() => ({
        total: { label: 'Amount', color: 'hsl(var(--chart-1))' },
    }), []);

  return (
    <>
      <PageHeader title="Expenses">
         <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={handleExport} size="sm" disabled={!expenses || expenses.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" onClick={handleDownloadSample} size="sm">
            <FileText className="mr-2 h-4 w-4" /> Sample
        </Button>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />
        <ExpenseDialog
            open={isExpenseDialogOpen}
            onOpenChange={setIsExpenseDialogOpen}
            expense={editingExpense}
            onSuccess={handleSuccess}
        />
        <Card>
          <CardHeader>
            <CardTitle>Expense Management</CardTitle>
            <CardDescription>
              Track and manage all your business expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns({onEdit: handleEdit, onDelete: handleDelete})} data={expenses || []} />
          </CardContent>
        </Card>
        <GenericChart 
            title="Expenses by Category"
            description="A breakdown of expenses by category."
            data={chartData}
            dataKeyX="name"
            dataKeysY={['total']}
            chartConfig={chartConfig}
            yAxisFormatter={(value) => `₹${value.toLocaleString()}`}
            categorical
        />
      </div>
    </>
  );
}
