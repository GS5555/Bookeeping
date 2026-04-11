"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Expense, Company } from "@/lib/types"
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
import { Skeleton } from "@/components/ui/skeleton"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { useIsMounted } from "@/hooks/use-is-mounted"

interface ExpenseRow extends Expense {
    companyName?: string;
}

interface ActionsCellProps {
    expense: Expense;
    onEdit: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ expense, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(expense.id);
        setIsDeleteDialogOpen(false);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`expense for ${expense.description}`}
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
                <DropdownMenuItem onClick={() => onEdit(expense)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Expense
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Expense
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: { onEdit: (expense: Expense) => void; onDelete: (expenseId: string) => void }): ColumnDef<ExpenseRow>[] => [
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
  },
  {
    accessorKey: "category",
    header: "Category",
     cell: ({ row }) => {
        const expense = row.original;
        return (
            <Button variant="link" className="p-0 h-auto font-normal" onClick={() => options.onEdit(expense)}>
                {expense.category}
            </Button>
        )
    }
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <FormattedNumberCell value={row.original.amount} />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <ActionsCell expense={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />
      )
    },
  },
]
