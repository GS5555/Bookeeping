"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Vendor } from "@/lib/types"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

interface ActionsCellProps {
    vendor: Vendor;
    onEdit: (vendor: Vendor) => void;
    onDelete: (vendorId: string) => void;
}

const ActionsCell = ({ vendor, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(vendor.id);
        setIsDeleteDialogOpen(false);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={vendor.name}
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
                 <DropdownMenuItem onClick={() => onEdit(vendor)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Vendor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Vendor
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: { onEdit: (vendor: Vendor) => void; onDelete: (vendorId: string) => void }): ColumnDef<Vendor & { productCategories?: string }>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
        const vendor = row.original;
        return (
            <Button variant="link" className="p-0 h-auto justify-start font-medium" onClick={() => options.onEdit(vendor)}>
                {vendor.name}
            </Button>
        )
    }
  },
  {
    accessorKey: "vendorType",
    header: "Vendor Type",
    cell: ({ row }) => row.original.vendorType || 'N/A'
  },
  {
    accessorKey: "contactPerson",
    header: "Contact Person",
    cell: ({ row }) => {
        const vendor = row.original;
        return `${vendor.contactTitle || ''} ${vendor.contactPerson || ''}`.trim();
    }
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "productCategories",
    header: "Product Categories",
    cell: ({ row }) => {
        const categories = row.original.productCategories?.split(', ');
        if (!categories || categories.length === 0 || categories[0] === '') {
            return 'N/A';
        }
        return (
            <div className="flex flex-wrap gap-1">
                {categories.map(category => (
                    <Badge key={category} variant="secondary">{category}</Badge>
                ))}
            </div>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
         <ActionsCell vendor={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />
      )
    },
  },
]
