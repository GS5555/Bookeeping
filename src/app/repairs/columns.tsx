
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Repair } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
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
import { useIsMounted } from "@/hooks/use-is-mounted"
import { Skeleton } from "@/components/ui/skeleton"
import { FormattedNumberCell } from "@/components/formatted-number-cell"

interface ActionsCellProps {
    repair: Repair;
    onEdit: (repair: Repair) => void;
    onDelete: (repairId: string) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const ActionsCell = ({ repair, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(repair.id);
        setIsDeleteDialogOpen(false);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`repair for ${repair.id}`}
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
                <DropdownMenuItem onClick={() => onEdit(repair)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Repair
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Repair
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: { onEdit: (repair: Repair) => void; onDelete: (repairId: string) => void }): ColumnDef<Repair>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("createdAt")} />
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "productName",
    header: "Product",
  },
  {
    accessorKey: "issueDescription",
    header: "Issue",
    cell: ({row}) => <p className="truncate max-w-xs">{row.getValue("issueDescription")}</p>
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge>{row.getValue("status")}</Badge>
  },
  {
    accessorKey: "estimatedCost",
    header: "Est. Cost",
    cell: ({ row }) => <FormattedNumberCell value={row.original.estimatedCost} />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <ActionsCell repair={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />
      )
    },
  },
]

