'use client'

import { ColumnDef } from "@tanstack/react-table"
import { PurchaseOrder, Vendor, Company, User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Mail, Printer, FileDown, Trash2, Edit, Truck, CheckCircle2, Share } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { generatePurchaseOrderEmailBody, downloadPurchaseOrder } from "@/lib/actions"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Received': 'default',
    'Shipped': 'secondary',
    'Partially Received': 'secondary',
    'Pending': 'outline',
    'Cancelled': 'destructive'
}

const paymentStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Paid': 'default',
    'Unpaid': 'destructive',
    'Partially Paid': 'secondary',
}

interface ActionsCellProps {
    purchaseOrder: PurchaseOrder;
    vendors: Vendor[];
    onDelete: (purchaseOrderId: string) => void;
    onReceiveStock: (purchaseOrder: PurchaseOrder) => void;
    onMarkAsFullyReceived: (purchaseOrder: PurchaseOrder) => void;
    onUpdateShippingStatus: (poId: string, status: 'Pending' | 'Shipped' | 'Cancelled') => void;
    onShare: (purchaseOrder: PurchaseOrder) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ purchaseOrder, vendors, onDelete, onReceiveStock, onMarkAsFullyReceived, onUpdateShippingStatus, onShare }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const isReceived = purchaseOrder.status === 'Received';
    const isCancelled = purchaseOrder.status === 'Cancelled';

    const handleDelete = () => {
        onDelete(purchaseOrder.id);
        setIsDeleteDialogOpen(false);
    }
    
    const handleEmail = () => {
        if (!companyDetails) return;
        const subject = `Purchase Order #${purchaseOrder.purchaseOrderNumber} from ${companyDetails.name}`;
        const body = generatePurchaseOrderEmailBody(purchaseOrder, companyDetails);
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    const handlePrint = () => {
        window.open(`/purchase-order/${purchaseOrder.id}`, '_blank');
    }

    const handleDownloadPdf = () => {
        if (!companyDetails) return;
        downloadPurchaseOrder(purchaseOrder, vendors, companyDetails);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`PO #${purchaseOrder.purchaseOrderNumber}`}
            />
            <div className="flex items-center justify-end">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={handleDownloadPdf}>
                                <FileDown className="h-4 w-4" />
                                <span className="sr-only">Download PDF</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Download PDF</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={isReceived || isCancelled}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Update Status</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onUpdateShippingStatus(purchaseOrder.id, 'Pending')}>Pending</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onUpdateShippingStatus(purchaseOrder.id, 'Shipped')}>Shipped</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onUpdateShippingStatus(purchaseOrder.id, 'Cancelled')} className="text-destructive">Cancel PO</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onReceiveStock(purchaseOrder)} disabled={isReceived || isCancelled}>
                            <Truck className="mr-2 h-4 w-4" />
                            Receive Partial Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMarkAsFullyReceived(purchaseOrder)} disabled={isReceived || isCancelled}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Fully Received
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => onShare(purchaseOrder)}>
                            <Share className="mr-2 h-4 w-4" />
                            Share
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={handleEmail}>
                            <Mail className="mr-2 h-4 w-4" />
                            Email PO
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                             <Trash2 className="mr-2 h-4 w-4" />
                            Delete PO
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
}

export const columns = (options: {
    vendors: Vendor[];
    users: User[];
    onDelete: (poId: string) => void, 
    onReceiveStock: (po: PurchaseOrder) => void, 
    onMarkAsFullyReceived: (po: PurchaseOrder) => void,
    onUpdateShippingStatus: (poId: string, status: 'Pending' | 'Shipped' | 'Cancelled') => void,
    onShare: (po: PurchaseOrder) => void;
}): ColumnDef<PurchaseOrder>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "purchaseOrderNumber",
    header: "PO Number",
    cell: ({ row }) => {
      const po = row.original;
      return (
        <div>
            <Link
                href={`/purchase-order/${po.id}`}
                className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-medium justify-start text-left whitespace-normal")}
            >
                {po.purchaseOrderNumber}
            </Link>
            {po.comments && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-1">{po.comments}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{po.comments}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
      )
    }
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("orderDate")} />
  },
  {
    accessorKey: "expectedDeliveryDate",
    header: "Expected Delivery",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("expectedDeliveryDate")} />
  },
  {
    accessorKey: "vendorName",
    header: "Vendor",
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ row }) => {
        const userId = row.original.createdBy;
        if (!userId) return 'N/A';
        const user = options.users.find(u => u.id === userId);
        return user ? user.displayName : 'Unknown User';
    }
  },
  {
    accessorKey: "status",
    header: "Delivery Status",
     cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={statusVariant[status] ?? 'outline'}>{status}</Badge>
    }
  },
  {
    id: "fulfillment",
    header: "Fulfillment",
    cell: ({ row }) => {
        const po = row.original;
        const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalReceived = po.items.reduce((sum, item) => sum + (item.quantityReceived || 0), 0);
        const pending = totalOrdered - totalReceived;
        const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

        return (
            <div className="flex flex-col gap-1 min-w-[120px]">
                <div className="flex justify-between text-xs">
                    <span className="font-medium">{`${totalReceived} / ${totalOrdered}`}</span>
                     {pending > 0 && <span className="text-muted-foreground">({pending} left)</span>}
                </div>
                <Progress value={progress} className="h-2" />
            </div>
        )
    }
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment Status",
     cell: ({ row }) => {
      const status = row.getValue("paymentStatus") as string;
      return <Badge variant={paymentStatusVariant[status] ?? 'outline'}>{status}</Badge>
    }
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
     cell: ({ row }) => <FormattedNumberCell value={row.original.totalAmount} />,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell purchaseOrder={row.original} vendors={options.vendors} onDelete={options.onDelete} onReceiveStock: onReceiveStock, onMarkAsFullyReceived: onMarkAsFullyReceived, onUpdateShippingStatus: onUpdateShippingStatus, onShare: options.onShare })} />
  },
]
