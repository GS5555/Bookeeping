'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Company } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { RefreshCw, Save, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Company name is required."),
  shortName: z.string().min(1, "Short name is required.").max(10),
  address: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  email: z.string().email().or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  displayLogo: z.boolean().default(true),
  invoicePrefix: z.string().optional().default("INV"),
  invoiceTerms: z.string().optional().default(""),
  poTerms: z.string().optional().default(""),
});

export function CompanySettingsForm() {
  const firestore = useFirestore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyDocRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, 
  [firestore]);
  
  const { data: company, isLoading } = useDoc<Company>(companyDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", shortName: "", address: "", gstin: "", email: "", phone: "",
      logoUrl: "", displayLogo: true, invoicePrefix: "INV", invoiceTerms: "", poTerms: ""
    }
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        shortName: company.shortName || "",
        address: company.address || "",
        gstin: company.gstin || "",
        email: company.email || "",
        phone: company.phone || "",
        logoUrl: company.logoUrl || "",
        displayLogo: company.displayLogo ?? true,
        invoicePrefix: company.invoicePrefix || "INV",
        invoiceTerms: company.invoiceTerms || "",
        poTerms: company.poTerms || "", 
      });
    }
  }, [company, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `company/logo-${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      form.setValue('logoUrl', url, { shouldDirty: true });
      toast({ title: "Logo Uploaded", description: "The new company logo has been set." });
    } catch (error) {
      console.error(error);
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'settings', 'global', 'companies', 'main_company');
      await setDoc(docRef, { ...values, id: 'main_company' }, { merge: true });
      toast({ title: "Profile Updated", description: "Company settings have been saved successfully." });
    } catch (error) {
      console.error(error);
      toast({ title: "Save Failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse font-black uppercase tracking-widest text-muted-foreground">Loading Profile...</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Company Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="shortName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Short Name / Initials</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. CS" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Business Address</FormLabel>
                <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">GSTIN</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contact Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center gap-4 bg-muted/10">
              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Brand Logo</FormLabel>
              <div className="relative h-32 w-32 border bg-background rounded-lg overflow-hidden group">
                {form.watch('logoUrl') ? (
                  <Image src={form.watch('logoUrl')} alt="Logo" fill className="object-contain p-2" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-bold uppercase text-center p-4">No Logo<br/>Uploaded</div>
                )}
                {isUploading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><RefreshCw className="animate-spin text-primary" /></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full font-black uppercase tracking-widest text-[10px]" disabled={isUploading}>
                <Upload className="mr-2 h-3 w-3" /> {isUploading ? 'Uploading...' : 'Change Logo'}
              </Button>
            </div>
            
            <FormField control={form.control} name="invoicePrefix" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Invoice Prefix</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription className="text-[10px]">e.g. INV, BILL, or CS</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField control={form.control} name="invoiceTerms" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Invoice Terms & Conditions</FormLabel>
              <FormControl><Textarea {...field} className="min-h-[150px] text-xs font-mono" /></FormControl>
              <FormDescription className="text-[10px]">One condition per line.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="poTerms" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Purchase Order Terms</FormLabel>
              <FormControl><Textarea {...field} className="min-h-[150px] text-xs font-mono" /></FormControl>
              <FormDescription className="text-[10px]">One condition per line.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest shadow-lg">
          <Save className="mr-2 h-4 w-4" /> Save Company Profile
        </Button>
      </form>
    </Form>
  );
}
