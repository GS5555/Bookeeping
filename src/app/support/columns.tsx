
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SupportTicket } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, View } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMounted } from "@/hooks/use-is-mounted"

const priorityVariant: Record<string, "default" | "secondary" | "destructive"> = {
    'Low': 'secondary',
    'Medium': 'default',
    'High': 'destructive',
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Open': 'default',
    'In Progress': 'secondary',
    'Closed': 'outline',
}

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }
  return <span>{new Date(date).toLocaleDateString('en-IN')}</span>;
}

interface ActionsCellProps {
    ticket: SupportTicket;
    onEdit: (ticket: SupportTicket) => void;
}

const ActionsCell = ({ ticket, onEdit }: ActionsCellProps) => {
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
            <DropdownMenuItem onClick={() => onEdit(ticket)}>
                <Pencil className="mr-2 h-4 w-4" />
                View / Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
}

export const columns = (options: {onEdit: (ticket: SupportTicket) => void}): ColumnDef<SupportTicket>[] => [
  {
    accessorKey: "ticketId",
    header: "Ticket ID",
    cell: ({ row }) => (
        <Button variant="link" className="p-0 h-auto font-medium" onClick={() => options.onEdit(row.original)}>
            {row.getValue("ticketId")}
        </Button>
    )
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({row}) => <p className="truncate max-w-xs">{row.getValue("subject")}</p>
  },
  {
    accessorKey: "status",
    header: "Status",
     cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={statusVariant[status] ?? 'default'}>{status}</Badge>
    }
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return <Badge variant={priorityVariant[priority] ?? 'default'}>{priority}</Badge>
    }
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return <FormattedDateCell date={date} />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell ticket={row.original} onEdit={options.onEdit} />,
  },
]
