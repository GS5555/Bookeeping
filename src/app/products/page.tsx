

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

// TODO: Implement a store selection mechanism
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
        toast({ title: 'Success!', description: 'Product and associated inventory records deleted.' });
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: 'Error', description: 'Could not delete product.', variant: "destructive" });
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
      toast({ title: 'Success!', description: `${selectedProducts.length} products updated.` });
    } catch (error) {
      console.error("Error updating product statuses:", error);
      toast({ title: 'Error', description: 'Could not update product statuses.', variant: 'destructive' });
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
                description: "Some data is still loading. Please try again in a moment.",
                variant: "destructive",
            });
            return;
        }
        
        const wb = XLSX.utils.book_new();

        // Main Products Sheet
        const productsToExport = products.map(p => {
            const brand = brands.find(b => b.id === p.brand)?.name || p.brand;
            const category = categories.find(c => c.id === p.category)?.name || p.category;
            const subCategory = subCategories.find(sc => sc.id === p.subCategory)?.name || p.subCategory;
            const vendor = vendors.find(v => v.id === p.vendorId)?.name || p.vendorId;

            return {
                "name": p.name,
                "handPreference": p.handPreference,
                "sku": p.sku,
                "brand": brand,
                "category": category,
                "subCategory": subCategory,
                "vendor": vendor,
                "purchasePrice": p.purchasePrice,
                "miscellaneousCost": p.miscellaneousCost || 0,
                "sellingPrice": p.sellingPrice,
                "description": p.description,
                "hsnCode": p.hsnCode,
                "gstRate": p.gstRate,
                "color1": p.color1,
                "color2": p.color2,
                "imageUrl": p.imageUrl,
                "isActive": p.isActive,
                "isBundle": p.isBundle,
            };
        });
        const productsWs = XLSX.utils.json_to_sheet(productsToExport);
        XLSX.utils.book_append_sheet(wb, productsWs, "Products");

        // Price History Sheet
        const priceHistoryToExport = products.flatMap(p => {
            return (p.priceHistory || []).map((h: PriceHistoryEntry) => ({
                'SKU': p.sku,
                'Product Name': p.name,
                'Date': new Date(h.date).toLocaleDateString('en-CA'), // YYYY-MM-DD for better sorting in Excel
                'Purchase Price': h.purchasePrice,
                'Selling Price': h.sellingPrice,
            }));
        });
        if(priceHistoryToExport.length > 0) {
            const historyWs = XLSX.utils.json_to_sheet(priceHistoryToExport);
            XLSX.utils.book_append_sheet(wb, historyWs, "Price History");
        }

        XLSX.writeFile(wb, "products_export.xlsx");
    };


  const handleDownloadSample = () => {
    const sampleData = [
      {
        "name": "Sample Bat",
        "handPreference": "Right",
        "sku": "YOUR-SKU-HERE",
        "brand": "Sample Brand Name",
        "category": "Sample Category Name",
        "subCategory": "Sample Sub-Category Name",
        "vendor": "Sample Vendor Name",
        "purchasePrice": 5000,
        "miscellaneousCost": 200,
        "sellingPrice": 8000,
        "description": "A sample product description.",
        "hsnCode": "950699",
        "gstRate": 12,
        "color1": "Red",
        "color2": "Black",
        "imageUrl": "https://placehold.co/100x100.png",
        "isActive": true,
        "isBundle": false,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product Updates");
    XLSX.writeFile(wb, "product_update_sample.xlsx");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || !vendors || !categories || !brands || !hsnCodes || !subCategories || !products) {
        toast({ title: "Import Error", description: "Core settings data is not loaded yet. Please try again in a moment.", variant: "destructive" });
        return;
    }
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
          }

          const batch = writeBatch(firestore);
          let updatedCount = 0;
          let newCount = 0;
          let notFoundSkus: string[] = [];
          const newProductsForInventory: Product[] = [];
          
          const storesSnapshot = await getDocs(query(collection(firestore, 'stores')));

          for (let i = 0; i < json.length; i++) {
              const item = json[i];
              const sku = getHeader(item, ['sku']);
              if (!sku) continue;

              const existingProduct = products.find(p => p.sku === String(sku).trim());
              
              if (existingProduct) { // UPDATE
                  const updateData: Partial<Product> = {};
                  const fieldsToUpdate = {
                      name: getHeader(item, ['name', 'product name']),
                      sellingPrice: getHeader(item, ['sellingprice', 'selling price']),
                      purchasePrice: getHeader(item, ['purchaseprice', 'purchase price']),
                      // ... more fields ...
                      isActive: getHeader(item, ['isactive', 'active']),
                  };
                  for (const [key, value] of Object.entries(fieldsToUpdate)) {
                      if (value !== undefined) { (updateData as any)[key] = value; }
                  }
                  // ... logic to find and set brand/category/etc IDs ...
                  if (Object.keys(updateData).length > 0) {
                      const docRef = doc(firestore, 'stores', STORE_ID, 'products', existingProduct.id);
                      batch.update(docRef, updateData);
                      updatedCount++;
                  }
              } else { // CREATE
                  const name = getHeader(item, ['name', 'product name']);
                  const brandName = getHeader(item, ['brand']);
                  const categoryName = getHeader(item, ['category']);
                  const vendorName = getHeader(item, ['vendor']);
                  
                  if (!name || !brandName || !categoryName || !vendorName) {
                      toast({ title: "Skipped Row", description: `Row ${i+2} is missing required fields (name, brand, category, vendor) for new product.`, variant: "destructive"});
                      continue;
                  }
                  
                  const brand = brands.find(b => b.name.toLowerCase() === String(brandName).toLowerCase());
                  const category = categories.find(c => c.name.toLowerCase() === String(categoryName).toLowerCase());
                  const vendor = vendors.find(v => v.name.toLowerCase() === String(vendorName).toLowerCase());

                  if (!brand || !category || !vendor) {
                       toast({ title: "Skipped Row", description: `Row ${i+2}: Could not find matching Brand, Category, or Vendor.`, variant: "destructive"});
                       continue;
                  }

                  const newDocRef = doc(collection(firestore, 'stores', STORE_ID, 'products'));
                  const newProductData: Product = {
                      id: newDocRef.id,
                      storeId: STORE_ID,
                      name: name,
                      sku: String(sku).trim(),
                      brand: brand.id,
                      category: category.id,
                      vendorId: vendor.id,
                      purchasePrice: getHeader(item, ['purchaseprice', 'purchase price']) || 0,
                      sellingPrice: getHeader(item, ['sellingprice', 'selling price']) || 0,
                      hsnCode: getHeader(item, ['hsncode', 'hsn code']) || '',
                      gstRate: getHeader(item, ['gstrate', 'gst rate']) || 0,
                      isActive: getHeader(item, ['isactive', 'active']) !== false, // default to true
                      isBundle: getHeader(item, ['isbundle', 'is bundle']) || false,
                      description: getHeader(item, ['description']) || '',
                      // ... set other fields from excel or to defaults
                  };
                  batch.set(newDocRef, newProductData);
                  newProductsForInventory.push(newProductData);
                  newCount++;
              }
          }
          
          if (updatedCount > 0 || newCount > 0) {
            await batch.commit();
          }

          if (newProductsForInventory.length > 0) {
              const inventoryBatch = writeBatch(firestore);
              newProductsForInventory.forEach(newProd => {
                  storesSnapshot.forEach(storeDoc => {
                      const inventoryDocRef = doc(collection(firestore, 'stores', storeDoc.id, 'inventoryItems'));
                      inventoryBatch.set(inventoryDocRef, {
                          id: inventoryDocRef.id,
                          productId: newProd.id,
                          storeId: storeDoc.id,
                          stockBatches: [],
                          locationComment: 'N/A',
                          lastStockUpdate: new Date().toISOString(),
                      });
                  });
              });
              await inventoryBatch.commit();
          }

          toast({
              title: "Import Complete!",
              description: `${newCount} products created, ${updatedCount} products updated. ${notFoundSkus.length} SKUs were not found.`,
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

  const filteredSubCategories = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'all') return [];
    return subCategories?.filter(sc => sc.categoryId === categoryFilter) || [];
  }, [categoryFilter, subCategories]);

  const productsWithTotalStock = useMemo(() => {
    if (!products || !inventory) return [];
    
    let filteredProducts = products;
    if (categoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === categoryFilter);
    }
    if (subCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.subCategory === subCategoryFilter);
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(lowercasedQuery) ||
            p.sku.toLowerCase().includes(lowercasedQuery)
        );
    }

    const inventoryMap: Record<string, number> = {};
    inventory.forEach(item => {
        const key = item.productId;
        const totalQuantity = item.stockBatches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
        inventoryMap[key] = (inventoryMap[key] || 0) + totalQuantity;
    });

    return filteredProducts.map(product => {
      let totalStock = 0;
      if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
        const possibleBundles: number[] = product.bundleItems.map(bundleItem => {
          const componentStock = inventoryMap[bundleItem.productId] || 0;
          return Math.floor(componentStock / bundleItem.quantity);
        });
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
    const categoryCounts = products.reduce((acc, product) => {
        const category = categories.find(c => c.id === product.category);
        if(category) {
            acc[category.name] = (acc[category.name] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([name, total]) => ({ name, total }));
  }, [products, categories]);

  const chartConfig: ChartConfig = useMemo(() => ({
    total: { label: 'Products', color: 'hsl(var(--chart-1))' },
  }), []);

  return (
    <>
      <PageHeader title="Products">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button variant="outline" onClick={handleExport} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
         <Button variant="outline" onClick={handleDownloadSample} size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Sample
        </Button>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />
        <ProductDialog
            open={isProductDialogOpen}
            onOpenChange={setIsProductDialogOpen}
            product={editingProduct}
            onSuccess={handleSuccess}
        />
        <PriceHistoryDialog 
            product={historyProduct}
            open={!!historyProduct}
            onOpenChange={() => setHistoryProduct(undefined)}
        />
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <CardTitle>Product Catalog</CardTitle>
                    <CardDescription>
                    Manage your products, view details, and edit them.
                    </CardDescription>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Select value={categoryFilter} onValueChange={(value) => {setCategoryFilter(value); setSubCategoryFilter('all');}}>
                    <SelectTrigger><SelectValue placeholder="Filter by Category..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter} disabled={!categoryFilter || categoryFilter === 'all' || filteredSubCategories.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Filter by Sub-Category..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sub-Categories</SelectItem>
                        {filteredSubCategories.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={columns({
                    onEdit: handleEdit, 
                    onDelete: handleDelete,
                    onViewHistory: handleViewHistory,
                    onClone: handleClone,
                    onToggleActive: handleToggleActive,
                    categories: categories || [],
                    subCategories: subCategories || [],
                    brands: brands || []
                })} 
                data={productsWithTotalStock}
                initialPageSize={250}
                onDeleteSelected={(selectedRows) => selectedRows.forEach(row => handleDelete(row.id))}
                onActivateSelected={(selectedRows) => handleBulkStatusChange(selectedRows, true)}
                onDeactivateSelected={(selectedRows) => handleBulkStatusChange(selectedRows, false)}
            />
          </CardContent>
        </Card>
        <GenericChart
            title="Products by Category"
            description="A breakdown of products in each category."
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

