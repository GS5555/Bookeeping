'use client';

import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
                    <span className="font-medium text-xs sm:text-sm">{user.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "role",
    header: "Access Rights",
    cell: ({ row, table }) => {
        const user = row.original;
        const isCurrentUser = user.id === options.currentUserId;
        const isMaster = user.email === 'admin@example.com' || user.email === 'ghanshyam.saini@gmail.com';
        
        if (isCurrentUser || isMaster) {
            return <Badge variant="destructive" className="capitalize text-[10px] h-6 px-2">{user.role}</Badge>
        }

        return (
            <Select 
                defaultValue={user.role} 
                onValueChange={(value) => options.onRoleChange(user.id, value as AppUser['role'])}
            >
                <SelectTrigger className="w-[110px] h-8 text-[10px] font-black uppercase tracking-widest bg-background border-muted-foreground/30">
                    <SelectValue placeholder="Role" />
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
        const isMaster = user.email === 'admin@example.com' || user.email === 'ghanshyam.saini@gmail.com';

        return (
            <div className="flex items-center gap-2">
                <Switch
                    checked={user.isApproved}
                    onCheckedChange={(isApproved) => options.onApprovalChange(user.id, isApproved)}
                    disabled={isCurrentUser || isMaster}
                    aria-label="Approve user"
                />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", user.isApproved ? "text-green-600" : "text-destructive")}>
                    {user.isApproved ? "Approved" : "Pending"}
                </span>
            </div>
        )
    }
  }
];