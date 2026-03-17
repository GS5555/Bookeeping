

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { Category, SubCategory, Brand, Color, Courier, Company, ExpenseType, Warranty } from "@/lib/types"

type Item = Category | SubCategory | Brand | Color | Courier | Company | ExpenseType | Warranty;

interface ActionsCellProps {
    item: Item;
    onEdit: (item: Item) => void;
    onDelete: (itemId: string) => void;
}

const ActionsCell = ({ item, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(item.id);
        setIsDeleteDialogOpen(false);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={item.name}
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
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}


export const columns = (options: {onEdit: (item: Item) => void, onDelete: (itemId: string) => void}): ColumnDef<Item>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
   {
    accessorKey: "hsnCode",
    header: "HSN Code",
    cell: ({ row }) => {
        const item = row.original as Category;
        return item.hsnCode || 'N/A';
    }
  },
   {
    accessorKey: "gstRate",
    header: "GST Rate",
    cell: ({ row }) => {
       const item = row.original as Category;
       return item.gstRate !== undefined ? `${item.gstRate}%` : 'N/A';
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell item={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
  },
]

export const subCategoryColumns = (categories: Category[]) => (options: {onEdit: (item: Item) => void, onDelete: (itemId: string) => void}): ColumnDef<SubCategory>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "categoryId",
    header: "Parent Category",
    cell: ({ row }) => {
        const category = categories.find(c => c.id === row.original.categoryId);
        return category ? category.name : 'N/A';
    }
  },
  {
    accessorKey: "hsnCode",
    header: "HSN Code",
  },
   {
    accessorKey: "gstRate",
    header: "GST Rate",
    cell: ({ row }) => `${row.original.gstRate || 0}%`
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell item={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
  },
]

export const courierColumns = (options: {onEdit: (item: Courier) => void, onDelete: (itemId: string) => void}): ColumnDef<Courier>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "trackingUrl",
    header: "Tracking URL",
    cell: ({ row }) => row.original.trackingUrl || 'N/A'
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell item={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
  },
]

export const basicColumns = (options: { onEdit: (item: Item) => void; onDelete: (itemId: string) => void; }): ColumnDef<Item>[] => [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell item={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
    },
];

