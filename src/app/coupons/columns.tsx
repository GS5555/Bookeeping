
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Coupon } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Copy, Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { downloadPdf, printContent } from "@/lib/actions"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import jsPDF from "jspdf"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { useIsMounted } from "@/hooks/use-is-mounted"

interface ActionsCellProps {
    coupon: Coupon;
    onEdit: (coupon: Coupon) => void;
    onDelete: (couponId: string) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const generateCouponPdf = (coupon: Coupon): jsPDF => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Coupon: ${coupon.code}`, 14, 22);
    doc.setFontSize(12);
    (doc as any).autoTable({
        startY: 30,
        head: [['Field', 'Value']],
        body: [
            ['Code', coupon.code],
            ['Description', coupon.description],
            ['Discount Type', coupon.discountType],
            ['Discount Value', coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue.toLocaleString()}`],
            ['Min Purchase', `₹${coupon.minPurchaseAmount.toLocaleString()}`],
            ['Expires On', new Date(coupon.validUntil).toLocaleDateString('en-IN')],
            ['Status', coupon.isActive ? 'Active' : 'Inactive'],
            ['Usage', `${coupon.timesUsed}/${coupon.maxUses}`],
        ],
    });
    return doc;
};


const ActionsCell = ({ coupon, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(coupon.id);
        setIsDeleteDialogOpen(false);
    }

    const handleCopy = () => {
      navigator.clipboard.writeText(coupon.code);
      toast({ title: "Copied!", description: "Coupon code copied to clipboard." });
    }
    
    const handleDownloadPdf = () => {
        const doc = generateCouponPdf(coupon);
        doc.save(`coupon-${coupon.code}.pdf`);
    }

    const handlePrint = () => {
        const doc = generateCouponPdf(coupon);
        printContent(doc);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={coupon.code}
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
                    <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(coupon)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Coupon
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                        Delete Coupon
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}


export const columns = (options: {onEdit: (coupon: Coupon) => void, onDelete: (couponId: string) => void}): ColumnDef<Coupon>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono">{row.getValue("code")}</div>,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
    }
  },
  {
    accessorKey: "discountValue",
    header: "Discount",
    cell: ({ row }) => {
      const coupon = row.original;
      if (coupon.discountType === 'percentage') {
        return <div className="font-medium">{`${coupon.discountValue}%`}</div>;
      }
      return <FormattedNumberCell value={coupon.discountValue} className="font-medium" />;
    },
  },
    {
    accessorKey: "minPurchaseAmount",
    header: "Min. Purchase",
     cell: ({ row }) => <FormattedNumberCell value={row.original.minPurchaseAmount} />,
  },
  {
    accessorKey: "validUntil",
    header: "Expires",
    cell: ({ row }) => {
      const date = row.getValue("validUntil") as Date;
      return <FormattedDateCell date={date} />;
    },
  },
    {
    accessorKey: "timesUsed",
    header: "Usage",
    cell: ({ row }) => {
      const coupon = row.original;
      return `${coupon.timesUsed}/${coupon.maxUses}`;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell coupon={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
  },
]
