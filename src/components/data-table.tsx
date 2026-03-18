"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Trash2, Mail, Printer, FileDown, Share, Power, PowerOff } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDeleteSelected?: (selectedRows: TData[]) => void
  onBulkAction?: (action: 'email' | 'print' | 'download' | 'share', selectedRows: TData[]) => void
  onActivateSelected?: (selectedRows: TData[]) => void;
  onDeactivateSelected?: (selectedRows: TData[]) => void;
  initialPageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDeleteSelected,
  onBulkAction,
  onActivateSelected,
  onDeactivateSelected,
  initialPageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
        pagination: { pageSize: initialPageSize },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const hasRowsSelected = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className="w-full flex flex-col min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 py-4">
          {hasRowsSelected && onBulkAction && (
              <>
                  <Button variant="outline" size="sm" onClick={() => onBulkAction('share', table.getFilteredSelectedRowModel().rows.map(r => r.original))}>
                      <Share className="mr-2 h-4 w-4" /> Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onBulkAction('print', table.getFilteredSelectedRowModel().rows.map(r => r.original))}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
              </>
          )}
          {hasRowsSelected && onDeleteSelected && (
              <Button variant="destructive" size="sm" onClick={() => { onDeleteSelected(table.getFilteredSelectedRowModel().rows.map(r => r.original)); table.resetRowSelection(); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
          )}
      </div>
      <div className="w-full overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[600px] w-full border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap px-4 bg-muted/50">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2 border-b">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 min-w-0">
          <div className="text-xs text-muted-foreground">{table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.</div>
          <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
      </div>
    </div>
  )
}
