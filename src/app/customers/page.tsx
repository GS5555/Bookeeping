'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { MapPin, PlusCircle, Users2, Upload, Download, FileText, UserCheck, QrCode, Search } from 'lucide-react';
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
import { Customer } from '@/lib/types';
import { CustomerDialog } from './customer-dialog';
import { toast } from '@/hooks/use-toast';
import { exportWithDataValidation, exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, writeBatch, getDocs, where, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { indianStates, countries } from '@/lib/mock-data';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

export default function CustomersPage() {
    const firestore = useFirestore();
    const customersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name'));
    }, [firestore]);
    const { data: customers, isLoading: areCustomersLoading } = useCollection<Customer>(customersCollectionRef);
    
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        if (!searchQuery) return customers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(lowercasedQuery) ||
            (c.email && c.email.toLowerCase().includes(lowercasedQuery)) ||
            (c.phone && c.phone.includes(lowercasedQuery))
        );
    }, [customers, searchQuery]);

    const approvedCustomers = useMemo(() => filteredCustomers?.filter(c => c.isApproved !== false) || [], [filteredCustomers]);
    const pendingCustomers = useMemo(() => filteredCustomers?.filter(c => c.isApproved === false) || [], [filteredCustomers]);

    const handleAdd = () => {
        setEditingCustomer(undefined);
        setIsCustomerDialogOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsCustomerDialogOpen(true);
    };

    const handleDelete = async (customerId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'stores', STORE_ID, 'customers', customerId));
            toast({ title: "Success!", description: "Customer deleted successfully." });
        } catch (error) {
            console.error("Error deleting customer:", error);
            toast({ title: "Error", description: "Could not delete customer.", variant: "destructive" });
        }
    };
    
    const handleApprove = async (customerId: string) => {
        if (!firestore) return;
        try {
            const customerDocRef = doc(firestore, 'stores', STORE_ID, 'customers', customerId);
            await updateDoc(customerDocRef, { isApproved: true });
            toast({ title: "Success!", description: "Customer has been approved." });
        } catch (error) {
            console.error("Error approving customer:", error);
            toast({ title: "Error", description: "Could not approve customer.", variant: "destructive" });
        }
    };

    const handleSuccess = async (customer: Customer) => {
        if (!firestore || !customers) return;

        // --- ENHANCED DUPLICATION CHECK ---
        const isEditing = !!editingCustomer;
        const duplicate = customers.find(c => {
            if (isEditing && c.id === customer.id) return false;
            
            const emailMatch = customer.email?.trim().toLowerCase() !== '' && 
                               c.email?.trim().toLowerCase() === customer.email?.trim().toLowerCase();
            const phoneMatch = customer.phone?.trim() !== '' && 
                               c.phone?.trim() === customer.phone?.trim();
            
            return emailMatch || phoneMatch;
        });

        if (duplicate) {
            let errorMessage = '';
            if (duplicate.email?.toLowerCase() === customer.email?.toLowerCase()) {
                errorMessage = `Email address '${customer.email}' is already registered to ${duplicate.name}.`;
            } else {
                errorMessage = `Phone number '${customer.phone}' is already registered to ${duplicate.name}.`;
            }
            toast({
                title: "Duplicate Registration Detected",
                description: errorMessage,
                variant: "destructive",
            });
            return;
        }
        // --- END DUPLICATION CHECK ---

        const message = editingCustomer ? "Customer profile updated." : "New customer added successfully.";
        
        try {
            const customerDocRef = doc(firestore, 'stores', STORE_ID, 'customers', customer.id);
            await setDoc(customerDocRef, {...customer, isApproved: true }, { merge: true });

            setIsCustomerDialogOpen(false);
            setEditingCustomer(undefined);
            toast({ title: "Success!", description: message });
        } catch (error) {
            console.error("Error saving customer:", error);
            toast({ title: "Save Failed", description: "Could not update the database.", variant: "destructive" });
        }
    }

    const handleExport = () => {
        if (!customers) return;
        const dataToExport = approvedCustomers.map(c => {
            const primaryAddress = c.addresses.find(a => a.isPrimary) || c.addresses[0];
            return {
                name: c.name,
                companyName: c.companyName || '',
                email: c.email,
                phone: c.phone,
                gstNumber: c.gstNumber || '',
                street: primaryAddress?.street || '',
                city: primaryAddress?.city || '',
                state: primaryAddress?.state || '',
                zip: primaryAddress?.zip || '',
                country: primaryAddress?.country || '',
                referenceName: c.referenceName || '',
                referenceContact: c.referenceContact || '',
            }
        });
        exportToExcel(dataToExport, 'customers_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { name: "Sample Customer", companyName: "Sample Inc.", email: "sample@example.com", phone: "9876543210", gstNumber: "", street: "123 Sample St", city: "Sample City", state: "Maharashtra", zip: "123456", country: "India", referenceName: "John Doe", referenceContact: "1234567890" },
        ];
        const validations = {
            state: indianStates,
            country: countries,
        }
        exportWithDataValidation(sampleData, 'Customers', validations, 'customers_import_sample');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!firestore || !customers) return;
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

                const getHeader = (item: any, keys: string[]) => {
                    for (const key of keys) {
                        const itemKey = Object.keys(item).find(k => k.trim().toLowerCase() === key.toLowerCase());
                        if (itemKey !== undefined && item[itemKey] !== null && item[itemKey] !== undefined) {
                            return item[itemKey];
                        }
                    }
                    return undefined;
                };

                const batch = writeBatch(firestore);
                let newCount = 0;
                let updateCount = 0;

                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const rowNum = i + 2;

                    const name = getHeader(item, ['name', 'customer name']);
                    if (!name) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: 'name' is a required field.`, variant: "destructive" });
                        return;
                    }
                    
                    const email = getHeader(item, ['email']) || '';
                    
                    const customerData: Partial<Customer> = {
                        storeId: STORE_ID,
                        title: 'Mr',
                        name: name,
                        companyName: getHeader(item, ['companyname', 'company name', 'company']),
                        email: email,
                        phone: getHeader(item, ['phone', 'phone number']) || '',
                        gstNumber: getHeader(item, ['gstnumber', 'gst number']) || '',
                        referenceName: getHeader(item, ['referencename', 'reference name']) || '',
                        referenceContact: getHeader(item, ['referencecontact', 'reference contact']) || '',
                        isApproved: true,
                        addresses: [{
                            id: `addr_${Date.now()}_${Math.random()}`,
                            street: getHeader(item, ['street', 'address']) || '',
                            city: getHeader(item, ['city']) || '',
                            state: getHeader(item, ['state']) || '',
                            zip: getHeader(item, ['zip', 'zip code', 'postal code']) || '',
                            country: getHeader(item, ['country']) || '',
                            isPrimary: true,
                        }]
                    };

                    const customersRef = collection(firestore, 'stores', STORE_ID, 'customers');
                    let querySnapshot;
                    if (email) {
                        const q = query(customersRef, where("email", "==", email));
                        querySnapshot = await getDocs(q);
                    }

                    if (!querySnapshot || querySnapshot.empty) {
                        const newDocRef = doc(customersRef);
                        batch.set(newDocRef, { ...customerData, id: newDocRef.id });
                        newCount++;
                    } else {
                        const existingDocRef = querySnapshot.docs[0].ref;
                        batch.update(existingDocRef, customerData);
                        updateCount++;
                    }
                }
                
                await batch.commit();

                toast({
                    title: "Import Complete!",
                    description: `${newCount} customers created, ${updateCount} customers updated.`,
                });

            } catch (error) {
                console.error("Import Error:", error);
                toast({
                    title: "Import Error",
                    description: "There was an error processing the file.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsArrayBuffer(file);
        if(event.target) event.target.value = '';
    };

    const summaryData: SummaryCardData[] = useMemo(() => {
        const uniqueCustomers = customers || [];
        const cityCount = new Set(uniqueCustomers.flatMap(c => c.addresses.map(a => a.city))).size;
        return [
            { title: "Total Customers", value: uniqueCustomers.filter(c => c.isApproved !== false).length.toString(), icon: Users2 },
            { title: "Pending Approval", value: uniqueCustomers.filter(c => c.isApproved === false).length.toString(), icon: UserCheck },
            { title: "Unique Cities", value: cityCount.toString(), icon: MapPin },
        ];
    }, [customers]);

    const chartData = useMemo(() => {
        if(!approvedCustomers) return [];
        const cityCounts = approvedCustomers.reduce((acc, customer) => {
            const primaryAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];
            if(primaryAddress && primaryAddress.city) {
                const city = primaryAddress.city;
                acc[city] = (acc[city] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(cityCounts).map(([name, total]) => ({ name, total }));
    }, [approvedCustomers]);

    const chartConfig: ChartConfig = useMemo(() => ({
        total: { label: 'Customers', color: 'hsl(var(--chart-1))' },
    }), []);

  return (
    <>
      <PageHeader title="Customers">
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search customers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={handleExport} size="sm" disabled={!customers || customers.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" onClick={handleDownloadSample} size="sm">
            <FileText className="mr-2 h-4 w-4" /> Sample
        </Button>
        <Button variant="outline" asChild size="sm">
            <Link href="/add-customer" target="_blank">
                <QrCode className="mr-2 h-4 w-4" />
                Public Form
            </Link>
        </Button>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />
        <CustomerDialog
            open={isCustomerDialogOpen}
            onOpenChange={setIsCustomerDialogOpen}
            customer={editingCustomer}
            onSuccess={handleSuccess}
        />
        <Card>
             <CardHeader>
                <CardTitle>Approved Customers</CardTitle>
                <CardDescription>View and manage your approved customer database.</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns({onEdit: handleEdit, onDelete: handleDelete})} data={approvedCustomers} />
            </CardContent>
        </Card>
        {pendingCustomers.length > 0 && (
             <Card>
                <CardHeader>
                    <CardTitle>Pending Approval</CardTitle>
                    <CardDescription>New customers waiting for approval.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns({onEdit: handleEdit, onDelete: handleDelete, onApprove: handleApprove})} data={pendingCustomers} />
                </CardContent>
            </Card>
        )}
        <GenericChart 
            title="Customers by City"
            description="A breakdown of customer locations."
            data={chartData}
            dataKeyX="name"
            dataKeysY={['total']}
            chartConfig={chartConfig}
            categorical
        />
      </div>
    </>
  );
}
