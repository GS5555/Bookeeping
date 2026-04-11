'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Box, CircleDollarSign, PlusCircle, Power, Upload, Download, FileText, Search, Copy, PowerOff } from 'lucide-react';
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
import { Product, InventoryItem, Store, Brand, Category, SubCategory, HsnCode, Vendor, Color, HandPreference, PriceHistoryEntry } from '@/lib/types';
import { ProductDialog } from './product-dialog';
import { PageSummary } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, where, getDocs, writeBatch, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { PriceHistoryDialog } from './price-history-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const STORE_ID = 'store_main';

export default function ProductsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stores', STORE_ID, 'products'), orderBy('name'), limit(250));
  }, [firestore]);

  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollectionRef);

  const inventoryCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stores', STORE_ID, 'inventoryItems');
  }, [firestore]);
  const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: brands } = useCollection<Brand>(brandsRef);
  const categoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'categories'), orderBy('name')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesRef);
  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);
  const hsnCodesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'hsnCodes') : null, [firestore]);
  const { data: hsnCodes } = useCollection<HsnCode>(hsnCodesRef);
  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: vendors } = useCollection<Vendor>(vendorsRef);
  const colorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'colors') : null, [firestore]);
  const { data: colors } = useCollection<Color>(colorsRef);
  const handPreferencesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'handPreferences') : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);


  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [historyProduct, setHistoryProduct] = useState<Product | undefined>();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isMounted = useIsMounted();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsProductDialogOpen(true);
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };
  
  const handleClone = (productToClone: Product) => {
    const { id, sku, serialNumber, ...rest } = productToClone;
    setEditingProduct({
        ...rest,
        name: `Copy of ${productToClone.name}`,
    } as Product);
    setIsProductDialogOpen(true);
  };
  
  const handleToggleActive = async (productId: string, newStatus: boolean) => {
    if (!firestore) return;
    try {
        const docRef = doc(firestore, 'stores', STORE_ID, 'products', productId);
        await updateDoc(docRef, { isActive: newStatus });
        toast({ title: 'Success!', description: 'Product status updated.' });
    } catch(e) {
        console.error("Error toggling product status:", e);
        toast({ title: 'Error', description: 'Could not update product status.', variant: 'destructive'});
    }
  };

  const handleViewHistory = (product: Product) => {
    setHistoryProduct(product);
  };
  
  const handleDelete = async (productId: string) => {
    if (!firestore) return;
    try {
        const batch = writeBatch(firestore);
        const productDocRef = doc(firestore, 'stores', STORE_ID, 'products', productId);
        batch.delete(productDocRef);

        const invQuery = query(collection(firestore, 'stores', STORE_ID, 'inventoryItems'), where('productId', '==', productId));
        const invSnapshot = await getDocs(invQuery);
        invSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        toast({ title: "Success!", description: "Product and associated records deleted." });
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    }
  };
  
  const handleBulkStatusChange = async (selectedProducts: Product[], newStatus: boolean) => {
    if (!firestore || selectedProducts.length === 0) return;
    const batch = writeBatch(firestore);
    selectedProducts.forEach(product => {
      const productRef = doc(firestore, 'stores', STORE_ID, 'products', product.id);
      batch.update(productRef, { isActive: newStatus });
    });
    try {
      await batch.commit();
      toast({ title: "Success!", description: `${selectedProducts.length} products updated.` });
    } catch (error) {
      console.error("Error updating product statuses:", error);
      toast({ title: "Error", description: "Could not update product statuses.", variant: 'destructive' });
    }
  };


  const handleSuccess = async (product: Product) => {
    if (!firestore) return;
    const isEditing = !!editingProduct;
    const message = isEditing ? 'Product updated successfully.' : 'Product added successfully.';
    const productToSave = { ...product };

    try {
        const batch = writeBatch(firestore);
        const docId = product.id || doc(collection(firestore, 'stores', STORE_ID, 'products')).id;
        productToSave.id = docId;
        const productDocRef = doc(firestore, 'stores', STORE_ID, 'products', docId);

        if (isEditing && editingProduct) {
             const hasPriceChanged = editingProduct.sellingPrice !== productToSave.sellingPrice || editingProduct.purchasePrice !== productToSave.purchasePrice;
             if (hasPriceChanged) {
                const newHistoryEntry: PriceHistoryEntry = {
                    sellingPrice: productToSave.sellingPrice,
                    purchasePrice: productToSave.purchasePrice,
                    date: new Date().toISOString(),
                };
                productToSave.priceHistory = [...(productToSave.priceHistory || []), newHistoryEntry];
             }
        } else {
             productToSave.priceHistory = [{
                sellingPrice: productToSave.sellingPrice,
                purchasePrice: productToSave.purchasePrice,
                date: new Date().toISOString(),
            }];
        }

        batch.set(productDocRef, productToSave, { merge: true });

        if (!isEditing) {
            const allStoresQuery = query(collection(firestore, 'stores'));
            const storesSnapshot = await getDocs(allStoresQuery);
            storesSnapshot.forEach(storeDoc => {
                const storeId = storeDoc.id;
                const newInventoryItem: Omit<InventoryItem, 'id' | 'locationComment' | 'lastStockUpdate'> & {locationComment?: string, lastStockUpdate?: string} = {
                    productId: product.id,
                    storeId: storeId,
                    stockBatches: [],
                    locationComment: 'N/A',
                    lastStockUpdate: new Date().toISOString(),
                };
                const inventoryDocRef = doc(collection(firestore, 'stores', storeId, 'inventoryItems'));
                batch.set(inventoryDocRef, { ...newInventoryItem, id: inventoryDocRef.id });
            });
        }
        await batch.commit();

        setIsProductDialogOpen(false);
        setEditingProduct(undefined);
        toast({ title: 'Success!', description: message });
    } catch (error) {
        console.error('Error saving product:', error);
        toast({ title: 'Error', description: 'Could not save product.', variant: 'destructive' });
    }
  };

    const handleExport = () => {
        if (!products || !brands || !categories || !subCategories || !vendors) {
            toast({
                title: "Export Failed",
                description: "Data still loading.",
                variant: "destructive",
            });
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const productsToExport = products.map(p => ({
            "name": p.name,
            "sku": p.sku,
            "purchasePrice": p.purchasePrice,
            "sellingPrice": p.sellingPrice,
            "isActive": p.isActive,
        }));
        const productsWs = XLSX.utils.json_to_sheet(productsToExport);
        XLSX.utils.book_append_sheet(wb, productsWs, "Products");
        XLSX.writeFile(wb, "products_export.xlsx");
    };


  const handleDownloadSample = () => {
    const sampleData = [{"name": "Sample Bat", "sku": "SKU-001", "purchasePrice": 5000, "sellingPrice": 8000}];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "product_sample.xlsx");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || !products) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const json = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);
          if (json.length === 0) return;
          toast({ title: "Importing...", description: "Processing file." });
      } catch (error) {
           console.error("Import Error:", error);
      }
    };
    reader.readAsArrayBuffer(file);
    if(event.target) event.target.value = '';
  };

  const filteredSubCategories = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'all') return [];
    return subCategories?.filter(sc => sc.categoryId === categoryFilter) || [];
  }, [categoryFilter, subCategories]);

  const productsWithTotalStock = useMemo(() => {
    if (!products || !inventory) return [];
    
    let filteredProducts = products;
    if (categoryFilter !== 'all') filteredProducts = filteredProducts.filter(p => p.category === categoryFilter);
    if (subCategoryFilter !== 'all') filteredProducts = filteredProducts.filter(p => p.subCategory === subCategoryFilter);

    if (searchQuery) {
        const lowQuery = searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(lowQuery) || p.sku.toLowerCase().includes(lowQuery));
    }

    const inventoryMap: Record<string, number> = {};
    inventory.forEach(item => {
        const totalQuantity = item.stockBatches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
        inventoryMap[item.productId] = (inventoryMap[item.productId] || 0) + totalQuantity;
    });

    return filteredProducts.map(product => {
      let totalStock = 0;
      if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
        const possibleBundles: number[] = product.bundleItems.map(bundleItem => Math.floor((inventoryMap[bundleItem.productId] || 0) / bundleItem.quantity));
        totalStock = Math.min(...possibleBundles);
      } else {
        totalStock = inventoryMap[product.id] || 0;
      }
      return { ...product, totalStock };
    });
  }, [products, inventory, categoryFilter, subCategoryFilter, searchQuery]);

  const summaryData = useMemo(() => {
    const safeProducts = products || [];
    const totalProducts = safeProducts.length;
    const activeProducts = safeProducts.filter(p => p.isActive).length;
    const averagePrice = totalProducts > 0 ? safeProducts.reduce((acc, p) => acc + p.sellingPrice, 0) / totalProducts : 0;
    
    return [
        { title: "Total Products", value: totalProducts.toString(), icon: Box },
        { title: "Active Products", value: activeProducts.toString(), icon: Power, description: `${totalProducts-activeProducts} inactive` },
        { title: "Average Price", value: isMounted ? `₹${averagePrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', icon: CircleDollarSign },
    ];
  }, [products, isMounted]);

  const chartData = useMemo(() => {
    if (!products || !categories) return [];
    const counts = products.reduce((acc, p) => {
        const cat = categories.find(c => c.id === p.category);
        if(cat) acc[cat.name] = (acc[cat.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [products, categories]);

  const chartConfig: ChartConfig = { total: { label: 'Products', color: 'hsl(var(--chart-1))' } };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-8 min-w-0 w-full overflow-x-hidden">
      <PageHeader title="Products">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm" className="h-9"><Upload className="mr-2 h-4 w-4" /> Import</Button>
        <Button variant="outline" onClick={handleExport} size="sm" className="h-9"><Download className="mr-2 h-4 w-4" /> Export</Button>
        <Button onClick={handleAdd} size="sm" className="h-9"><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>
      </PageHeader>
      
      <div className="flex flex-col gap-8 min-w-0 w-full">
        <PageSummary cards={summaryData} />
        <ProductDialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen} product={editingProduct} onSuccess={handleSuccess} />
        <PriceHistoryDialog product={historyProduct} open={!!historyProduct} onOpenChange={() => setHistoryProduct(undefined)} />
        <Card className="min-w-0 border-2 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div><CardTitle>Product Catalog</CardTitle><CardDescription>Manage your products.</CardDescription></div>
                <div className="relative w-full sm:max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 overflow-hidden">
            <DataTable columns={columns({ onEdit: handleEdit, onDelete: handleDelete, onViewHistory: handleViewHistory, onClone: handleClone, onToggleActive: handleToggleActive, categories: categories || [], subCategories: subCategories || [], brands: brands || [] })} data={productsWithTotalStock} initialPageSize={250} />
          </CardContent>
        </Card>
        <GenericChart title="Categories" description="Products per category." data={chartData} dataKeyX="name" dataKeysY={['total']} chartConfig={chartConfig} categorical />
      </div>
    </div>
  );
}
