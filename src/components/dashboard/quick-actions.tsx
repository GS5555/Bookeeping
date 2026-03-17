'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, Package, UserPlus, Wallet, Boxes, HelpCircle, FileText, Notebook } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
    onNewSale: () => void;
    onNewPurchase: () => void;
    onAddProduct: () => void;
    onAddCustomer: () => void;
    onAddExpense: () => void;
    onNewStockEntry: () => void;
    onNewEnquiry: () => void;
    onNewQuotation: () => void;
}

export function QuickActions({ onNewSale, onNewPurchase, onAddProduct, onAddCustomer, onAddExpense, onNewStockEntry, onNewEnquiry, onNewQuotation }: QuickActionsProps) {
    
    const buttonClassName = "h-auto py-4 flex-col gap-2 text-center whitespace-normal bg-secondary/50 hover:bg-secondary border border-border/50 shadow-sm text-secondary-foreground";
    
    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-4">
                <Button onClick={onNewSale} className={buttonClassName}>
                    <ShoppingCart className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">New Sale</span>
                </Button>
                <Button onClick={onNewPurchase} className={buttonClassName}>
                    <PlusCircle className="h-6 w-6 text-primary" />
                     <span className="text-sm font-medium">New Purchase</span>
                </Button>
                <Button onClick={onAddProduct} className={buttonClassName}>
                    <Package className="h-6 w-6 text-primary" />
                     <span className="text-sm font-medium">Add Product</span>
                </Button>
                 <Button onClick={onAddCustomer} className={buttonClassName}>
                    <UserPlus className="h-6 w-6 text-primary" />
                     <span className="text-sm font-medium">Add Customer</span>
                </Button>
                 <Button onClick={onAddExpense} className={buttonClassName}>
                    <Wallet className="h-6 w-6 text-primary" />
                     <span className="text-sm font-medium">Add Expense</span>
                </Button>
                <Button onClick={onNewStockEntry} className={buttonClassName}>
                    <Boxes className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Inventory Update</span>
                </Button>
                 <Button onClick={onNewEnquiry} className={buttonClassName}>
                    <HelpCircle className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">New Enquiry</span>
                </Button>
                 <Button onClick={onNewQuotation} className={buttonClassName}>
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">New Quotation</span>
                </Button>
                <Button asChild className={buttonClassName}>
                    <Link href="/notes">
                        <Notebook className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">My Notes</span>
                    </Link>
                </Button>
            </div>
        </div>
    );
}
