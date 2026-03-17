

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Enquiry, EnquiryFollowUp, User } from "@/lib/types"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"

interface ActionsCellProps {
    enquiry: Enquiry;
    onEdit: (enquiry: Enquiry) => void;
    onDelete: (enquiryId: string) => void;
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'New': 'secondary',
    'Follow-up': 'default',
    'Scheduled Callback': 'default',
    'Will Decide Later': 'default',
    'Converted': 'outline',
    'Rejected': 'destructive',
    'Not Interested': 'destructive',
}

const ActionsCell = ({ enquiry, onEdit, onDelete }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(enquiry.id);
        setIsDeleteDialogOpen(false);
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={`enquiry from ${enquiry.customerName}`}
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
                <DropdownMenuItem onClick={() => onEdit(enquiry)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit / View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Enquiry
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: { onEdit: (enquiry: Enquiry) => void; onDelete: (enquiryId: string) => void }): ColumnDef<Enquiry>[] => [
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
    accessorKey: "enquiryNumber",
    header: "Enquiry #",
    cell: ({ row }) => (
        <Button variant="link" className="p-0 h-auto font-medium" onClick={() => options.onEdit(row.original)}>
            {row.original.enquiryNumber}
        </Button>
    )
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("date")} />
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => (
        <Button variant="link" className="p-0 h-auto font-medium text-left" onClick={() => options.onEdit(row.original)}>
            {row.getValue("customerName")}
        </Button>
    )
  },
  {
    accessorKey: "createdByName",
    header: "Created By",
  },
  {
    accessorKey: 'latestFollowUp',
    header: 'Latest Follow-up',
    enableSorting: false,
    cell: ({ row }) => {
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
        return <Badge variant={statusVariant[status] || 'default'}>{status}</Badge>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell enquiry={row.original} onEdit={options.onEdit} onDelete={options.onDelete} />,
  },
]

export const followUpColumns = (options: { users: User[] }): ColumnDef<EnquiryFollowUp>[] => [
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <FormattedDateCell date={row.getValue("date")} />
    },
     {
        accessorKey: "userId",
        header: "User",
        cell: ({row}) => {
            const user = options.users.find(u => u.id === row.original.userId);
            return user?.displayName || 'Unknown User';
        }
    },
    {
        accessorKey: "type",
        header: "Type",
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => <p className="whitespace-pre-wrap">{row.getValue("notes")}</p>
    }
];
