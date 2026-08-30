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
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut } from "firebase/auth";
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
            toast({ title: "Error", description: "Firebase is not initialized.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            const persistence = values.rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);

            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            // ADMIN OVERRIDE: Check if it is the master admin email
            const isAdminEmail = values.email.toLowerCase() === 'admin@example.com';

            const userDocRef = doc(firestore, "users", user.uid);
            let userDoc = await getDoc(userDocRef);

            // Self-healing: Create profile if missing but auth exists
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    id: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Master Admin',
                    photoURL: user.photoURL,
                    role: isAdminEmail ? 'admin' : 'viewer',
                    isApproved: isAdminEmail ? true : false,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                });
                userDoc = await getDoc(userDocRef);
            }

            const userData = userDoc.data();
            
            // Force approval for admin@example.com if it somehow got set to false
            if (isAdminEmail && (!userData?.isApproved || userData?.role !== 'admin')) {
                await updateDoc(userDocRef, { isApproved: true, role: 'admin' });
            }

            if (userData?.isApproved === false && !isAdminEmail) {
                await signOut(auth);
                toast({
                    title: "Access Denied",
                    description: "Your account is awaiting approval from a manager.",
                    variant: "destructive",
                });
            } else {
                await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
                toast({
                    title: "Login Successful",
                    description: `Welcome back, ${userData?.displayName || 'User'}!`,
                });
                router.push('/');
            }

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
        <Card className="mx-auto max-w-sm w-full shadow-lg border-2">
        <CardHeader className="text-center">
            <StumpBooksLogo className="mx-auto h-10 w-10 mb-2" />
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">System Access</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                Login with your store credentials.
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
                        <FormLabel className="text-[10px] font-bold uppercase">Email Address</FormLabel>
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
                            <FormLabel className="text-[10px] font-bold uppercase">Password</FormLabel>
                            <Link href="/forgot-password" disableTabFocus className="ml-auto text-[10px] font-bold underline uppercase tracking-tight text-muted-foreground hover:text-primary">
                                Forgot?
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
                                <FormLabel className="text-[10px] font-bold uppercase tracking-tight">
                                Stay logged in for 7 days
                                </FormLabel>
                            </div>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest shadow-md" disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Log In'}
                    </Button>
                </form>
            </Form>
            <div className="mt-8 text-center text-xs font-bold uppercase tracking-tight">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="underline text-primary">
                    Create Profile
                </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}
