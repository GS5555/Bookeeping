'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export function PendingApproval() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
        }
        router.push('/login');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4 text-2xl">Account Pending Approval</CardTitle>
                    <CardDescription>
                        Your account has been registered but is currently awaiting approval from a site administrator.
                        You will be able to access the application once your account is approved.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
