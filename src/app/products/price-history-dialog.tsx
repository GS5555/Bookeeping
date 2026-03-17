
'use client';

import { Product, PriceHistoryEntry } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FormattedNumberCell } from "@/components/formatted-number-cell";
import { useMemo } from "react";

interface PriceHistoryDialogProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistoryDialog({ product, open, onOpenChange }: PriceHistoryDialogProps) {
  const sortedHistory = useMemo(() => {
    return product?.priceHistory?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Price History for {product?.name}</DialogTitle>
          <DialogDescription>
            A log of all selling and purchase price changes for this product.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Changed</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistory.length > 0 ? (
                sortedHistory.map((entry: PriceHistoryEntry, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(entry.date), 'PPp')}</TableCell>
                    <TableCell className="text-right">
                      <FormattedNumberCell value={entry.purchasePrice} />
                    </TableCell>
                    <TableCell className="text-right">
                       <FormattedNumberCell value={entry.sellingPrice} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No price history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
