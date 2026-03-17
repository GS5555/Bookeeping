'use client';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { StumpBooksLogo } from "@/components/icons";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email("Invalid email address."),
})

export default function ForgotPasswordPage() {
    const auth = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          email: "",
        },
    });
 
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, values.email);
            toast({
                title: "Password Reset Email Sent",
                description: "Please check your inbox for instructions to reset your password.",
            });
            setIsSent(true);
        } catch (error: any) {
            console.error("Forgot Password Error:", error);
            let description = "Could not send password reset email. Please try again.";
             if (error.code === 'auth/user-not-found') {
                description = "No user found with this email address.";
            }
            toast({
                title: "Error",
                description,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <StumpBooksLogo className="mx-auto h-8 w-8 mb-2" />
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
                {isSent 
                    ? "A reset link has been sent to your email."
                    : "Enter your email to receive a reset link"
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            {!isSent ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="manager@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </form>
                </Form>
            ) : (
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">If you don't see the email, please check your spam folder.</p>
                </div>
            )}
            <div className="mt-4 text-center text-sm">
                Remember your password?{" "}
                <Link href="/login" className="underline">
                    Sign in
                </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}
