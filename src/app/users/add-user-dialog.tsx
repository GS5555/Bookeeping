
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, serverTimestamp, doc, addDoc } from "firebase/firestore";
import { useState } from "react";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["admin", "editor", "viewer", "data-entry"]),
  isApproved: z.boolean().default(true),
});

type AddUserFormValues = z.infer<typeof formSchema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "viewer",
      isApproved: true,
    },
  });

  const onSubmit = async (data: AddUserFormValues) => {
    setIsLoading(true);
    if (!firestore) {
        toast({ title: "Error", description: "Firestore is not available.", variant: "destructive" });
        setIsLoading(false);
        return;
    };

    // NOTE: This approach has a major limitation for a real app.
    // It creates a user profile in Firestore, but it does NOT create an
    // actual Firebase Authentication user. The created user will NOT be able to log in.
    // A secure backend environment (like a Cloud Function) is required to use the
    // Firebase Admin SDK to create users programmatically.
    // This is a simulation for the prototype.
    try {
        const usersCollectionRef = collection(firestore, "users");
        
        await addDoc(usersCollectionRef, {
            email: data.email,
            displayName: `${data.firstName} ${data.lastName}`,
            photoURL: null,
            role: data.role,
            isApproved: data.isApproved,
            createdAt: serverTimestamp(),
            lastLoginAt: null,
        });

        toast({
            title: "User Profile Created (Simulation)",
            description: `A profile for ${data.email} has been added. NOTE: Login is not enabled for users created this way.`,
        });

        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
            title: "Error",
            description: error.message || "Could not create user profile.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user profile. Note: This simulates profile creation in Firestore only.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>
                 <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormDescription>This is a simulated action. The password is not stored.</FormDescription><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="data-entry">Data Entry</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isApproved" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5"><FormLabel>Approved</FormLabel><FormDescription>Allow this user to log in immediately.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
