"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Sale, Product, Customer, Company, User } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, FileDown, Mail, Printer, Share, User as UserIcon, Banknote } from "lucide-react"
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
import { generateInvoiceEmailBody } from "@/lib/actions"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { downloadInvoice } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'paid': 'default',
    'pending': 'destructive',
    'cancelled': 'secondary',
}

interface ActionsCellProps {
    sale: Sale;
    products: Product[];
    customers: Customer[];
    onDelete: (saleId: string) => void;
    onEdit: (sale: Sale) => void;
    onShare?: (sale: Sale) => void;
    onRecordPayment?: (sale: Sale) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ sale, products, customers, onDelete, onEdit, onShare, onRecordPayment }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const handleDelete = () => {
        onDelete(sale.id);
        setIsDeleteDialogOpen(false);
    }

    const handleEmail = () => {
        if (!companyDetails) return;
        const subject = `Invoice #${sale.invoiceSequence} from ${companyDetails.name}`;
        const body = generateInvoiceEmailBody(sale, companyDetails);
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    
    const handlePrint = () => {
        window.open(`/invoice/${sale.id}`, '_blank');
    }
    
    const handleDownloadPdf = () => {
        if (!companyDetails) return;
        downloadInvoice(sale, customers, companyDetails);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`Invoice #${sale.invoiceSequence}`}
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
                    <DropdownMenuItem asChild>
                        <Link href={`/customer/${sale.customerId}`} target="_blank">
                            <UserIcon className="mr-2 h-4 w-4" />
                            View Customer Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(sale)}>
                         <Pencil className="mr-2 h-4 w-4" />
                        Edit Sale
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRecordPayment?.(sale)} disabled={sale.status === 'paid'}>
                        <Banknote className="mr-2 h-4 w-4" />
                        Record Payment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => onShare?.(sale)} disabled={!onShare}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleEmail}>
                        <Mail className="mr-2 h-4 w-4" />
                        Email Invoice
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        View / Print TAX Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                        Delete Sale
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

export const salesColumns = (options: {onDelete: (saleId: string) => void, onEdit: (sale: Sale) => void, products: Product[], customers: Customer[], users?: User[], onShare?: (sale: Sale) => void, onRecordPayment?: (sale: Sale) => void}): ColumnDef<Sale>[] => [
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
    accessorKey: "invoiceSequence",
    header: "TAX Invoice #",
    cell: ({ row }) => {
        return (
             <Link
                href={`/invoice/${row.original.id}`}
                target="_blank"
                className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
            >
                #{row.getValue("invoiceSequence")}
            </Link>
        )
    }
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => <span className="font-medium">{row.getValue("customerName")}</span>
  },
  {
    accessorKey: "saleDate",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("saleDate") as string;
      return <FormattedDateCell date={date} />;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={statusVariant[status] ?? 'outline'} className="capitalize">{status}</Badge>
    }
  },
  {
    accessorKey: "total",
    header: "Total",
     cell: ({ row }) => <FormattedNumberCell value={row.original.total} />,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell sale={row.original} products={options.products} customers={options.customers} onDelete={options.onDelete} onEdit={options.onEdit} onShare={options.onShare} onRecordPayment={options.onRecordPayment} />,
  },
]