"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product, InventoryItem } from "@/lib/types"
import { MoreHorizontal, Edit, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { FormattedNumberCell } from "@/components/formatted-number-cell"
import { cn } from "@/lib/utils"

export type InventoryDetail = InventoryItem & Partial<Product> & {
    productName: string;
    brandName?: string;
    categoryName?: string;
    subCategoryName?: string;
    sku?: string;
    sellingPrice: number;
    purchasePrice: number;
    miscellaneousCost?: number;
    imageUrl?: string;
}

interface ActionsCellProps {
    item: InventoryDetail;
    onViewHistory: (item: InventoryDetail) => void;
    onEditProduct: (item: InventoryDetail) => void;
}

const ActionsCell = ({ item, onViewHistory, onEditProduct }: ActionsCellProps) => {
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
            <DropdownMenuItem onClick={() => onEditProduct(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewHistory(item)}>
                <History className="mr-2 h-4 w-4" />
                View History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns = (options: { 
    onAdjustStock: (item: InventoryDetail) => void; 
    onViewHistory: (item: InventoryDetail) => void;
    onEditProduct: (item: InventoryDetail) => void;
}): ColumnDef<InventoryDetail>[] => [
  {
    id: "srNo",
    header: "Sr. No.",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className="flex items-center gap-4">
           <Image 
                src={item.imageUrl || `https://placehold.co/40x40.png`} 
                alt={item.productName} 
                width={40} 
                height={40} 
                className="rounded-md object-cover"
                data-ai-hint="product inventory"
            />
          <div className="flex flex-col">
            <Button variant="link" className="p-0 h-auto justify-start font-medium" onClick={() => options.onEditProduct(item)}>
                {item.productName}
            </Button>
            <span className="text-sm text-muted-foreground">{item.sku}</span>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "brandName",
    header: "Brand",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
        const quantity = row.original.quantity;
        const color = quantity < 10 ? 'text-destructive' : 'text-foreground';
        return <div className={color}>{quantity} units</div>
    }
  },
  {
    accessorKey: "purchasePrice",
    header: "Purchase Price",
    cell: ({ row }) => <FormattedNumberCell value={row.original.purchasePrice} />,
  },
  {
    accessorKey: "sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => <FormattedNumberCell value={row.original.sellingPrice} />,
  },
  {
    id: "potentialProfit",
    header: "Profit / Qty",
    cell: ({ row }) => {
        const item = row.original;
        const purchase = Number(item.purchasePrice) || 0;
        const misc = Number(item.miscellaneousCost) || 0;
        const totalCost = purchase + misc;
        const gstRate = Number(item.gstRate) || 0;
        const sellingPrice = Number(item.sellingPrice) || 0;
        
        // Safety guard against division by zero or NaN
        const preGstSellingPrice = gstRate > 0 ? (sellingPrice / (1 + gstRate / 100)) : sellingPrice;
        let profit = preGstSellingPrice - totalCost;
        
        if (isNaN(profit)) profit = 0;
        const color = profit >= 0 ? 'text-green-600' : 'text-destructive';
        
        return <FormattedNumberCell value={profit} className={color} options={{ maximumFractionDigits: 0 }} />
    }
  },
  {
    accessorKey: "locationComment",
    header: "Location",
  },
   {
    id: "adjustStock",
    header: "Adjust Stock",
    cell: ({ row }) => (
      <Button variant="outline" size="sm" onClick={() => options.onAdjustStock(row.original)}>
        Adjust
      </Button>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell item={row.original} onViewHistory={options.onViewHistory} onEditProduct={options.onEditProduct} />,
  },
]