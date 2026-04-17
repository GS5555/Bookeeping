"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Sale, Expense, InventoryItem, PurchaseOrder, SaleReturn, StockTransfer, Customer, Store, Vendor, PriceHistoryEntry, Quotation, Enquiry } from "@/lib/types"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal, Mail, Printer, FileDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { downloadReturnSlip } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"

const FormattedDateCell = ({ date }: { date?: string | Date}) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || !date) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}


export const salesReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "invoiceSequence",
    header: "Invoice #",
    cell: ({ row }) => (
        <Link 
            href={`/invoice/${row.original.id}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
        >
            #{row.getValue("invoiceSequence")}
        </Link>
    )
  },
  {
    accessorKey: "saleDate",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.original.saleDate} />
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
        <Link 
            href={`/customer/${row.original.customerId}`}
            target="_blank"
            className="hover:underline text-primary"
        >
            {row.getValue("customerName")}
        </Link>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge className="uppercase text-[9px]">{row.original.status}</Badge>
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => <FormattedNumberCell value={row.original.total} />,
  },
  {
    accessorKey: "amountPaid",
    header: "Paid",
    cell: ({ row }) => <FormattedNumberCell value={row.original.amountPaid || 0} />,
  },
  {
    accessorKey: "balanceAmount",
    header: "Due",
    cell: ({ row }) => {
        const balance = row.original.balanceAmount || 0;
        return <FormattedNumberCell value={balance} className={cn(balance > 0 && "text-destructive font-black")} />
    },
  },
  {
    id: "tracking",
    header: "Payment Tracking",
    cell: ({ row }) => {
        const history = row.original.paymentHistory;
        if (!history || history.length === 0) return <span className="text-muted-foreground italic">No payments</span>;
        const last = history[history.length - 1];
        return (
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold">Last: {new Date(last.date).toLocaleDateString('en-IN')}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">Updated: {new Date(last.updatedAt).toLocaleDateString('en-IN')} via {last.method}</span>
            </div>
        )
    }
  },
]

export const gstReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "invoiceSequence",
    header: "Invoice #",
    cell: ({ row }) => (
        <Link 
            href={`/invoice/${row.original.id}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
        >
            #{row.getValue("invoiceSequence")}
        </Link>
    )
  },
  {
    accessorKey: "saleDate",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.original.saleDate} />
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "subTotal",
    header: "Subtotal",
    cell: ({ row }) => <FormattedNumberCell value={row.original.subTotal} />,
  },
  {
    accessorKey: "cgstAmount",
    header: "CGST",
    cell: ({ row }) => <FormattedNumberCell value={row.original.cgstAmount} />,
  },
  {
    accessorKey: "sgstAmount",
    header: "SGST",
    cell: ({ row }) => <FormattedNumberCell value={row.original.sgstAmount} />,
  },
  {
    accessorKey: "igstAmount",
    header: "IGST",
    cell: ({ row }) => <FormattedNumberCell value={row.original.igstAmount} />,
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => <FormattedNumberCell value={row.original.total} />,
  },
]

const ReturnActionsCell = ({ saleReturn, customers, stores, companyDetails }: { saleReturn: SaleReturn, customers: Customer[], stores: Store[], companyDetails: Company | null }) => {
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
                <DropdownMenuItem onClick={() => window.open(`/return-slip/${saleReturn.id}`, '_blank')}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Slip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => companyDetails && downloadReturnSlip(saleReturn, customers, stores, companyDetails)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const returnsReportColumns = (options: { customers: Customer[], stores: Store[], companyDetails: Company | null }): ColumnDef<any>[] => [
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
    cell: ({ row }) => <ReturnActionsCell saleReturn={row.original} customers={options.customers} stores={options.stores} companyDetails={options.companyDetails} />,
  }
]


export const expensesReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("date")} />
  },
  {
    accessorKey: "companyName",
    header: "Company",
  },
  {
    accessorKey: "expenseType",
    header: "Type",
    cell: ({ row }) => row.original.expenseType || 'N/A'
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
    cell: ({row}) => row.original.vendor || 'N/A'
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <FormattedNumberCell value={row.original.amount} />,
  },
]

export const inventoryReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Product",
  },
  {
    accessorKey: "sku",
    header: "SKU",
  },
  {
    accessorKey: "storeName",
    header: "Store",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "sellingPrice",
    header: "Price (Unit)",
    cell: ({ row }) => <FormattedNumberCell value={row.original.sellingPrice} />,
  },
  {
    id: 'totalValue',
    header: "Total Value",
    cell: ({ row }) => {
        const total = row.original.quantity * row.original.sellingPrice;
        return <FormattedNumberCell value={total} />
    }
  },
]

export const purchaseReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "purchaseOrderNumber",
    header: "PO #",
     cell: ({ row }) => {
        const po = row.original;
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Link
                            href={`/purchase-order/${po.id}`}
                            target="_blank"
                            className={cn(buttonVariants({ variant: 'link' }), "p-0 h-auto font-normal")}
                        >
                            {po.purchaseOrderNumber}
                        </Link>
                    </TooltipTrigger>
                     {po.comments && (
                        <TooltipContent>
                            <p>{po.comments}</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        )
     }
  },
  {
    accessorKey: "orderDate",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.original.orderDate} />
  },
  {
    accessorKey: "vendorName",
    header: "Vendor",
  },
  {
    accessorKey: "deliveryStoreName",
    header: "Delivery Store",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => <FormattedNumberCell value={row.original.totalAmount} />,
  },
  {
    accessorKey: "amountPaid",
    header: "Amount Paid",
    cell: ({ row }) => <FormattedNumberCell value={row.original.amountPaid || 0} />,
  },
  {
    accessorKey: "balanceAmount",
    header: "Balance",
    cell: ({ row }) => {
        const balance = row.original.balanceAmount || 0;
        return <FormattedNumberCell value={balance} className={cn(balance > 0 && "text-destructive")} />
    },
  },
]

export const stockTransferColumns: ColumnDef<any>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("date")} />,
  },
  {
    accessorKey: "productName",
    header: "Product",
  },
  {
    accessorKey: "fromStoreName",
    header: "From Store",
  },
  {
    accessorKey: "toStoreName",
    header: "To Store",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => `${row.original.quantity} units`,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => <span className="truncate">{row.original.notes || 'N/A'}</span>,
  },
]

export const priceHistoryReportColumns: ColumnDef<(PriceHistoryEntry & { productName: string; sku: string; })>[] = [
    {
        accessorKey: "date",
        header: "Date Changed",
        cell: ({ row }) => <FormattedDateCell date={row.original.date} />,
    },
    {
        accessorKey: "productName",
        header: "Product Name",
    },
    {
        accessorKey: "sku",
        header: "SKU",
    },
    {
        accessorKey: "purchasePrice",
        header: "Purchase Price",
        cell: ({ row }) => <FormattedNumberCell value={row.original.purchasePrice} />,
    },
    {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        cell: ({ row }) => <FormattedNumberCell value={row.original.sellingPrice} />,
    },
];

export const quotationsReportColumns: ColumnDef<any>[] = [
  {
    accessorKey: "quotationNumber",
    header: "Quotation #",
    cell: ({ row }) => (
      <Link
        href={`/quotation/${row.original.id}`}
        target="_blank"
        className={cn(buttonVariants({ variant: 'link' }), 'p-0 h-auto font-normal')}
      >
        {row.getValue("quotationNumber")}
      </Link>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.original.date} />,
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    header: "Items",
    cell: ({ row }) => row.original.items.length,
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => <FormattedNumberCell value={row.original.totalAmount} />,
  },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'New': 'secondary',
    'Follow-up': 'default',
    'Converted': 'outline',
    'Rejected': 'destructive',
    'Not Interested': 'destructive',
    'Scheduled Callback': 'default',
    'Will Decide Later': 'default',
}

export const enquiriesReportColumns: ColumnDef<Enquiry>[] = [
  {
    accessorKey: "enquiryNumber",
    header: "Enquiry #",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("date")} />
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "enquiry",
    header: "Enquiry",
    cell: ({row}) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <p className="truncate max-w-xs">{row.getValue("enquiry")}</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs">{row.getValue("enquiry")}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge variant={statusVariant[status] || 'default'}>{status}</Badge>;
    }
  },
  {
    accessorKey: 'followUps',
    header: 'Follow-ups',
    cell: ({ row }) => (row.original.followUps?.length || 0).toString(),
  },
];