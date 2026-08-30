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
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  rememberMe: z.boolean().default(false),
})

export function LoginPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          email: "",
          password: "",
          rememberMe: false,
        },
    })
 
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        if (!auth || !firestore) {
            toast({
                title: "Error",
                description: "Firebase is not initialized.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        try {
            const persistence = values.rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);

            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            const userDocRef = doc(firestore, "users", user.uid);
            let userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // AUTO-REPAIR: Create missing profile if Auth exists but Firestore is missing
                await setDoc(userDocRef, {
                    id: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'System User',
                    photoURL: user.photoURL,
                    role: 'viewer',
                    isApproved: false,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                });
                userDoc = await getDoc(userDocRef);
                toast({
                    title: "Profile Recovered",
                    description: "Your database profile was missing and has been automatically restored.",
                });
            }

            const userData = userDoc.data();
            await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
            
            toast({
                title: "Login Successful",
                description: `Welcome back, ${userData?.displayName || 'User'}!`,
            });
            
            router.push('/');

        } catch (error: any) {
            console.error("Login Error:", error);
            let description = "An unexpected error occurred. Please try again.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "Invalid email or password. Please check your credentials.";
            }
            toast({
                title: "Login Failed",
                description: description,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 w-full px-4">
        <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
            <StumpBooksLogo className="mx-auto h-8 w-8 mb-2" />
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
            Enter your email below to login to your account
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="name@example.com" {...field} />
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
                        <div className="flex items-center">
                            <FormLabel>Password</FormLabel>
                            <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                                Forgot your password?
                            </Link>
                        </div>
                        <div className="relative">
                            <FormControl>
                                <Input type={showPassword ? "text" : "password"} placeholder="password" {...field} />
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
                        name="rememberMe"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Remember me
                                </FormLabel>
                            </div>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>
            </Form>
            <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
                Sign up
            </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}
