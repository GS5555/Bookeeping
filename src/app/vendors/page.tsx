

'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Building, MapPin, PlusCircle, Upload, Download, FileText, FolderTree, Boxes, Search } from 'lucide-react';
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
import { Vendor, Product, Category, SubCategory, VendorType } from '@/lib/types';
import { VendorDialog } from './vendor-dialog';
import { toast } from '@/hooks/use-toast';
import { exportWithDataValidation, exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, where, getDocs, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates, countries } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';

// TODO: Implement a store selection mechanism
const STORE_ID = 'store_main';

export default function VendorsPage() {
    const firestore = useFirestore();
    const vendorsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'stores', STORE_ID, 'vendors'), orderBy('name'), limit(50));
    }, [firestore]);
    const { data: vendorsData, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsCollectionRef);

    const productsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stores', STORE_ID, 'products');
    }, [firestore]);
    const { data: products } = useCollection<Product>(productsCollectionRef);
    
    const categoriesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'settings', 'global', 'categories'), orderBy('name'));
    }, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesCollectionRef);

    const subCategoriesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'settings', 'global', 'subCategories');
    }, [firestore]);
    const { data: subCategories } = useCollection<SubCategory>(subCategoriesCollectionRef);
    
    const vendorTypesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'vendorTypes') : null, [firestore]);
    const { data: vendorTypes } = useCollection<VendorType>(vendorTypesRef);

    const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | undefined>();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');

    const filteredSubCategories = useMemo(() => {
        if (!categoryFilter || categoryFilter === 'all') return [];
        return subCategories?.filter(sc => sc.categoryId === categoryFilter) || [];
    }, [categoryFilter, subCategories]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let tempProducts = products;
        if (subCategoryFilter && subCategoryFilter !== 'all') {
            tempProducts = tempProducts.filter(p => p.subCategory === subCategoryFilter);
        } else if (categoryFilter && categoryFilter !== 'all') {
            tempProducts = tempProducts.filter(p => p.category === categoryFilter);
        }
        return tempProducts;
    }, [categoryFilter, subCategoryFilter, products]);

    const vendors = useMemo(() => {
        if (!vendorsData || !products || !categories || !subCategories) return [];

        let filteredVendorsByName = vendorsData;
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredVendorsByName = vendorsData.filter(v =>
                v.name.toLowerCase().includes(lowercasedQuery) ||
                (v.email && v.email.toLowerCase().includes(lowercasedQuery)) ||
                (v.contactPerson && v.contactPerson.toLowerCase().includes(lowercasedQuery))
            );
        }

        let filteredVendors = filteredVendorsByName;
        const vendorProductMap = new Map<string, string[]>();
        
        products?.forEach(p => {
            const vendorId = p.vendorId;
            if(!vendorProductMap.has(vendorId)) {
                vendorProductMap.set(vendorId, []);
            }
            vendorProductMap.get(vendorId)?.push(p.id);
        });

        if (productFilter && productFilter !== 'all') {
            const vendorIdForProduct = products?.find(p => p.id === productFilter)?.vendorId;
            if (vendorIdForProduct) {
                filteredVendors = filteredVendors.filter(v => v.id === vendorIdForProduct);
            } else {
                filteredVendors = [];
            }
        } else if (subCategoryFilter && subCategoryFilter !== 'all') {
            const vendorIds = new Set<string>();
            products?.filter(p => p.subCategory === subCategoryFilter).forEach(p => vendorIds.add(p.vendorId));
            filteredVendors = filteredVendors.filter(v => vendorIds.has(v.id));
        } else if (categoryFilter && categoryFilter !== 'all') {
            const vendorIds = new Set<string>();
            products?.filter(p => p.category === categoryFilter).forEach(p => vendorIds.add(p.vendorId));
            filteredVendors = filteredVendors.filter(v => vendorIds.has(v.id));
        }
        
        return filteredVendors.map(vendor => {
            const vendorProducts = vendorProductMap.get(vendor.id) || [];
            const vendorCategories = new Set<string>();
            const vendorSubCategories = new Set<string>();
            vendorProducts.forEach(productId => {
                const product = products?.find(p => p.id === productId);
                if (product) {
                    const category = categories?.find(c => c.id === product.category);
                    if(category) vendorCategories.add(category.name);

                    const subCategory = subCategories?.find(sc => sc.id === product.subCategory);
                    if(subCategory) vendorSubCategories.add(subCategory.name);
                }
            });
            return {
                ...vendor,
                productCategories: Array.from(vendorCategories).join(', '),
                productSubCategories: Array.from(vendorSubCategories).join(', '),
            };
        });
    }, [vendorsData, products, categories, subCategories, categoryFilter, subCategoryFilter, productFilter, searchQuery]);


    const handleAdd = () => {
        setEditingVendor(undefined);
        setIsVendorDialogOpen(true);
    };

    const handleEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setIsVendorDialogOpen(true);
    };

    const handleDelete = async (vendorId: string) => {
        if (!firestore) return;
        try {
          await deleteDoc(doc(firestore, 'stores', STORE_ID, 'vendors', vendorId));
          toast({ title: "Success!", description: "Vendor deleted successfully." });
        } catch (error) {
          console.error("Error deleting vendor:", error);
          toast({ title: "Error", description: "Could not delete vendor.", variant: "destructive" });
        }
    };

    const handleSuccess = async (vendor: Vendor) => {
        if (!firestore) return;
        const message = editingVendor ? "Vendor updated successfully." : "Vendor added successfully.";
        try {
          const vendorDocRef = doc(firestore, 'stores', STORE_ID, 'vendors', vendor.id);
          await setDoc(vendorDocRef, vendor, { merge: true });

          setIsVendorDialogOpen(false);
          setEditingVendor(undefined);
          toast({ title: "Success!", description: message });
        } catch (error) {
           console.error("Error saving vendor:", error);
           toast({ title: "Error", description: "Could not save vendor.", variant: "destructive" });
        }
    };

    const handleExport = () => {
        if (!vendors) return;
        const dataToExport = vendors.map(v => {
            const primaryAddress = v.addresses.find(a => a.isPrimary) || v.addresses[0];
            return {
                name: v.name,
                'Type of Vendor': v.vendorType || '',
                contactPerson: v.contactPerson,
                email: v.email,
                phone: v.phone,
                gstNumber: v.gstNumber,
                street: primaryAddress?.street || '',
                city: primaryAddress?.city || '',
                state: primaryAddress?.state || '',
                zip: primaryAddress?.zip || '',
                country: primaryAddress?.country || '',
                'Product Categories': (v as any).productCategories || '',
                'Product Sub-Categories': (v as any).productSubCategories || '',
            }
        });
        exportToExcel(dataToExport, 'vendors_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { name: "Sample Vendor", 'Type of Vendor': 'Manufacturer', contactPerson: "John Doe", email: "vendor@example.com", phone: "9876543210", gstNumber: "", street: "123 Vendor St", city: "Vendor City", state: "Maharashtra", zip: "123456", country: "India", 'Product Categories (read-only)': 'Bats', 'Product Sub-Categories (read-only)': 'English Willow' },
        ];
        const validations = {
            state: indianStates,
            country: countries,
            'Type of Vendor': vendorTypes?.map(vt => vt.name) || [],
        }
        exportWithDataValidation(sampleData, 'Vendors', validations, 'vendors_import_sample');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    // Helper to read headers case-insensitively
    const getHeader = (item: any, keys: string[]) => {
        for (const key of keys) {
            const itemKey = Object.keys(item).find(k => k.trim().toLowerCase() === key.toLowerCase());
            if (itemKey !== undefined && item[itemKey] !== null && item[itemKey] !== undefined) {
                return item[itemKey];
            }
        }
        return undefined;
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!firestore) return;
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

                    const name = getHeader(item, ['name']);
                    const email = getHeader(item, ['email']);
                    if (!name || !email) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: 'name' and 'email' are required.`, variant: "destructive" });
                        return;
                    }

                    const vendorData: Partial<Vendor> = {
                        storeId: STORE_ID,
                        name: name,
                        vendorType: getHeader(item, ['Type of Vendor', 'vendorType']),
                        contactPerson: getHeader(item, ['contactPerson', 'contact person']),
                        email: email,
                        phone: getHeader(item, ['phone', 'phone number']) as string,
                        gstNumber: getHeader(item, ['gstNumber', 'gst number']),
                        addresses: [{
                            id: `addr_${Date.now()}_${Math.random()}`,
                            street: getHeader(item, ['street', 'address']),
                            city: getHeader(item, ['city']),
                            state: getHeader(item, ['state']),
                            zip: getHeader(item, ['zip', 'zip code']),
                            country: getHeader(item, ['country']),
                            isPrimary: true,
                        }],
                        products: [], // Products cannot be imported via Excel for now
                    };

                    const vendorsRef = collection(firestore, 'stores', STORE_ID, 'vendors');
                    const q = query(vendorsRef, where("email", "==", email));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        // New vendor
                        const newDocRef = doc(vendorsRef);
                        batch.set(newDocRef, { ...vendorData, id: newDocRef.id });
                        newCount++;
                    } else {
                        // Existing vendor
                        const existingDocRef = querySnapshot.docs[0].ref;
                        batch.update(existingDocRef, vendorData);
                        updateCount++;
                    }
                }
                
                await batch.commit();

                toast({
                    title: "Import Successful!",
                    description: `${newCount} vendors created, ${updateCount} vendors updated.`,
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
        const safeVendors = vendorsData || [];
        const safeProducts = products || [];

        const categoryCount = new Set(safeProducts.map(p => p.category)).size;
        const subCategoryCount = new Set(safeProducts.map(p => p.subCategory).filter(Boolean)).size;
        
        return [
            { title: "Total Vendors", value: safeVendors.length.toString(), icon: Building },
            { title: "Categories", value: categoryCount.toString(), icon: FolderTree },
            { title: "Sub-Categories", value: subCategoryCount.toString(), icon: Boxes },
        ];
    }, [vendorsData, products]);

    const chartData = useMemo(() => {
        if (!products || !categories) return [];
        const categoryCounts = products.reduce((acc, product) => {
            const category = categories.find(c => c.id === product.category);
            if (category) {
                acc[category.name] = (acc[category.name] || 0) + 1;
            } else {
                 acc['Uncategorized'] = (acc['Uncategorized'] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(categoryCounts).map(([name, total]) => ({ name, total }));
    }, [products, categories]);

    const chartConfig: ChartConfig = useMemo(() => ({
        total: { label: 'Vendors', color: 'hsl(var(--chart-1))' },
    }), []);


  return (
    <>
      <PageHeader title="Vendors">
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search vendors..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={handleExport} size="sm" disabled={!vendors || vendors.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" onClick={handleDownloadSample} size="sm">
            <FileText className="mr-2 h-4 w-4" /> Sample
        </Button>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-6">
                    <CardTitle>Vendor List</CardTitle>
                    <CardDescription>
                    View and manage your list of vendors and suppliers. Use the filters below to narrow your search.
                    </CardDescription>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger><SelectValue placeholder="Filter by Category..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter} disabled={!categoryFilter || categoryFilter === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Filter by Sub-Category..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sub-Categories</SelectItem>
                                {filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={productFilter} onValueChange={setProductFilter} disabled={!categoryFilter && !subCategoryFilter}>
                            <SelectTrigger><SelectValue placeholder="Filter by Product..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                {filteredProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
          <CardContent>
            <DataTable columns={columns({onEdit: handleEdit, onDelete: handleDelete})} data={vendors || []} />
          </CardContent>
        </Card>
        <VendorDialog
            open={isVendorDialogOpen}
            onOpenChange={setIsVendorDialogOpen}
            vendor={editingVendor}
            onSuccess={handleSuccess}
        />
        <GenericChart 
            title="Products by Category"
            description="A breakdown of products supplied by vendors across different categories."
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
