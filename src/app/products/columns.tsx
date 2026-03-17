

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product, Category, SubCategory, Brand } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Printer, Barcode, History, Copy, Power, PowerOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useState } from "react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import BarcodeComponent from 'react-barcode';
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { Checkbox } from "@/components/ui/checkbox"

type ProductWithStock = Product & { totalStock: number };

interface ActionsCellProps {
    product: ProductWithStock;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onViewHistory: (product: Product) => void;
    onClone: (product: Product) => void;
    onToggleActive: (productId: string, newStatus: boolean) => void;
}

const ActionsCell = ({ product, onEdit, onDelete, onViewHistory, onClone, onToggleActive }: ActionsCellProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        onDelete(product.id);
        setIsDeleteDialogOpen(false);
    }
    
    const handleToggleActive = () => {
        onToggleActive(product.id, !product.isActive);
    }

    const handlePrintBarcode = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const canvas = document.getElementById(`barcode-${product.sku}`) as HTMLCanvasElement;
            if (canvas) {
                const dataUrl = canvas.toDataURL();
                printWindow.document.write(`
                    <html>
                        <head><title>Print Barcode</title></head>
                        <body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                            <p style="margin: 0; font-size: 12px;">${product.name}</p>
                            <img src="${dataUrl}" />
                            <p style="margin: 0; font-size: 12px;">${product.sku}</p>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                 setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    }

    return (
        <>
            {/* Hidden barcode for printing */}
            <div style={{ display: 'none' }}>
                <BarcodeComponent
                    value={product.serialNumber || product.sku}
                    id={`barcode-${product.sku}`}
                    renderer="canvas"
                    width={1.5}
                    height={50}
                    fontSize={14}
                />
            </div>
            
             <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                itemName={product.name}
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
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Product
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClone(product)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone Product
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewHistory(product)}>
                        <History className="mr-2 h-4 w-4" />
                        View Price History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrintBarcode}>
                        <Barcode className="mr-2 h-4 w-4" />
                        Print Barcode
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleToggleActive}>
                        {product.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                        {product.isActive ? 'Make Inactive' : 'Make Active'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                        Delete Product
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export const columns = (options: {
    onEdit: (product: Product) => void, 
    onDelete: (productId: string) => void,
    onViewHistory: (product: Product) => void,
    onClone: (product: Product) => void;
    onToggleActive: (productId: string, newStatus: boolean) => void;
    categories: Category[],
    subCategories: SubCategory[],
    brands: Brand[],
}): ColumnDef<ProductWithStock>[] => [
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
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original;
      const brand = options.brands.find(b => b.id === product.brand);
      
      return (
        <div className="flex items-center gap-4">
           <Image 
                src={product.imageUrl || `https://placehold.co/40x40.png`} 
                alt={product.name} 
                width={40} 
                height={40} 
                className="rounded-md object-cover"
                data-ai-hint="product"
            />
          <div className="flex flex-col">
             <Button variant="link" className="p-0 h-auto justify-start font-medium whitespace-normal text-left" onClick={() => options.onEdit(product)}>
                {product.name}
            </Button>
            <span className="text-sm text-muted-foreground">{brand?.name || 'No Brand'}</span>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "handPreference",
    header: "Hand Pref.",
    cell: ({ row }) => {
        const pref = row.original.handPreference;
        return pref && pref !== 'Blank' ? pref : 'N/A';
    }
  },
  {
    id: "colors",
    header: "Colors",
    cell: ({ row }) => {
        const { color1, color2 } = row.original;
        const colorText = [color1, color2].filter(Boolean).join(' / ');
        return colorText || 'N/A';
    }
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
        const category = options.categories.find(c => c.id === row.original.category);
        return category?.name || 'N/A';
    }
  },
  {
    accessorKey: "subCategory",
    header: "Sub-Category",
    cell: ({ row }) => {
        const subCategory = options.subCategories.find(sc => sc.id === row.original.subCategory);
        return subCategory?.name || 'N/A';
    }
  },
  {
    accessorKey: "sku",
    header: "SKU / Serial",
    cell: ({row}) => {
        const product = row.original;
        return (
            <div>
                <p>{product.sku}</p>
                {product.serialNumber && <p className="text-xs text-muted-foreground">{product.serialNumber}</p>}
            </div>
        )
    }
  },
   {
    accessorKey: "totalStock",
    header: "Total Stock",
    cell: ({ row }) => {
      const totalStock = row.original.totalStock;
      const color = totalStock < 10 ? 'text-destructive' : 'text-foreground';
      return <div className={color}>{totalStock} units</div>
    }
  },
  {
    accessorKey: "sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => <FormattedNumberCell value={row.original.sellingPrice} />,
  },
  {
    accessorKey: "gstRate",
    header: "GST",
    cell: ({ row }) => `${row.original.gstRate}%`
  },
  {
    accessorKey: "purchasePrice",
    header: "Purchase Price",
    cell: ({ row }) => <FormattedNumberCell value={row.original.purchasePrice} />,
  },
  {
    accessorKey: "miscellaneousCost",
    header: "Misc. Cost",
    cell: ({ row }) => <FormattedNumberCell value={row.original.miscellaneousCost || 0} />,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell product={row.original} onEdit={options.onEdit} onDelete={options.onDelete} onViewHistory={options.onViewHistory} onClone={options.onClone} onToggleActive={options.onToggleActive} />,
  },
]
