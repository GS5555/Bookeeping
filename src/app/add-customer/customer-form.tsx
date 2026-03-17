
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { addPendingCustomer } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { indianStates } from "@/lib/mock-data";
import { Textarea } from "@/components/ui/textarea";


const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  companyName: z.string().optional(),
  phone: z.string().min(10, 'Please enter a valid 10-digit phone number.'),
  email: z.string().email('Please enter a valid email address.'),
  street: z.string().min(3, 'Street address is required.'),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  zip: z.string().min(5, 'ZIP code is required.'),
  purpose: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

export function CustomerForm({ setIsSubmitted }: { setIsSubmitted: (value: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      companyName: "",
      phone: "",
      email: "",
      street: "",
      city: "",
      state: "Maharashtra",
      zip: "",
      purpose: "",
    },
  });

  async function onSubmit(data: CustomerFormValues) {
    setIsLoading(true);
    try {
      const result = await addPendingCustomer(data);
      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: "Registration Submitted",
          description: "Your information has been sent for approval.",
        });
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("Customer registration error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Rohan Sharma" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                    <Input type="tel" placeholder="e.g., 9876543210" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                    <Input type="email" placeholder="e.g., rohan@example.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Cricket Lane" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="state" render={({ field }) => ( <FormItem><FormLabel>State</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger></FormControl><SelectContent>{indianStates.map(state => (<SelectItem key={state} value={state}>{state}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="zip" render={({ field }) => ( <FormItem><FormLabel>ZIP / Postal Code</FormLabel><FormControl><Input placeholder="e.g., 400001" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Visit (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Bat purchase, viewing new gloves..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Registration'}
        </Button>
      </form>
    </Form>
  );
}
