

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Quotation, Product, Customer, Company, User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, FileDown, Mail, Printer, Share } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { downloadQuotation, generateQuotationEmailBody } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Sent': 'default',
    'Draft': 'secondary',
    'Converted': 'outline',
    'Expired': 'destructive'
}

interface ActionsCellProps {
    quotation: Quotation;
    customers: Customer[];
    onDelete: (quotationId: string) => void;
    onEdit: (quotation: Quotation) => void;
    onShare: (quotation: Quotation) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ quotation, customers, onDelete, onEdit, onShare }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const handleDelete = () => {
        onDelete(quotation.id);
        setIsDeleteDialogOpen(false);
    }

    const handleEmail = () => {
        if (!companyDetails) return;
        const subject = `Quotation #${quotation.quotationNumber} from ${companyDetails.name}`;
        const body = generateQuotationEmailBody(quotation, companyDetails);
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    
    const handlePrint = () => {
        window.open(`/quotation/${quotation.id}`, '_blank');
    }
    
    const handleDownloadPdf = () => {
        if (!companyDetails) return;
        downloadQuotation(quotation, customers, companyDetails);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`Quotation #${quotation.quotationNumber}`}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(quotation)}>
                         <Pencil className="mr-2 h-4 w-4" />
                        Edit / View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onShare(quotation)}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleEmail}>
                        <Mail className="mr-2 h-4 w-4" />
                        Email Quotation
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                        Delete Quotation
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

export const columns = (options: {onDelete: (quotationId: string) => void, onEdit: (quotation: Quotation) => void, customers: Customer[], users: User[], onShare: (quotation: Quotation) => void}): ColumnDef<Quotation>[] => [
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
    accessorKey: "quotationNumber",
    header: "Quotation #",
    cell: ({ row }) => {
        return (
             <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => options.onEdit(row.original)}
            >
                {row.getValue("quotationNumber")}
            </Button>
        )
    }
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("date") as string;
      return <FormattedDateCell date={date} />;
    },
  },
   {
    accessorKey: "validUntil",
    header: "Valid Until",
    cell: ({ row }) => {
      const date = row.getValue("validUntil") as string;
      return <FormattedDateCell date={date} />;
    },
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
    accessorKey: "latestFollowUp.notes",
    header: "Latest Follow-up",
    enableSorting: false,
    cell: ({row}) => {
        const latest = row.original.latestFollowUp;
        if (!latest) return <span className="text-muted-foreground">No follow-ups</span>;
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <p className="truncate max-w-xs">{latest.notes}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{latest.notes}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={statusVariant[status] ?? 'outline'}>{status}</Badge>
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
    cell: ({ row }) => <ActionsCell quotation={row.original} customers={options.customers} onDelete={options.onDelete} onEdit={options.onEdit} onShare={options.onShare} />,
  },
]
