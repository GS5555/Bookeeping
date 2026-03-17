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
import { Checkbox } from "@/components/ui/checkbox"

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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
   const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
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
        pagination: {
            pageSize: initialPageSize,
        },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const handleDelete = () => {
    if (onDeleteSelected) {
        const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
        onDeleteSelected(selectedRows);
        table.resetRowSelection();
    }
  }

  const handleBulkAction = (action: 'email' | 'print' | 'download' | 'share') => {
    if (onBulkAction) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      onBulkAction(action, selectedRows);
      table.resetRowSelection();
    }
  }
  
  const handleActivate = () => {
    if (onActivateSelected) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      onActivateSelected(selectedRows);
      table.resetRowSelection();
    }
  }
  
  const handleDeactivate = () => {
    if (onDeactivateSelected) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      onDeactivateSelected(selectedRows);
      table.resetRowSelection();
    }
  }

  const hasRowsSelected = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 py-4">
          {hasRowsSelected && onBulkAction && (
              <>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('share')}>
                      <Share className="mr-2 h-4 w-4" />
                      Share ({table.getFilteredSelectedRowModel().rows.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('email')}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email ({table.getFilteredSelectedRowModel().rows.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('print')}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print ({table.getFilteredSelectedRowModel().rows.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('download')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download ({table.getFilteredSelectedRowModel().rows.length})
                  </Button>
              </>
          )}
           {hasRowsSelected && onActivateSelected && (
              <Button variant="outline" size="sm" onClick={handleActivate}>
                  <Power className="mr-2 h-4 w-4" />
                  Activate ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
          )}
          {hasRowsSelected && onDeactivateSelected && (
              <Button variant="outline" size="sm" onClick={handleDeactivate}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
          )}
          {hasRowsSelected && onDeleteSelected && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
          )}
      </div>
      <div className="w-full overflow-x-auto rounded-md border">
        <Table className="min-w-max">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : header.column.getCanSort() ? (
                            <Button
                                variant="ghost"
                                onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                            >
                                {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                )}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                            )
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
           <div className="text-sm text-muted-foreground flex-1 w-full md:w-auto text-center md:text-left">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                      value={`${table.getState().pagination.pageSize}`}
                      onValueChange={(value) => {
                          table.setPageSize(Number(value));
                      }}
                  >
                      <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                      {[10, 20, 50, 100, 250].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex items-center space-x-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                  >
                      Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                  >
                      Next
                  </Button>
              </div>
        </div>
      </div>
    </div>
  )
}
