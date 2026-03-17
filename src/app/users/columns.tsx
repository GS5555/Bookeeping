
'use client';

import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface AppUser {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'data-entry';
    isApproved: boolean;
}

interface ColumnsOptions {
    onRoleChange: (userId: string, newRole: AppUser['role']) => void;
    onApprovalChange: (userId: string, isApproved: boolean) => void;
    currentUserId?: string;
}

export const columns = (options: ColumnsOptions): ColumnDef<AppUser>[] => [
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
        disabled={row.original.id === options.currentUserId}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "displayName",
    header: "User",
    cell: ({ row }) => {
        const user = row.original;
        const initials = user.displayName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
        return (
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{user.displayName}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row, table }) => {
        const user = row.original;
        const isCurrentUser = user.id === options.currentUserId;
        const adminCount = table.options.data.filter((u: any) => u.role === 'admin').length;
        const isLastAdmin = user.role === 'admin' && adminCount === 1;
        
        if (isCurrentUser || isLastAdmin) {
            return <Badge variant={isLastAdmin ? "destructive" : "default"}>{user.role}</Badge>
        }

        return (
            <Select 
                defaultValue={user.role} 
                onValueChange={(value) => options.onRoleChange(user.id, value as AppUser['role'])}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="data-entry">Data Entry</SelectItem>
                </SelectContent>
            </Select>
        )
    }
  },
  {
    accessorKey: "isApproved",
    header: "Status",
    cell: ({ row }) => {
        const user = row.original;
        const isCurrentUser = user.id === options.currentUserId;

        return (
            <div className="flex items-center gap-2">
                <Switch
                    checked={user.isApproved}
                    onCheckedChange={(isApproved) => options.onApprovalChange(user.id, isApproved)}
                    disabled={isCurrentUser}
                    aria-label="Approve user"
                />
                <span className="text-sm text-muted-foreground">{user.isApproved ? "Approved" : "Pending"}</span>
            </div>
        )
    }
  }
];
