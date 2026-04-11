'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Product, Brand, Category, Color, SubCategory, Vendor, HandPreference, PriceHistoryEntry } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { RefreshCw, PlusCircle, Trash2, Search, Copy, Edit, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";

const STORE_ID = 'store_main';

const bundleItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  categoryName: z.string().optional(),
  subCategoryName: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  sku: z.string().min(1, "SKU is required."),
  serialNumber: z.string().optional(),
  handPreference: z.enum(["Blank", "Left", "Right", "Normal"]).optional(),
  imageUrl: z.string().url("Please enter a valid image URL.").or(z.literal('')).optional(),
  brand: z.string().min(1, "Brand is required."),
  category: z.string().min(1, "Category is required."),
  subCategory: z.string().optional(),
  color1: z.string().optional(),
  color2: z.string().optional(),
  vendorId: z.string().min(1, "Vendor ID is required."),
  purchasePrice: z.coerce.number().positive("Purchase price must be positive."),
  miscellaneousCost: z.coerce.number().min(0, "Miscellaneous cost must be zero or more.").optional(),
  profitPercentage: z.coerce.number().min(0).optional(),
  profitAmount: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().positive("Selling price must be positive."),
  finalPrice: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  hsnCode: z.string().min(1, "HSN Code is required"),
  gstRate: z.coerce.number().min(0, "GST rate cannot be negative."),
  isActive: z.boolean().default(true),
  isBundle: z.boolean().default(false),
  bundleItems: z.array(bundleItemSchema).optional(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductDialogProps {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: (product: Product) => void;
}

const ReadOnlyField = ({ label, value, children, className }: { label: string, value?: React.ReactNode, children?: React.ReactNode, className?: string }) => (
    <div className={cn("space-y-1", className)}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? (
            <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{children}</div>
        ) : (
            <div className="text-sm p-2 border rounded-md bg-muted min-h-[40px] flex items-center">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
        )}
    </div>
)


export function ProductDialog({ children, open, onOpenChange, product, onSuccess }: ProductDialogProps) {
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!product);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<Product | null>(null);

  const brandsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'brands') : null, [firestore]);
  const { data: mockBrands } = useCollection<Brand>(brandsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'categories') : null, [firestore]);
  const { data: mockCategories } = useCollection<Category>(categoriesRef);

  const subCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'subCategories') : null, [firestore]);
  const { data: mockSubCategories } = useCollection<SubCategory>(subCategoriesRef);

  const colorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'colors') : null, [firestore]);
  const { data: mockColors } = useCollection<Color>(colorsRef);
  
  const vendorsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'vendors') : null, [firestore]);
  const { data: mockVendors } = useCollection<Vendor>(vendorsRef);
  
  const allProductsRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'products') : null, [firestore]);
  const { data: allProducts } = useCollection<Product>(allProductsRef);

  const handPreferencesRef = useMemoFirebase(() => firestore ? collection(firestore, 'settings', 'global', 'handPreferences') : null, [firestore]);
  const { data: handPreferences } = useCollection<HandPreference>(handPreferencesRef);

  const sortedBrands = useMemo(() => mockBrands?.sort((a, b) => a.name.localeCompare(b.name)), [mockBrands]);
  const sortedCategories = useMemo(() => mockCategories?.sort((a, b) => a.name.localeCompare(b.name)), [mockCategories]);
  const sortedColors = useMemo(() => mockColors?.sort((a, b) => a.name.localeCompare(b.name)), [mockColors]);
  const sortedVendors = useMemo(() => mockVendors?.sort((a, b) => (a.name || '').localeCompare(b.name || '')), [mockVendors]);
  const sortedAllProducts = useMemo(() => allProducts?.filter(p => !p.isBundle).sort((a, b) => (a.name || '').localeCompare(b.name || '')), [allProducts]);
  
  const sortedHandPreferences = useMemo(() => {
    if (!handPreferences) return [];
    const order: ('Normal' | 'Right' | 'Left')[] = ["Normal", "Right", "Left"];
    return handPreferences.sort((a, b) => {
      const indexA = order.indexOf(a.name as 'Normal' | 'Right' | 'Left');
      const indexB = order.indexOf(b.name as 'Normal' | 'Right' | 'Left');
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [handPreferences]);

  const bundleProducts = useMemo(() => {
    return allProducts?.filter(p => p.isBundle).sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [allProducts]);


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", sku: "", serialNumber: "", imageUrl: "", brand: "", category: "", subCategory: "", handPreference: "Normal",
      color1: "", color2: "", vendorId: "", purchasePrice: 0, miscellaneousCost: 0, profitPercentage: 0, profitAmount: 0,
      sellingPrice: 0, finalPrice: 0, description: "", hsnCode: "", gstRate: 0, isActive: true, isBundle: false, bundleItems: [],
    },
  });

  const { getValues } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "bundleItems",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const watchedCategory = form.watch('category');
  const watchedSubCategory = form.watch('subCategory');
  const watchedBrand = form.watch('brand');
  const watchedImageUrl = form.watch('imageUrl');
  const watchedIsBundle = form.watch('isBundle');
  const watchedBundleItems = form.watch('bundleItems');
  const watchedPurchasePrice = form.watch('purchasePrice');
  const watchedMiscCost = form.watch('miscellaneousCost');
  const watchedGstRate = form.watch('gstRate');
  const watchedFinalPrice = form.watch('finalPrice');
  const watchedProfitAmount = form.watch('profitAmount');
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    if (productToAdd && mockCategories && mockSubCategories) {
        const existingItemIndex = fields.findIndex(item => item.productId === productToAdd.id);

        if (existingItemIndex > -1) {
            toast({
                title: "Product Already Added",
                description: `"${productToAdd.name}" is already in the bundle. You can edit its quantity directly.`,
                variant: "destructive"
            });
            setProductToAdd(null);
            return;
        }

        const category = mockCategories.find(c => c.id === productToAdd.category);
        const subCategory = mockSubCategories.find(sc => sc.id === productToAdd.subCategory);

        append({
            productId: productToAdd.id,
            productName: productToAdd.name,
            quantity: 1,
            categoryName: category?.name || 'N/A',
            subCategoryName: subCategory?.name || 'N/A',
        });
        toast({ title: "Product Added", description: `${productToAdd.name} added to bundle.` });
        setProductToAdd(null);
    }
  }, [productToAdd, append, mockCategories, mockSubCategories, fields]);


  const filteredSubCategories = useMemo(() => {
    if (!mockSubCategories || !watchedCategory || !mockCategories) return [];
    return mockSubCategories.filter(sc => sc.categoryId === watchedCategory).sort((a, b) => a.name.localeCompare(b.name));
  }, [mockSubCategories, watchedCategory, mockCategories]);

  useEffect(() => {
    if (!isInitialLoad.current) {
        form.setValue('subCategory', '');
    }
  }, [watchedCategory, form]);

  useEffect(() => {
    if (watchedSubCategory && mockSubCategories) {
        const subCategoryDetails = mockSubCategories.find(sc => sc.id === watchedSubCategory);
        if (subCategoryDetails?.hsnCode && subCategoryDetails.gstRate !== undefined) {
            form.setValue('hsnCode', subCategoryDetails.hsnCode, { shouldValidate: true });
            form.setValue('gstRate', subCategoryDetails.gstRate, { shouldValidate: true });
        }
    } else if (watchedCategory && mockCategories) {
        const categoryDetails = mockCategories.find(c => c.id === watchedCategory);
        if(categoryDetails?.hsnCode && categoryDetails.gstRate !== undefined) {
             form.setValue('hsnCode', categoryDetails.hsnCode, { shouldValidate: true });
             form.setValue('gstRate', categoryDetails.gstRate, { shouldValidate: true });
        } else {
             form.setValue('hsnCode', '');
             form.setValue('gstRate', 0);
        }
    } else {
        form.setValue('hsnCode', '');
        form.setValue('gstRate', 0);
    }
  }, [watchedSubCategory, watchedCategory, mockSubCategories, mockCategories, form]);

  const landingPrice = useMemo(() => {
    const purchase = Number(watchedPurchasePrice) || 0;
    const misc = Number(watchedMiscCost) || 0;
    return purchase + misc;
  }, [watchedPurchasePrice, watchedMiscCost]);

  const handleFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const finalPriceValue = parseFloat(e.target.value) || 0;
    form.setValue('finalPrice', finalPriceValue, { shouldValidate: true });
    
    if (finalPriceValue > 0) {
      const { purchasePrice = 0, miscellaneousCost = 0, gstRate = 0 } = form.getValues();
      const landing = (Number(purchasePrice) || 0) + (Number(miscellaneousCost) || 0);
      const gst = Number(gstRate) || 0;

      const preGstPrice = finalPriceValue / (1 + (gst / 100));
      const newProfitAmount = preGstPrice - landing;

      if (landing > 0) {
        const newProfitPercent = (newProfitAmount / landing) * 100;
        form.setValue('profitPercentage', parseFloat(newProfitPercent.toFixed(2)), { shouldValidate: true });
      } else {
        form.setValue('profitPercentage', 0, { shouldValidate: true });
      }
      form.setValue('profitAmount', parseFloat(newProfitAmount.toFixed(2)), { shouldValidate: true });
      form.setValue('sellingPrice', finalPriceValue, { shouldValidate: true });
    }
  };

  const updateCalculatedFields = () => {
    const { purchasePrice, miscellaneousCost, gstRate, profitAmount } = form.getValues();
    const landing = (Number(purchasePrice) || 0) + (Number(miscellaneousCost) || 0);
    const gst = Number(gstRate) || 0;
    const profit = Number(profitAmount) || 0;

    const basePrice = landing + profit;
    const gstValue = basePrice * (gst / 100);
    const finalSellingPrice = basePrice + gstValue;

    if (form.getValues('sellingPrice') !== finalSellingPrice) {
        form.setValue('sellingPrice', parseFloat(finalSellingPrice.toFixed(2)), { shouldValidate: true });
    }
  };
  
  const handleProfitPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value) || 0;
    const { purchasePrice, miscellaneousCost } = form.getValues();
    const landing = (Number(purchasePrice) || 0) + (Number(miscellaneousCost) || 0);
    const newProfitAmount = landing * (percent / 100);
    form.setValue('profitAmount', parseFloat(newProfitAmount.toFixed(2)), { shouldValidate: true });
    form.setValue('profitPercentage', percent, { shouldValidate: true });
    updateCalculatedFields();
  };

  const handleProfitAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
     const { purchasePrice, miscellaneousCost } = form.getValues();
    const landing = (Number(purchasePrice) || 0) + (Number(miscellaneousCost) || 0);
    if (landing > 0) {
      const newProfitPercent = (amount / landing) * 100;
      form.setValue('profitPercentage', parseFloat(newProfitPercent.toFixed(2)), { shouldValidate: true });
    } else {
      form.setValue('profitPercentage', 0, { shouldValidate: true });
    }
     form.setValue('profitAmount', amount, { shouldValidate: true });
    updateCalculatedFields();
  };

  useEffect(() => {
    if (!watchedIsBundle) {
        updateCalculatedFields();
    }
  }, [watchedPurchasePrice, watchedMiscCost, watchedGstRate, watchedIsBundle]);

   const generateSku = () => {
    const { brand: brandId, category: categoryId, subCategory: subCategoryId } = form.getValues();
    const brand = mockBrands?.find(b => b.id === brandId);
    if (!brand) return; // Need at least a brand

    const category = mockCategories?.find(c => c.id === categoryId);
    const subCategory = mockSubCategories?.find(sc => sc.id === subCategoryId);

    const brandCode = brand.name.slice(0, 3).toUpperCase();
    let categoryCode = '';

    if (subCategory) {
      categoryCode = subCategory.name.slice(0, 2).toUpperCase();
    } else if (category) {
      categoryCode = category.name.slice(0, 2).toUpperCase();
    } else {
      return; // Need at least a category or subcategory
    }

    const sku = `${brandCode}${categoryCode}${Date.now().toString().slice(-4)}`;
    form.setValue('sku', sku, { shouldValidate: true });
  };

  useEffect(() => {
    if (!product) { // Only auto-generate for new products
      generateSku();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBrand, watchedCategory, watchedSubCategory]);

// Set initial values when dialog opens for editing
  useEffect(() => {
    if (open) {
      if (product) {
        setIsEditing(false); // view mode
        isInitialLoad.current = true;
        const enrichedBundleItems = product.isBundle && product.bundleItems && allProducts && mockCategories ? product.bundleItems.map(item => {
            const bundleProduct = allProducts.find(p => p.id === item.productId);
            const category = mockCategories.find(c => c.id === bundleProduct?.category);
            const subCategory = mockSubCategories?.find(sc => sc.id === bundleProduct?.subCategory);
            return {
                ...item,
                productName: bundleProduct?.name || 'Unknown',
                categoryName: category?.name || 'N/A',
                subCategoryName: subCategory?.name || 'N/A',
            }
        }) : [];
        
        form.reset({
          ...product,
          finalPrice: product.finalPrice || product.sellingPrice || undefined,
          bundleItems: enrichedBundleItems as any,
        });

        // Allow calculations to run after initial load
        setTimeout(() => {
            isInitialLoad.current = false;
        }, 100);
      } else {
        setIsEditing(true); // edit mode for new product
        isInitialLoad.current = false;
        form.reset({
            name: "", sku: "", serialNumber: "", imageUrl: "", brand: "", category: "", subCategory: "", handPreference: "Normal",
            color1: "", color2: "", vendorId: "", purchasePrice: 0, miscellaneousCost: 0, profitPercentage: 0, profitAmount: 0,
            sellingPrice: 0, finalPrice: undefined, description: "", hsnCode: "", gstRate: 0, isActive: true, isBundle: false, bundleItems: [],
        })
      }
    }
  }, [product, open, form, allProducts, mockCategories, mockSubCategories])

  // Auto-calculate bundle prices
  useEffect(() => {
    if (watchedIsBundle && allProducts && watchedBundleItems) {
      let totalPurchasePrice = 0;
      let totalSellingPrice = 0;
      let totalMiscellaneousCost = 0;
      watchedBundleItems.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
          totalPurchasePrice += product.purchasePrice * item.quantity;
          totalSellingPrice += product.sellingPrice * item.quantity;
          totalMiscellaneousCost += (product.miscellaneousCost || 0) * item.quantity;
        }
      });
      form.setValue('purchasePrice', totalPurchasePrice);
      form.setValue('sellingPrice', totalSellingPrice);
      form.setValue('miscellaneousCost', totalMiscellaneousCost);
    }
  }, [watchedIsBundle, watchedBundleItems, allProducts, form]);


  const onSubmit = (data: ProductFormValues) => {
    // Ensure final calculation before submission for non-bundles
    if (!data.isBundle) {
        updateCalculatedFields();
    }
    
    // Use a short timeout to allow the form state to update
    setTimeout(() => {
        const finalData = form.getValues();

        const submittedProduct: Product = {
            id: product?.id || `prod_${Date.now()}`,
            storeId: product?.storeId || STORE_ID,
            name: finalData.name,
            sku: finalData.sku,
            serialNumber: finalData.serialNumber || '',
            handPreference: finalData.handPreference || 'Normal',
            imageUrl: finalData.imageUrl || '',
            brand: finalData.brand,
            category: finalData.category,
            subCategory: finalData.subCategory || '',
            color1: finalData.color1 || '',
            color2: finalData.color2 || '',
            vendorId: finalData.vendorId,
            purchasePrice: finalData.purchasePrice,
            miscellaneousCost: finalData.miscellaneousCost || 0,
            profitPercentage: finalData.profitPercentage || 0,
            profitAmount: finalData.profitAmount || 0,
            sellingPrice: finalData.sellingPrice,
            finalPrice: finalData.finalPrice || 0,
            description: finalData.description || '',
            hsnCode: finalData.hsnCode,
            gstRate: finalData.gstRate,
            isActive: finalData.isActive,
            isBundle: finalData.isBundle,
            bundleItems: finalData.isBundle ? (finalData.bundleItems || []).map(item => ({ productId: item.productId, quantity: item.quantity })) : [],
            priceHistory: product?.priceHistory || [],
        };
        
        if (product) { // Editing
             const hasPriceChanged = product.sellingPrice !== submittedProduct.sellingPrice || product.purchasePrice !== submittedProduct.purchasePrice;
             if (hasPriceChanged) {
                const newHistoryEntry: PriceHistoryEntry = {
                    sellingPrice: submittedProduct.sellingPrice,
                    purchasePrice: submittedProduct.purchasePrice,
                    date: new Date().toISOString(),
                };
                submittedProduct.priceHistory = [...(product.priceHistory || []), newHistoryEntry];
             }
        } else { // New product
             submittedProduct.priceHistory = [{
                sellingPrice: submittedProduct.sellingPrice,
                purchasePrice: submittedProduct.purchasePrice,
                date: new Date().toISOString(),
            }];
        }
        
        onSuccess(submittedProduct);
    }, 100);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const storage = getStorage();
        const filePath = `product-images/${Date.now()}-${file.name}`;
        const fileRef = storageRef(storage, filePath);
        
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        form.setValue('imageUrl', downloadURL, { shouldValidate: true });
        
        setUploadProgress(100);
        toast({
          title: "Upload Successful",
          description: "Image has been uploaded and URL is set.",
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Upload Failed",
          description: "Could not upload the image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCopyBundle = (bundleId: string) => {
    const bundleToCopy = bundleProducts.find(p => p.id === bundleId);
    if (bundleToCopy) {
      const enrichedItems = (bundleToCopy.bundleItems || []).map(item => {
        const bundleProduct = allProducts?.find(p => p.id === item.productId);
        if (!bundleProduct) return null;
        const category = mockCategories?.find(c => c.id === bundleProduct.category);
        const subCategory = mockSubCategories?.find(sc => sc.id === bundleProduct.subCategory);
        return {
          productId: item.productId,
          quantity: item.quantity,
          productName: bundleProduct.name || 'Unknown',
          categoryName: category?.name || 'N/A',
          subCategoryName: subCategory?.name || 'N/A',
        };
      }).filter(Boolean);

      form.setValue('name', `Copy of ${bundleToCopy.name}`);
      form.setValue('description', bundleToCopy.description);
      form.setValue('category', bundleToCopy.category);
      form.setValue('subCategory', bundleToCopy.subCategory);
      form.setValue('brand', bundleToCopy.brand);
      form.setValue('hsnCode', bundleToCopy.hsnCode);
      form.setValue('gstRate', bundleToCopy.gstRate);
      
      replace(enrichedItems as any);
  
      toast({ title: "Bundle Copied", description: `Details from "${bundleToCopy.name}" have been copied.` });
    }
  };
  
  const handleCopyProduct = (productId: string) => {
    const productToCopy = allProducts?.find(p => p.id === productId);
    if (productToCopy) {
      const { id, sku, serialNumber, name, ...restOfProduct } = productToCopy;
      form.reset({
        ...form.getValues(),
        ...restOfProduct,
        name: `Copy of ${name}`,
        sku: '',
        serialNumber: '',
        isBundle: false, // Force individual product
        bundleItems: [],
      });
      generateSku();
      toast({ title: "Product Copied", description: `Details from "${name}" have been copied.` });
    }
  }

    // This block calculates the profit margins for display purposes, especially in read-only mode.
    const { displayProfitAmount, displayProfitPercentage, displaySellingPrice } = useMemo(() => {
        const formValues = getValues();
        const purchase = Number(formValues.purchasePrice) || 0;
        const misc = Number(formValues.miscellaneousCost) || 0;
        const landing = purchase + misc;
        const gstRate = Number(formValues.gstRate) || 0;
        const finalPrice = Number(formValues.finalPrice) || 0;
        const profitAmount = Number(formValues.profitAmount) || 0;
        
        if (finalPrice > 0) {
            const preGstPrice = finalPrice / (1 + (gstRate / 100));
            const profit = preGstPrice - landing;
            const percent = landing > 0 ? (profit / landing) * 100 : 0;
            return {
                displayProfitAmount: profit,
                displayProfitPercentage: percent,
                displaySellingPrice: finalPrice
            };
        }
        
        const basePrice = landing + profitAmount;
        const sellingPrice = basePrice * (1 + (gstRate / 100));
        const percent = landing > 0 ? (profitAmount / landing) * 100 : 0;
        
        return {
            displayProfitAmount: profitAmount,
            displayProfitPercentage: percent,
            displaySellingPrice: sellingPrice
        };
    }, [
        watchedPurchasePrice,
        watchedMiscCost,
        watchedGstRate,
        watchedFinalPrice,
        watchedProfitAmount,
        getValues,
        isEditing // Re-calculate when switching modes
    ]);
  
  const dialogTitle = product ? (isEditing ? "Edit Product" : "View Product") : "Add New Product";
  const dialogDescription = product 
    ? `Update the details of this product.` 
    : "Fill in the form to add a new product to your catalog.";
    
  const formId = "product-form";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
            <div className="flex justify-between items-start pr-6">
                <div>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>{dialogDescription}</DialogDescription>
                </div>
                {product && !isEditing && (currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                )}
            </div>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            
            {isEditing && !product && (
               <div className="p-4 border rounded-md space-y-2 bg-muted/50">
                  <Label>Copy from Existing Product (Optional)</Label>
                  <Combobox
                      options={sortedAllProducts?.map(p => ({ value: p.id, label: p.name })) || []}
                      value={''}
                      onChange={(productId) => handleCopyProduct(productId)}
                      placeholder="Select a product to clone..."
                      searchPlaceholder="Search products..."
                      notFoundText="No product found."
                  />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? ( <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., Kookaburra Kahuna" {...field} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Product Name" value={getValues('name')} /> )}
              {isEditing ? ( <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger></FormControl><SelectContent>{sortedBrands?.map(brand => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Brand" value={sortedBrands?.find(b => b.id === getValues('brand'))?.name} /> )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? ( <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('subCategory', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{sortedCategories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Category" value={sortedCategories?.find(c => c.id === getValues('category'))?.name} /> )}
                {isEditing ? ( <FormField control={form.control} name="subCategory" render={({ field }) => ( <FormItem><FormLabel>Sub Category</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCategory || filteredSubCategories.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger></FormControl><SelectContent>{filteredSubCategories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Sub Category" value={mockSubCategories?.find(c => c.id === getValues('subCategory'))?.name} /> )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditing ? (<FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU</FormLabel><FormControl><div className="flex items-center gap-2"><Input placeholder="Auto-generated or manual" {...field} /><Button type="button" variant="ghost" size="icon" onClick={generateSku}><RefreshCw className="h-4 w-4" /></Button></div></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="SKU" value={getValues('sku')} /> )}
                {isEditing ? ( <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number (Optional)</FormLabel><FormControl><Input placeholder="Product serial number" {...field} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Serial Number" value={getValues('serialNumber')} /> )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isEditing ? ( <FormField control={form.control} name="handPreference" render={({ field }) => ( <FormItem><FormLabel>Hand Preference</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select hand preference" /></SelectTrigger></FormControl><SelectContent>{sortedHandPreferences?.map(hp => <SelectItem key={hp.id} value={hp.name}>{hp.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Hand Preference" value={getValues('handPreference')} /> )}
                {isEditing ? ( <FormField control={form.control} name="color1" render={({ field }) => ( <FormItem><FormLabel>Color 1</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a color" /></SelectTrigger></FormControl><SelectContent>{sortedColors?.map(color => <SelectItem key={color.id} value={color.name}>{color.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Color 1" value={getValues('color1')} /> )}
                {isEditing ? ( <FormField control={form.control} name="color2" render={({ field }) => ( <FormItem><FormLabel>Color 2</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a color" /></SelectTrigger></FormControl><SelectContent>{sortedColors?.map(color => <SelectItem key={color.id} value={color.name}>{color.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Color 2" value={getValues('color2')} /> )}
            </div>
            
            {isEditing ? ( <FormField control={form.control} name="vendorId" render={({ field }) => ( <FormItem><FormLabel>Vendor</FormLabel><Combobox options={sortedVendors?.map(v => ({ value: v.id, label: v.name })) || []} value={field.value} onChange={field.onChange} placeholder="Select a vendor..." searchPlaceholder="Search vendors..." notFoundText="No vendor found." /><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Vendor" value={sortedVendors?.find(v => v.id === getValues('vendorId'))?.name} /> )}
            
            <Separator />
            
            <div className="space-y-4">
                 <h3 className="text-base font-semibold text-foreground">Pricing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isEditing ? ( <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem><FormLabel>Purchase Price</FormLabel><FormControl><Input type="number" placeholder="0" {...field} disabled={watchedIsBundle} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Purchase Price" value={`₹${getValues('purchasePrice')?.toLocaleString('en-IN')}`} /> )}
                    {isEditing ? ( <FormField control={form.control} name="miscellaneousCost" render={({ field }) => ( <FormItem><FormLabel>Misc. Cost</FormLabel><FormControl><Input type="number" placeholder="0" {...field} disabled={watchedIsBundle} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Misc. Cost" value={`₹${getValues('miscellaneousCost')?.toLocaleString('en-IN')}`} /> )}
                    <ReadOnlyField label="Landing Price" value={`₹${landingPrice.toLocaleString('en-IN')}`} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isEditing ? ( <FormField control={form.control} name="profitPercentage" render={({ field }) => ( <FormItem><FormLabel>Profit Margin (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 25" {...field} onChange={handleProfitPercentageChange} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Profit Margin (%)" value={`${displayProfitPercentage.toFixed(2)}%`} /> )}
                    {isEditing ? ( <FormField control={form.control} name="profitAmount" render={({ field }) => ( <FormItem><FormLabel>Profit Margin (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} onChange={handleProfitAmountChange} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Profit Margin (₹)" value={`₹${displayProfitAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} /> )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label="Selling Price (Auto)" value={`₹${displaySellingPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
                    {isEditing ? ( <FormField control={form.control} name="finalPrice" render={({ field }) => ( <FormItem><FormLabel>Final Price (Manual Override)</FormLabel><FormControl><Input type="number" placeholder="e.g., 7999" {...field} onChange={handleFinalPriceChange} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Final Price (Override)" value={getValues('finalPrice') ? `₹${getValues('finalPrice')?.toLocaleString('en-IN')}` : 'N/A'} /> )}
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">Tax & Other Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isEditing ? ( <FormField control={form.control} name="hsnCode" render={({ field }) => ( <FormItem><FormLabel>HSN Code</FormLabel><FormControl><Input placeholder="Auto-fills from category" {...field} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="HSN Code" value={getValues('hsnCode')} /> )}
                    {isEditing ? ( <FormField control={form.control} name="gstRate" render={({ field }) => ( <FormItem><FormLabel>GST Rate (%)</FormLabel><FormControl><Input type="number" placeholder="Auto-fills from category" {...field} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="GST Rate (%)" value={`${getValues('gstRate') || 0}%`} /> )}
                </div>
                {isEditing ? ( <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Describe the product..." {...field} /></FormControl><FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Description" value={getValues('description')} /> )}
                {isEditing ? ( <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem><FormLabel>Image</FormLabel><div className="flex items-center gap-2"><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Browse</Button></div>{isUploading && <Progress value={uploadProgress} className="w-[60%]" />} {watchedImageUrl && <div className="p-2 border rounded-md w-24 h-24 mt-2"><Image src={watchedImageUrl} alt="Preview" width={80} height={80} className="object-contain w-full h-full" /></div>}<FormMessage /></FormItem> )}/> ) : ( <ReadOnlyField label="Image"> {getValues('imageUrl') ? <Image src={getValues('imageUrl')!} alt="Product image" width={80} height={80} className="object-contain" /> : 'N/A' } </ReadOnlyField> )}
            </div>
            
             <Separator />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {isEditing ? ( <FormField control={form.control} name="isActive" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>Inactive products won't appear in sales.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )}/> ) : ( <ReadOnlyField label="Status"> <Badge variant={getValues('isActive') ? 'default' : 'secondary'}>{getValues('isActive') ? 'Active' : 'Inactive'}</Badge> </ReadOnlyField> )}
                 {isEditing ? ( <FormField control={form.control} name="isBundle" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Bundle Product</FormLabel><FormDescription>A product made of other products.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )}/> ) : ( <ReadOnlyField label="Is Bundle?" value={getValues('isBundle') ? 'Yes' : 'No'} /> )}
             </div>

            {watchedIsBundle && (
                 <div className="space-y-4 p-4 border rounded-md">
                     <h4 className="font-medium text-foreground">Bundle Items</h4>
                     {isEditing && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Combobox options={bundleProducts.map(p => ({ value: p.id, label: p.name }))} value={""} onChange={handleCopyBundle} placeholder="Copy from existing bundle" searchPlaceholder="Search bundles..." notFoundText="No bundles found."/>
                            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <Search className="mr-2 h-4 w-4" />
                                        Add component product...
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search product..." />
                                        <CommandList>
                                            <CommandEmpty>No products found.</CommandEmpty>
                                            <CommandGroup>
                                                {sortedAllProducts?.map(product => (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={`${product.name} ${product.sku}`}
                                                        onSelect={() => {
                                                            setProductToAdd(product);
                                                            setProductSearchOpen(false);
                                                        }}
                                                    >
                                                        {product.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                         </div>
                     )}
                     <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 p-2 rounded-md bg-muted">
                                <div className="flex-1 font-medium">{field.productName}</div>
                                <div className="text-sm text-muted-foreground">{field.categoryName}</div>
                                {isEditing ? (
                                    <FormField control={form.control} name={`bundleItems.${index}.quantity`} render={({ field }) => (
                                        <FormItem className="flex items-center gap-2">
                                            <FormLabel className="text-sm">Qty:</FormLabel>
                                            <FormControl><Input type="number" {...field} className="h-8 w-16" /></FormControl>
                                        </FormItem>
                                    )} />
                                ) : (
                                    <p className="text-sm">Qty: {field.quantity}</p>
                                )}
                                {isEditing && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            </div>
                        ))}
                     </div>
                 </div>
             )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              {isEditing && <Button type="submit" form={formId}>Save Product</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
