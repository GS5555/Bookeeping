

'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, CheckCircle, Clock, Percent, Upload, Download, Share } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import { useState, useMemo } from 'react';
import { Quotation, Product, Customer, Company, User, Sale } from '@/lib/types';
import { QuotationDialog } from './quotation-dialog';
import { toast } from '@/hooks/use-toast';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import { ChartConfig } from '@/components/ui/chart';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { collection, doc, query, orderBy, setDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import React from 'react';
import * as XLSX from 'xlsx';
import { exportWithDataValidation, exportToExcel, generateShareText } from '@/lib/actions';
import { format, addDays } from 'date-fns';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { ShareDialog } from '@/components/share-dialog';
import { SaleDialog } from '@/app/sales/sale-dialog';

const STORE_ID = 'store_main';

export default function QuotationsPage() {
    const firestore = useFirestore();
    const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();
    const { currentUser } = useCurrentUser();

    const quotationsCollectionRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'quotations'), orderBy('date', 'desc')) : null, [firestore]);
    const { data: quotationsData, isLoading: areQuotationsLoading } = useCollection<Quotation>(quotationsCollectionRef);

    const customersCollectionRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersCollectionRef);
    
    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
    const { data: products } = useCollection<Product>(productsRef);

    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: usersData } = useCollection<User>(usersRef);

    const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [saleFromQuotation, setSaleFromQuotation] = useState<Partial<Sale> | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const safeCustomers = customers || [];
    const safeUsers = usersData || [];

    const quotations = useMemo(() => {
        if (!quotationsData || !usersData) return [];
        return quotationsData.map(q => ({
            ...q,
            createdByName: usersData.find(u => u.id === q.createdBy)?.displayName || 'Unknown User'
        }));
    }, [quotationsData, usersData]);

    const handleCreateQuotation = () => {
        setEditingQuotation(undefined);
        setIsQuotationDialogOpen(true);
    };

    const handleEditQuotation = (quotation: Quotation) => {
        setEditingQuotation(quotation);
        setIsQuotationDialogOpen(true);
    };
    
    const handleConvertToSale = (quotation: Quotation) => {
        const customer = customers?.find(c => c.id === quotation.customerId);
        if (!customer) {
            toast({ title: 'Error', description: 'Customer not found for this quotation.', variant: 'destructive' });
            return;
        }

        const saleItems = quotation.items.map(item => {
            const product = products?.find(p => p.id === item.productId);
            return {
                ...item,
                brandId: product?.brand || '',
            }
        });
        
        setSaleFromQuotation({
            customerId: quotation.customerId,
            items: saleItems,
        });

        setIsQuotationDialogOpen(false);
        setIsSaleDialogOpen(true);
    }

    const handleDeleteQuotation = async (quotationId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'stores', STORE_ID, 'quotations', quotationId));
            toast({ title: 'Success!', description: 'Quotation deleted successfully.' });
        } catch (error) {
            console.error("Error deleting quotation:", error);
            toast({ title: 'Error', description: 'Could not delete quotation.', variant: 'destructive' });
        }
    };

    const handleSuccess = async (quotation: Quotation) => {
        if (!firestore || !currentUser) return;
        const isEditing = !!editingQuotation;
        const message = isEditing ? 'Quotation updated successfully.' : 'Quotation created successfully.';
        try {
            const quotationDocRef = doc(firestore, 'stores', STORE_ID, 'quotations', quotation.id);
            const finalQuotation: Quotation = { ...quotation, createdBy: quotation.createdBy || currentUser.id };
            
            await setDoc(quotationDocRef, finalQuotation, { merge: true });
            setIsQuotationDialogOpen(false);
            setEditingQuotation(undefined);
            toast({ title: 'Success!', description: message });
        } catch (error) {
            console.error("Error saving quotation:", error);
            toast({ title: 'Error', description: 'Could not save quotation.', variant: "destructive" });
        }
    };

    const handleSaleSuccess = async (sale: Sale) => {
        if (!products || !currentUser) {
            toast({ title: "Error", description: "Core data is not loaded yet.", variant: "destructive" });
            return;
        }
        
        try {
            const batch = writeBatch(firestore);
            const saleDocRef = doc(collection(firestore, 'stores', STORE_ID, 'sales'));
            const finalSaleData: Sale = { ...sale, id: saleDocRef.id, createdBy: currentUser.id };
            batch.set(saleDocRef, finalSaleData);

            // Update inventory
            const inventoryCollectionRef = collection(firestore, 'stores', finalSaleData.storeId, 'inventoryItems');
            const productQuantitiesToDecrement = new Map<string, number>();

            finalSaleData.items.forEach(saleItem => {
                const product = products.find(p => p.id === saleItem.productId);
                if (product?.isBundle && product.bundleItems) {
                    product.bundleItems.forEach(bundleItem => {
                        const currentQty = productQuantitiesToDecrement.get(bundleItem.productId) || 0;
                        productQuantitiesToDecrement.set(bundleItem.productId, currentQty + (bundleItem.quantity * saleItem.quantity));
                    });
                } else {
                    const currentQty = productQuantitiesToDecrement.get(saleItem.productId) || 0;
                    productQuantitiesToDecrement.set(saleItem.productId, currentQty + saleItem.quantity);
                }
            });

            if (productQuantitiesToDecrement.size > 0) {
                const productIds = Array.from(productQuantitiesToDecrement.keys());
                const inventoryQuery = query(inventoryCollectionRef, where("productId", "in", productIds));
                const inventorySnapshot = await getDocs(inventoryQuery);
                const inventoryMap = new Map(inventorySnapshot.docs.map(doc => [doc.data().productId, doc]));

                for (const [productId, quantityToDecrement] of productQuantitiesToDecrement.entries()) {
                    const inventoryDoc = inventoryMap.get(productId);
                    if (inventoryDoc) {
                        const newQuantity = inventoryDoc.data().quantity - quantityToDecrement;
                        batch.update(inventoryDoc.ref, { quantity: newQuantity });
                    }
                }
            }

            // Update original quotation status
            if (editingQuotation) {
                const quotationRef = doc(firestore, 'stores', STORE_ID, 'quotations', editingQuotation.id);
                batch.update(quotationRef, { status: 'Converted', convertedToId: `sale_${finalSaleData.id}` });
            }

            await batch.commit();

            toast({
                title: "Success!",
                description: `Sale #${finalSaleData.invoiceSequence} created from quotation.`
            });
            setIsSaleDialogOpen(false);
            setSaleFromQuotation(undefined);
            setEditingQuotation(undefined);

        } catch (error) {
            console.error("Failed to process sale from quotation:", error);
            toast({
                title: "Sale Creation Failed",
                description: "There was an error creating the sale. Please try again.",
                variant: "destructive"
            });
        }
    };


    const handleExport = () => {
        if (!quotations) return;
         const dataToExport = quotations.flatMap(q => 
            q.items.map(item => ({
                'Quotation Number': q.quotationNumber,
                'Customer': q.customerName,
                'Date': format(new Date(q.date), 'yyyy-MM-dd'),
                'Status': q.status,
                'Product Name': item.productName,
                'Quantity': item.quantity,
                'Unit Price': item.unitPrice,
                'Total Price': item.totalPrice,
            }))
        );
        exportToExcel(dataToExport, 'quotations_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { customerEmail: "sample@example.com", productName: "Sample Bat", quantity: 2, unitPrice: 5000 },
        ];
        const validations = {
             customerEmail: customers?.map(c => c.email || '') || [],
             productName: products?.map(p => p.name) || [],
        };
        exportWithDataValidation(sampleData, 'Quotations', validations, 'quotations_import_sample');
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

     const handleBulkAction = (action: 'share', selectedQuotations: Quotation[]) => {
        if (!companyDetails) return;
        if (action === 'share') {
            const message = selectedQuotations.map(q => {
                return generateShareText('Quotation', q.quotationNumber, q.customerName, companyDetails.name, `${window.location.origin}/quotation/${q.id}`);
            }).join('\n\n');
            openShareDialog({title: 'Your Quotations', text: message});
        }
    };


    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!firestore || !customers || !products || !companyDetails) return;
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
                const newQuotations: Quotation[] = [];

                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const rowNum = i + 2;

                    const customer = customers.find(c => c.email === item.customerEmail);
                    const product = products.find(p => p.name === item.productName);

                    if (!customer) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: Customer with email '${item.customerEmail}' not found.`, variant: "destructive" });
                        return;
                    }
                     if (!product) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: Product with name '${item.productName}' not found.`, variant: "destructive" });
                        return;
                    }

                    const quantity = Number(item.quantity) || 1;
                    const unitPrice = Number(item.unitPrice) || product.sellingPrice;
                    const totalPrice = quantity * unitPrice;
                    
                    const quotationDocRef = doc(collection(firestore, 'stores', STORE_ID, 'quotations'));
                    const newQuotation: Quotation = {
                        id: quotationDocRef.id,
                        storeId: STORE_ID,
                        quotationNumber: `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-5) + i}`,
                        date: new Date().toISOString(),
                        validUntil: addDays(new Date(), 30).toISOString(),
                        deliveryDate: addDays(new Date(), 7).toISOString(),
                        customerId: customer.id,
                        customerName: customer.name,
                        billingAddress: customer.addresses.find(a => a.isPrimary)!,
                        items: [{
                            productId: product.id,
                            productName: product.name,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            totalPrice: totalPrice,
                            hsnCode: product.hsnCode,
                            gstRate: product.gstRate,
                        }],
                        subTotal: totalPrice,
                        gstAmount: totalPrice * (product.gstRate / 100),
                        totalAmount: totalPrice + (totalPrice * (product.gstRate / 100)),
                        termsAndConditions: companyDetails.invoiceTerms || '',
                        status: 'Draft',
                    };
                    batch.set(quotationDocRef, newQuotation);
                }
                
                await batch.commit();

                toast({
                    title: "Import Successful!",
                    description: `${json.length} quotations imported.`,
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
        const totalCount = quotations.length;
        const pendingCount = quotations.filter(q => q.status === 'Sent' || q.status === 'Draft').length;
        const convertedCount = quotations.filter(q => q.status === 'Converted').length;
        const conversionRate = totalCount > 0 ? (convertedCount / totalCount) * 100 : 0;
        return [
            { title: "Total Quotations", value: totalCount.toString(), icon: FileText },
            { title: "Pending Quotations", value: pendingCount.toString(), icon: Clock },
            { title: "Converted to Sales", value: convertedCount.toString(), icon: CheckCircle },
            { title: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: Percent },
        ];
    }, [quotations]);
    
    const chartData = useMemo(() => {
        const statusCounts = quotations.reduce((acc, q) => {
            acc[q.status] = (acc[q.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([name, total]) => ({ name, total }));
    }, [quotations]);
    
    const chartConfig: ChartConfig = {
        total: { label: 'Quotations', color: 'hsl(var(--chart-1))' },
    };

    return (
        <>
            <PageHeader title="Quotations">
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
                <Button onClick={handleCreateQuotation}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Quotation
                </Button>
            </PageHeader>
            <div className="flex flex-col gap-8">
                <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
                <PageSummary cards={summaryData} />
                <QuotationDialog 
                    open={isQuotationDialogOpen} 
                    onOpenChange={setIsQuotationDialogOpen} 
                    quotation={editingQuotation}
                    onSuccess={handleSuccess}
                    onConvertToSale={handleConvertToSale}
                />
                <SaleDialog
                    open={isSaleDialogOpen}
                    onOpenChange={setIsSaleDialogOpen}
                    onSuccess={handleSaleSuccess}
                    sale={saleFromQuotation}
                />
                <Card>
                    <CardHeader>
                        <CardTitle>All Quotations</CardTitle>
                        <CardDescription>
                            Manage and track all your quotations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable 
                            columns={columns({ 
                                onDelete: handleDeleteQuotation, 
                                onEdit: handleEditQuotation, 
                                customers: safeCustomers,
                                users: safeUsers,
                                onShare: (quotation) => {
                                    if (!companyDetails) return;
                                    const text = generateShareText('Quotation', quotation.quotationNumber, quotation.customerName, companyDetails.name, `${window.location.origin}/quotation/${quotation.id}`);
                                    openShareDialog({title: `Quotation #${quotation.quotationNumber}`, text});
                                }
                            })} 
                            data={quotations}
                            onBulkAction={(action, selectedRows) => handleBulkAction(action as 'share', selectedRows)}
                        />
                    </CardContent>
                </Card>
                 <GenericChart 
                    title="Quotation Status Overview"
                    description="A summary of your quotations by status."
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
