"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Customer } from "@/lib/types"
import { MoreHorizontal, Pencil, Trash2, Check, X, FileText } from "lucide-react"
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
import Link from "next/link"

interface ActionsCellProps {
    customer: Customer;
    onEdit: (customer: Customer) => void;
    onDelete: (customerId: string) => void;
    onApprove?: (customerId: string) => void;
}

const ActionsCell = ({ customer, onEdit, onDelete, onApprove }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(customer.id);
        setIsDeleteDialogOpen(false);
    }
    
    const isPending = customer.isApproved === false;

    if (isPending && onApprove) {
         return (
            <>
                <DeleteConfirmationDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    onConfirm={handleDelete}
                    itemName={`${customer.name}'s registration`}
                />
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onApprove(customer.id)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                        <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                </div>
            </>
         )
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={customer.name}
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
                    <Link href={`/customer/${customer.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Statement
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Customer
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: { onEdit: (customer: Customer) => void; onDelete: (customerId: string) => void, onApprove?: (customerId: string) => void }): ColumnDef<Customer>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
        const customer = row.original;
        return (
            <div className="flex flex-col">
                <Link 
                    href={`/customer/${customer.id}`}
                    className="font-medium hover:underline text-primary"
                >
                    {customer.name}
                </Link>
                 {customer.isApproved === false && <Badge variant="secondary" className="w-fit">Pending</Badge>}
            </div>
        )
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
    accessorKey: "addresses",
    header: "Location",
    cell: ({ row }) => {
      const primaryAddress = row.original.addresses.find(a => a.isPrimary);
      if (!primaryAddress) return 'No primary address';
      return `${primaryAddress.city}, ${primaryAddress.state}`;
    }
  },
  {
    accessorKey: "purpose",
    header: "Purpose of Visit",
     cell: ({ row }) => row.original.purpose || 'N/A'
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <ActionsCell customer={row.original} onEdit={options.onEdit} onDelete={options.onDelete} onApprove={options.onApprove} />
      )
    },
  },
]
