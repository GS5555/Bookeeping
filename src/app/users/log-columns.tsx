
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ActivityLog } from "@/lib/types"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

const FormattedDateCell = ({ date }: { date: string | Date}) => {
  const isMounted = useIsMounted();
  if (!isMounted) {
    return <Skeleton className="h-4 w-[120px]" />;
  }
  return <span>{format(new Date(date), 'PPpp')}</span>;
}

export const columns: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <FormattedDateCell date={row.getValue("timestamp")} />
  },
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => {
        const log = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-medium">{log.username}</span>
                <span className="text-xs text-muted-foreground">{log.userId}</span>
            </div>
        )
    }
  },
  {
    accessorKey: "action",
    header: "Action",
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
  },
]
