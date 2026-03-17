"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SaleReturn, Customer, Store } from "@/lib/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { MoreHorizontal, Printer, FileDown, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { generateReturnSlipEmailBody, downloadReturnSlip } from "@/lib/actions"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Company } from "@/lib/types"

interface ActionsCellProps {
    saleReturn: SaleReturn & { storeName?: string };
    customers: Customer[];
    stores: Store[];
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ saleReturn, customers, stores }: ActionsCellProps) => {
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const handleEmail = () => {
        const customer = customers.find(c => c.id === saleReturn.customerId);
        if (!customer || !companyDetails) return;
        const subject = `Return Confirmation for Slip #${saleReturn.returnSequence} from ${companyDetails.name}`;
        const body = generateReturnSlipEmailBody(saleReturn, companyDetails);
        window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    const handlePrint = () => {
        window.open(`/return-slip/${saleReturn.id}`, '_blank');
    }
    
    const handleDownloadPdf = () => {
        if (!companyDetails) return;
        downloadReturnSlip(saleReturn, customers, stores, companyDetails);
    }


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Slip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email Slip
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export const returnColumns = (options: { customers: Customer[], stores: Store[] }): ColumnDef<any>[] => [
  {
    accessorKey: "returnDate",
    header: "Return Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("returnDate")} />,
  },
  {
    accessorKey: "returnSequence",
    header: "Return Slip #",
    cell: ({ row }) => (
      <Link
        href={`/return-slip/${row.original.id}`}
        target="_blank"
        className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
      >
        {row.getValue("returnSequence")}
      </Link>
    ),
  },
  {
    accessorKey: "originalInvoiceSequence",
    header: "Original Invoice #",
    cell: ({ row }) => (
      <Link
        href={`/invoice/${row.original.originalSaleId}`}
        target="_blank"
        className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
      >
        #{row.getValue("originalInvoiceSequence")}
      </Link>
    )
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
   {
    accessorKey: "storeName",
    header: "Store",
  },
  {
    header: "Items Returned",
    cell: ({ row }) => row.original.items.reduce((sum: number, item: any) => sum + item.sellableQuantity + item.unsellableQuantity, 0)
  },
  {
    accessorKey: "totalRefundAmount",
    header: "Refund Amount",
    cell: ({ row }) => <FormattedNumberCell value={row.original.totalRefundAmount} />,
  },
  {
      id: "reason",
      header: "Reason",
      cell: ({ row }) => {
          const reasons = row.original.items
            .map((item: any) => item.reason)
            .filter(Boolean)
            .join(', ');
          return <span className="truncate">{reasons || 'N/A'}</span>;
      }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell saleReturn={row.original} customers={options.customers} stores={options.stores} />,
  },
]