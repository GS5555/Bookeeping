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
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp, getDocs, collection, query, limit } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  captcha: z.string().min(1, "CAPTCHA is required."),
});

export default function SignupPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [captcha, setCaptcha] = useState('');
    
    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptcha(result);
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
          password: "password",
          captcha: "",
        },
    });
 
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.captcha.toLowerCase() !== captcha.toLowerCase()) {
            toast({
                title: "Invalid CAPTCHA",
                description: "Please try the CAPTCHA again.",
                variant: "destructive",
            });
            generateCaptcha();
            form.setValue('captcha', '');
            return;
        }

        setIsLoading(true);
        if (!auth || !firestore) {
            toast({ title: "Error", description: "Firebase is not initialized.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            // Step 1: Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: `${values.firstName} ${values.lastName}`
            });

            // Step 2: Create user document in Firestore with default 'viewer' role and awaiting approval.
            const userDocRef = doc(firestore, "users", user.uid);
            await setDoc(userDocRef, {
                id: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'viewer', // All users start as viewers
                isApproved: false, // All new users must be approved by an admin
                createdAt: serverTimestamp(),
                lastLoginAt: null,
            });
            
            setIsSubmitted(true);
            toast({
                title: "Registration Submitted!",
                description: "Your account has been created and is awaiting admin approval.",
            });

        } catch (error: any) {
            console.error("Signup Error:", error);
            let description = "An unexpected error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please login instead.";
            }
            toast({ title: "Signup Failed", description, variant: "destructive" });
            generateCaptcha();
            form.setValue('captcha', '');
        } finally {
            setIsLoading(false);
        }
    }
    
  if (isSubmitted) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 py-12">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader className="text-center">
                    <StumpBooksLogo className="mx-auto h-8 w-8 mb-2" />
                    <CardTitle className="text-2xl">Registration Submitted</CardTitle>
                    <CardDescription>
                       Your account is awaiting approval from an administrator. You will be able to log in once it has been approved.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                     <div className="mt-4 text-center text-sm">
                        <Button asChild>
                            <Link href="/login">
                                Back to Login
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 py-12">
        <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <StumpBooksLogo className="mx-auto h-8 w-8 mb-2" />
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
                Your account will be created and will require admin approval.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>First name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Max" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Last name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Robinson" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
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
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                             <div className="relative">
                                <FormControl>
                                    <Input type={showPassword ? "text" : "password"} {...field} />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="captcha"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CAPTCHA</FormLabel>
                                <div className="flex items-center gap-2">
                                    <div className="px-4 py-2 rounded-md bg-muted font-mono tracking-widest select-none w-full text-center text-xl" style={{ textDecoration: 'line-through', fontStyle: 'italic' }}>
                                        {captcha}
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={generateCaptcha}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                <FormControl>
                                    <Input placeholder="Enter the text above" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                         {isLoading ? 'Creating Account...' : 'Create an account'}
                    </Button>
                </form>
             </Form>
            <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                    Sign in
                </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}
