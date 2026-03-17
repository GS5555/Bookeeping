'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Box, Package, PlusCircle, TriangleAlert, Upload, Download, FileText, Move, CircleDollarSign, Search, LandPlot } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns, InventoryDetail } from './columns';
import React, { useState, useMemo, useRef } from 'react';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { Product, InventoryItem, Store, Brand, Category, SubCategory } from '@/lib/types';
import { StockDialog, StockFormValues } from './stock-dialog';
import { toast } from '@/hooks/use-toast';
import { ProductDialog } from '@/app/products/product-dialog';
import { exportToExcel } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, where, getDocs, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const STORE_ID = 'store_main';

export default function InventoryPage() {
    const firestore = useFirestore();

    const inventoryCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stores', STORE_ID, 'inventoryItems');
    }, [firestore]);
    const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

    const productsCollectionRef = useMemoFirebase(() => {
        if(!firestore) return null;
        return collection(firestore, 'stores', STORE_ID, 'products');
    }, [firestore]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollectionRef);

    const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
    const { data: brands, isLoading: areBrandsLoading } = useCollection<Brand>(brandsRef);

    const categoriesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'settings', 'global', 'categories'), orderBy('name')) : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesRef);

    const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
    const { data: subCategories } = useCollection<SubCategory>(subCategoriesRef);


    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    
    const [adjustingItem, setAdjustingItem] = useState<InventoryDetail | undefined>();
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMounted = useIsMounted();

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState('all');

    const filteredSubCategories = useMemo(() => {
        if (!categoryFilter || categoryFilter === 'all') return [];
        return subCategories?.filter(sc => sc.categoryId === categoryFilter) || [];
    }, [categoryFilter, subCategories]);

    const inventoryDetails: InventoryDetail[] = useMemo(() => {
        if (!products || !inventory) {
            return [];
        }

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
            const brand = brands?.find(b => b.id === product.brand);
            const category = categories?.find(c => c.id === product.category);
            const subCategory = subCategories?.find(sc => sc.id === product.subCategory);
            
            let totalStock = 0;
            if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
                const possibleBundles: number[] = product.bundleItems.map(bundleItem => {
                    const componentStock = inventoryMap[bundleItem.productId] || 0;
                    if (bundleItem.quantity === 0) return Infinity; // Avoid division by zero
                    return Math.floor(componentStock / bundleItem.quantity);
                });
                totalStock = Math.min(...possibleBundles);
            } else {
                totalStock = inventoryMap[product.id] || 0;
            }

            const inventoryItem = inventory?.find(item => item.productId === product.id);
            const latestPurchasePrice = inventoryItem?.stockBatches?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.purchasePrice ?? product.purchasePrice;

            return {
                ...product,
                id: product.id,
                productId: product.id,
                productName: product.name,
                brandName: brand?.name || 'Unknown Brand',
                categoryName: category?.name || 'N/A',
                subCategoryName: subCategory?.name || 'N/A',
                imageUrl: product.imageUrl,
                sellingPrice: product.sellingPrice,
                purchasePrice: latestPurchasePrice,
                miscellaneousCost: product.miscellaneousCost || 0,
                sku: product.sku,
                quantity: totalStock,
                locationComment: inventoryItem?.locationComment || 'N/A',
                lastStockUpdate: inventoryItem?.lastStockUpdate || '',
                storeId: inventoryItem?.storeId || STORE_ID,
            } as InventoryDetail;
        }).sort((a,b) => (a.productName || '').localeCompare(b.productName || ''));

    }, [inventory, products, brands, categories, subCategories, categoryFilter, subCategoryFilter, searchQuery]);

    const handleNewStockEntry = () => {
        setAdjustingItem(undefined);
        setIsStockDialogOpen(true);
    }

    const handleAdjustStock = (item: InventoryDetail) => {
        setAdjustingItem(item);
        setIsStockDialogOpen(true);
    }

    const handleStockUpdate = async ({ productId, storeId, quantity, vendorId, purchasePrice }: StockFormValues) => {
        if (!firestore) return;

        try {
            const inventoryCollectionRef = collection(firestore, 'stores', storeId, 'inventoryItems');
            const q = query(inventoryCollectionRef, where("productId", "==", productId));
            const querySnapshot = await getDocs(q);

            let invItemRef;
            let currentBatches: InventoryItem['stockBatches'] = [];

            if (!querySnapshot.empty) {
                const inventoryDoc = querySnapshot.docs[0];
                invItemRef = inventoryDoc.ref;
                currentBatches = inventoryDoc.data().stockBatches || [];
            } else {
                const productDetails = products?.find(p => p.id === productId);
                if (productDetails) {
                    invItemRef = doc(inventoryCollectionRef);
                    await setDoc(invItemRef, {
                        id: invItemRef.id,
                        productId: productDetails.id,
                        storeId: storeId,
                        stockBatches: [],
                        locationComment: 'N/A',
                        lastStockUpdate: new Date().toISOString()
                    });
                } else {
                    throw new Error("Could not find product details to create new inventory item.");
                }
            }
            
            if (quantity > 0) {
                 currentBatches.push({
                    date: new Date().toISOString(),
                    quantity: quantity,
                    purchasePrice: purchasePrice,
                    vendorId: vendorId,
                });
            } else {
                // FIFO logic for manual reduction
                let remainingToDecrement = Math.abs(quantity);
                const sortedBatches = currentBatches.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                for (const batch of sortedBatches) {
                    if(remainingToDecrement <= 0) break;
                    const amountToDecrement = Math.min(batch.quantity, remainingToDecrement);
                    batch.quantity -= amountToDecrement;
                    remainingToDecrement -= amountToDecrement;
                }
                 if(remainingToDecrement > 0) {
                     throw new Error("Cannot reduce stock below zero.");
                 }
                currentBatches = sortedBatches.filter(b => b.quantity > 0);
            }

            await updateDoc(invItemRef, { 
                stockBatches: currentBatches,
                lastStockUpdate: new Date().toISOString()
            });

            toast({
                title: "Stock Updated!",
                description: `Stock for product ID ${productId} has been adjusted.`
            });

        } catch (error: any) {
            console.error("Error updating stock:", error);
            toast({
                title: "Error",
                description: error.message || "Could not update stock.",
                variant: "destructive",
            })
        }
        
        setIsStockDialogOpen(false);
        setAdjustingItem(undefined);
    }

    const handleViewHistory = (item: InventoryDetail) => {
        toast({
            title: "Coming Soon!",
            description: `History tracking for ${item.productName} is not yet implemented.`
        })
    }

    const handleEditProduct = (item: InventoryDetail) => {
        if (!products) return;
        const product = products.find(p => p.id === item.productId);
        if (product) {
            setEditingProduct(product);
            setIsProductDialogOpen(true);
        }
    }

    const handleProductUpdateSuccess = async (product: Product) => {
        if (!firestore) return;
        try {
            const docRef = doc(firestore, 'stores', product.storeId, 'products', product.id);
            await setDoc(docRef, product, { merge: true });
            
            setIsProductDialogOpen(false);
            setEditingProduct(undefined);
            toast({
                title: "Product Updated!",
                description: `${product.name} details have been saved.`
            })
        } catch (error) {
            console.error("Error updating product:", error);
            toast({ title: "Error", description: "Could not update product.", variant: "destructive" });
        }
    }
    
    const handleExport = () => {
        const dataToExport = inventoryDetails.map(item => {
            const landingPrice = (item.purchasePrice || 0) + (item.miscellaneousCost || 0);
            return {
                'Category': item.categoryName,
                'Sub-Category': item.subCategoryName,
                'Brand Name': item.brandName,
                'SKU': item.sku,
                'Product Name': item.productName,
                'Quantity': item.quantity,
                'Purchase Price': item.purchasePrice,
                'Miscellaneous Cost': item.miscellaneousCost,
                'Landing Price': landingPrice,
                'Selling Price': item.sellingPrice,
            };
        });
        exportToExcel(dataToExport, 'inventory_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { sku: "KB-BAT-001", quantity: 15 },
         { sku: "SG-BAL-001", quantity: 50 },
        ];
        exportToExcel(sampleData, 'inventory_update_sample');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) return;

        // Fetch all products and inventory items to create local maps.
        const allProducts = products || [];
        const allInventory = inventory || [];

        const productSkuMap = new Map(allProducts.map(p => [p.sku.trim().toLowerCase(), p]));
        const inventoryProductIdMap = new Map(allInventory.map(i => [i.productId, i]));
        
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
                let totalUpdateCount = 0;
                let totalCreateCount = 0;
                const notFoundSkus: string[] = [];

                for (const item of json) {
                    const skuValue = getHeader(item, ['sku']);
                    const quantity = getHeader(item, ['quantity']);

                    if (!skuValue || quantity === undefined) {
                        continue; // Skip rows without SKU or Quantity
                    }
                    
                    const trimmedSku = String(skuValue).trim().toLowerCase();
                    const product = productSkuMap.get(trimmedSku);

                    if (product) {
                        const existingInventory = inventoryProductIdMap.get(product.id);
                        const inventoryCollectionRef = collection(firestore, 'stores', STORE_ID, 'inventoryItems');
                        
                        if (existingInventory) {
                            const newStockBatch = {
                                date: new Date().toISOString(),
                                quantity: Number(quantity),
                                purchasePrice: product.purchasePrice, // Use product's current purchase price for this manual update
                                vendorId: product.vendorId
                            };
                            const updatedBatches = [...(existingInventory.stockBatches || []), newStockBatch];
                            
                            const invDocRef = doc(inventoryCollectionRef, existingInventory.id);
                            batch.update(invDocRef, { 
                                stockBatches: updatedBatches,
                                lastStockUpdate: new Date().toISOString()
                            });
                            totalUpdateCount++;
                        } else {
                            // Create new inventory record with one batch
                             const newStockBatch = {
                                date: new Date().toISOString(),
                                quantity: Number(quantity),
                                purchasePrice: product.purchasePrice,
                                vendorId: product.vendorId
                            };
                            const newInvDocRef = doc(inventoryCollectionRef);
                            batch.set(newInvDocRef, {
                                id: newInvDocRef.id,
                                productId: product.id,
                                storeId: STORE_ID,
                                stockBatches: [newStockBatch],
                                locationComment: 'N/A',
                                lastStockUpdate: new Date().toISOString(),
                            });
                            totalCreateCount++;
                        }
                    } else {
                        notFoundSkus.push(String(skuValue).trim());
                    }
                }

                if (totalUpdateCount > 0 || totalCreateCount > 0) {
                    await batch.commit();
                }
                
                const successMessage = [
                    totalUpdateCount > 0 && `${totalUpdateCount} updated`,
                    totalCreateCount > 0 && `${totalCreateCount} created`,
                    notFoundSkus.length > 0 && `${notFoundSkus.length} SKUs not found`
                ].filter(Boolean).join(', ');
                
                toast({
                    title: "Import Complete!",
                    description: successMessage || "No changes made.",
                });
                
                if (notFoundSkus.length > 0) {
                  console.warn("SKUs not found during import:", notFoundSkus);
                }

            } catch (error) {
                 console.error("Import Error:", error);
                 toast({
                    title: "Import Error",
                    description: "Error processing file. Please ensure SKU and Quantity columns are correct.",
                    variant: "destructive",
                });
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const lowStockInventory = useMemo(() => {
        return inventoryDetails.filter(item => item.quantity < 10);
    }, [inventoryDetails]);

    const { 
        totalSKUs, 
        totalQuantity, 
        lowStockItems, 
        inventoryValueBySellPrice, 
        inventoryValueByLandedCost,
        totalLandedPurchasePrice,
        totalLandedMiscCost,
        totalLandedGst
    } = useMemo(() => {
        const totalSKUs = products?.length || 0;
        const totalQuantity = inventoryDetails.reduce((acc, item) => acc + item.quantity, 0);
        const lowStockItems = inventoryDetails.filter(item => item.quantity < 10).length;
        
        let totalLandedPurchasePrice = 0;
        let totalLandedMiscCost = 0;
        let totalLandedGst = 0;
        let inventoryValueBySellPrice = 0;

        inventoryDetails.forEach(item => {
            const purchasePrice = item.purchasePrice || 0;
            const miscCost = item.miscellaneousCost || 0;
            const gstRate = item.gstRate || 0;
            const quantity = item.quantity;

            // Purchase value
            const itemPurchaseValue = purchasePrice * quantity;
            totalLandedPurchasePrice += itemPurchaseValue;

            // Misc cost value
            const itemMiscValue = miscCost * quantity;
            totalLandedMiscCost += itemMiscValue;
            
            // GST value
            const itemGstValue = (purchasePrice + miscCost) * (gstRate / 100) * quantity;
            totalLandedGst += itemGstValue;
            
            // Retail value
            const sellPrice = item.finalPrice && item.finalPrice > 0 ? item.finalPrice : item.sellingPrice;
            inventoryValueBySellPrice += sellPrice * quantity;
        });

        const inventoryValueByLandedCost = totalLandedPurchasePrice + totalLandedMiscCost + totalLandedGst;

        return { 
            totalSKUs, 
            totalQuantity, 
            lowStockItems, 
            inventoryValueBySellPrice, 
            inventoryValueByLandedCost,
            totalLandedPurchasePrice,
            totalLandedMiscCost,
            totalLandedGst
        };
    }, [inventoryDetails, products]);

    const summaryData: SummaryCardData[] = useMemo(() => {
        const formatVal = (val: number) => isMounted ? `₹${(val / 1000).toFixed(1)}k` : '...';
        return [
            { title: "Total SKU", value: totalSKUs.toString(), icon: Box },
            { title: "Total Quantity", value: isMounted ? totalQuantity.toLocaleString() : "...", icon: Package },
            { 
                title: "Inventory Landed Value", 
                value: isMounted ? `₹${inventoryValueByLandedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', 
                icon: LandPlot, 
                description: `PP: ${formatVal(totalLandedPurchasePrice)} + Misc: ${formatVal(totalLandedMiscCost)} + GST: ${formatVal(totalLandedGst)}`
            },
            { 
                title: "Inventory Retail Value", 
                value: isMounted ? `₹${inventoryValueBySellPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹...', 
                icon: CircleDollarSign, 
                description: `Landed: ${formatVal(inventoryValueByLandedCost)} + Profit` 
            },
            { title: "Low Stock Alert", value: lowStockItems.toString(), icon: TriangleAlert, description: "Items with < 10 units" },
        ];
    }, [
        totalSKUs, totalQuantity, inventoryValueBySellPrice, inventoryValueByLandedCost, 
        lowStockItems, isMounted, totalLandedPurchasePrice, totalLandedMiscCost, totalLandedGst
    ]);

  return (
    <>
      <PageHeader title="Inventory">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleImportClick} size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" onClick={handleDownloadSample} size="sm">
            <FileText className="mr-2 h-4 w-4" /> Sample
        </Button>
        <Button variant="outline" disabled>
          <Move className="mr-2 h-4 w-4" />
          Transfer Stock
        </Button>
        <Button onClick={handleNewStockEntry}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Stock Entry
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <PageSummary cards={summaryData} />

        <StockDialog
            open={isStockDialogOpen}
            onOpenChange={setIsStockDialogOpen}
            onSuccess={handleStockUpdate}
            inventoryItem={adjustingItem}
        />
        <ProductDialog
            open={isProductDialogOpen}
            onOpenChange={setIsProductDialogOpen}
            product={editingProduct}
            onSuccess={handleProductUpdateSuccess}
        />
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>
                    Track and manage all your product stock levels.
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
                columns={columns({ onAdjustStock: handleAdjustStock, onViewHistory: handleViewHistory, onEditProduct: handleEditProduct })} 
                data={inventoryDetails} 
                initialPageSize={100}
            />
          </CardContent>
        </Card>

        {lowStockInventory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <TriangleAlert />
                    Low Inventory Alerts
                </CardTitle>
                <CardDescription>
                  These items are running low. Consider reordering soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={columns({ onAdjustStock: handleAdjustStock, onViewHistory: handleViewHistory, onEditProduct: handleEditProduct })} data={lowStockInventory} />
              </CardContent>
            </Card>
        )}
      </div>
    </>
  );
}
