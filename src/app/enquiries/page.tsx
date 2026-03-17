

'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, HelpCircle, CheckCircle, Clock, XCircle, PhoneForwarded, MinusCircle, Upload, Download, FileText, ShoppingBag, Share } from 'lucide-react';
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
import { Enquiry, Customer, User, Company } from '@/lib/types';
import { EnquiryDialog } from './enquiry-dialog';
import { toast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { PageSummary, SummaryCardData } from '@/components/dashboard/page-summary';
import { GenericChart } from '@/components/dashboard/generic-chart';
import { ChartConfig } from '@/components/ui/chart';
import { exportToExcel, exportWithDataValidation, generateShareText } from '@/lib/actions';
import * as XLSX from 'xlsx';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShareDialog } from '@/hooks/use-share-dialog';
import { ShareDialog } from '@/components/share-dialog';

const STORE_ID = 'store_main';

export default function EnquiriesPage() {
    const firestore = useFirestore();
    const { currentUser } = useCurrentUser();
    const { isShareDialogOpen, shareDialogData, openShareDialog, closeShareDialog } = useShareDialog();

    const enquiriesCollectionRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'enquiries'), orderBy('date', 'desc')) : null, [firestore]);
    const { data: enquiriesData, isLoading: areEnquiriesLoading } = useCollection<Enquiry>(enquiriesCollectionRef);
    
    const customersCollectionRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'customers'), orderBy('name')) : null, [firestore]);
    const { data: customers } = useCollection<Customer>(customersCollectionRef);
    
    const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: usersData } = useCollection<User>(usersRef);

    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const [isEnquiryDialogOpen, setIsEnquiryDialogOpen] = useState(false);
    const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | undefined>();
    const fileInputRef = React.useRef<HTMLInputElement>(null);


    const safeEnquiries = enquiriesData || [];
    const safeCustomers = customers || [];
    const safeUsers = usersData || [];

    const enquiries = useMemo(() => {
        return safeEnquiries.map(e => ({
            ...e,
            customerName: safeCustomers.find(c => c.id === e.customerId)?.name || 'Unknown',
            createdByName: safeUsers.find(u => u.id === e.createdBy)?.displayName || 'Unknown User'
        }));
    }, [safeEnquiries, safeCustomers, safeUsers]);

    const handleAdd = () => {
        setEditingEnquiry(undefined);
        setIsEnquiryDialogOpen(true);
    };

    const handleEdit = (enquiry: Enquiry) => {
        setEditingEnquiry(enquiry);
        setIsEnquiryDialogOpen(true);
    };

    const handleDelete = async (enquiryId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'stores', STORE_ID, 'enquiries', enquiryId));
            toast({ title: "Success!", description: "Enquiry deleted successfully." });
        } catch (error) {
            console.error("Error deleting enquiry:", error);
            toast({ title: "Error", description: "Could not delete enquiry.", variant: "destructive" });
        }
    };
    
    const handleDeleteSelected = async (enquiriesToDelete: Enquiry[]) => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        enquiriesToDelete.forEach(enquiry => {
            const docRef = doc(firestore, 'stores', STORE_ID, 'enquiries', enquiry.id);
            batch.delete(docRef);
        });
        try {
            await batch.commit();
            toast({ title: "Success!", description: `${enquiriesToDelete.length} enquiries deleted.` });
        } catch (error) {
            console.error("Error deleting enquiries:", error);
            toast({ title: "Error", description: "Could not delete selected enquiries.", variant: "destructive" });
        }
    }
    
    const handleBulkAction = (action: 'share', selectedEnquiries: Enquiry[]) => {
        if (!companyDetails) return;
        if (action === 'share') {
             const message = selectedEnquiries.map(e => {
                return `Enquiry from ${e.customerName} regarding "${e.enquiry}". Status: ${e.status}.`;
            }).join('\n\n');
            openShareDialog({title: 'Share Enquiries', text: message});
        }
    };

    const handleSuccess = async (enquiry: Enquiry) => {
        if (!firestore) return;
        const isEditing = !!editingEnquiry;
        const message = isEditing ? "Enquiry updated successfully." : "Enquiry created successfully.";
        
        try {
            const enquiryToSave: Enquiry = {...enquiry};
            if (enquiryToSave.followUps && enquiryToSave.followUps.length > 0) {
              enquiryToSave.latestFollowUp = [...enquiryToSave.followUps].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            } else {
              delete enquiryToSave.latestFollowUp;
            }

            const enquiryDocRef = doc(firestore, 'stores', STORE_ID, 'enquiries', enquiryToSave.id);
            await setDoc(enquiryDocRef, enquiryToSave, { merge: true });

            setIsEnquiryDialogOpen(false);
            setEditingEnquiry(undefined);
            toast({ title: "Success!", description: message });
        } catch (error) {
            console.error("Error saving enquiry:", error);
            toast({ title: "Error", description: "Could not save enquiry.", variant: "destructive" });
        }
    }
    
    const handleExport = () => {
        if (!enquiries) return;
        const dataToExport = enquiries.map(e => ({
            date: e.date,
            customerName: e.customerName,
            enquiry: e.enquiry,
            status: e.status,
            followUps: e.followUps?.length || 0,
            createdBy: e.createdByName
        }));
        exportToExcel(dataToExport, 'enquiries_export');
    };

    const handleDownloadSample = () => {
        const sampleData = [
         { customerEmail: "sample@example.com", enquiry: "Interested in bulk purchase of cricket balls." },
        ];
        const validations = {
             customerEmail: customers?.map(c => c.email || '') || [],
        };
        exportWithDataValidation(sampleData, 'Enquiries', validations, 'enquiries_import_sample');
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

                const batch = writeBatch(firestore);

                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const rowNum = i + 2;

                    const customer = customers.find(c => c.email === item.customerEmail);

                    if (!customer) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: Customer with email '${item.customerEmail}' not found.`, variant: "destructive" });
                        return;
                    }
                     if (!item.enquiry) {
                        toast({ title: "Import Failed", description: `Row ${rowNum}: 'enquiry' is required.`, variant: "destructive" });
                        return;
                    }
                    
                    const enquiryDocRef = doc(collection(firestore, 'stores', STORE_ID, 'enquiries'));
                    const newEnquiry: Omit<Enquiry, 'id'> = {
                        storeId: STORE_ID,
                        date: new Date().toISOString(),
                        customerId: customer.id,
                        enquiry: item.enquiry,
                        status: 'New',
                        followUps: []
                    };
                    batch.set(enquiryDocRef, { ...newEnquiry, id: enquiryDocRef.id });
                }
                
                await batch.commit();

                toast({
                    title: "Import Successful!",
                    description: `${json.length} enquiries imported.`,
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
        const totalCount = enquiries.length;
        const convertedCount = enquiries.filter(e => e.status === 'Converted').length;
        const pendingCount = enquiries.filter(e => e.status === 'New' || e.status === 'Follow-up').length;
        const rejectedCount = enquiries.filter(e => e.status === 'Rejected').length;
        const notInterestedCount = enquiries.filter(e => e.status === 'Not Interested').length;
        const scheduledCount = enquiries.filter(e => e.status === 'Scheduled Callback').length;

        return [
            { title: "Total Enquiries", value: totalCount.toString(), icon: HelpCircle },
            { title: "Converted", value: convertedCount.toString(), icon: CheckCircle },
            { title: "Pending", value: pendingCount.toString(), icon: Clock },
            { title: "Scheduled Call", value: scheduledCount.toString(), icon: PhoneForwarded },
            { title: "Rejected", value: rejectedCount.toString(), icon: XCircle },
            { title: "Not Interested", value: notInterestedCount.toString(), icon: MinusCircle },
        ];
    }, [enquiries]);

    const statusChartData = useMemo(() => {
        const statusCounts = enquiries.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([name, total]) => ({ name, total }));
    }, [enquiries]);

    const productChartData = useMemo(() => {
        const productCounts = new Map<string, { name: string, count: number }>();
        enquiries.forEach(enquiry => {
            enquiry.items?.forEach(item => {
                if (productCounts.has(item.productId)) {
                    productCounts.get(item.productId)!.count++;
                } else {
                    productCounts.set(item.productId, { name: item.productName, count: 1 });
                }
            });
        });
        return Array.from(productCounts.values()).sort((a,b) => b.count - a.count).slice(0, 10);
    }, [enquiries]);

    const statusChartConfig: ChartConfig = {
        total: { label: 'Enquiries' },
        New: { color: 'hsl(var(--chart-2))' },
        'Follow-up': { color: 'hsl(var(--chart-3))' },
        Converted: { color: 'hsl(var(--chart-1))' },
        Rejected: { color: 'hsl(var(--chart-5))' },
        'Not Interested': { color: 'hsl(var(--chart-4))' },
        'Scheduled Callback': { color: 'hsl(var(--chart-6))' },
        'Will Decide Later': { color: 'hsl(var(--chart-7))' },
    };

    const productChartConfig: ChartConfig = {
        count: { label: 'Enquiry Count', color: 'hsl(var(--chart-1))' },
    };


  return (
    <>
      <PageHeader title="Enquiry Management">
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
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Enquiry
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <ShareDialog open={isShareDialogOpen} onOpenChange={closeShareDialog} shareData={shareDialogData} />
        <PageSummary cards={summaryData} />
        <EnquiryDialog
            open={isEnquiryDialogOpen}
            onOpenChange={setIsEnquiryDialogOpen}
            enquiry={editingEnquiry}
            onSuccess={handleSuccess}
        />
        <Card>
          <CardHeader>
            <CardTitle>All Enquiries</CardTitle>
            <CardDescription>
              Track and manage all your customer enquiries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable 
                columns={columns({onEdit: handleEdit, onDelete: handleDelete})} 
                data={enquiries}
                onBulkAction={(action, selectedRows) => handleBulkAction(action as 'share', selectedRows)}
                onDeleteSelected={handleDeleteSelected}
            />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GenericChart 
                title="Enquiry Status Overview"
                description="A breakdown of enquiries by their current status."
                data={statusChartData}
                dataKeyX="name"
                dataKeysY={['total']}
                chartConfig={statusChartConfig}
                categorical
            />
            <GenericChart 
                title="Top 10 Enquired Products"
                description="Products most frequently included in customer enquiries."
                data={productChartData}
                dataKeyX="name"
                dataKeysY={['count']}
                chartConfig={productChartConfig}
            />
        </div>
      </div>
    </>
  );
}
