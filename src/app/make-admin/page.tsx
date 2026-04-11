'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, ServerCrash, ShieldAlert, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { signOut, getIdTokenResult } from "firebase/auth";
import { FullPageLoader } from '@/components/full-page-loader';
import { setAdminClaim } from '@/app/actions/admin';

export default function MakeAdminPage() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminRoleClaimed, setAdminRoleClaimed] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!authUser || !auth || !firestore) {
        if (!isAuthLoading) setIsLoading(false);
        return;
    }

    setIsLoading(true);

    try {
        // 1. Check for custom admin claim on the token
        const idTokenResult = await getIdTokenResult(authUser);
        const userIsAdmin = idTokenResult.claims.admin === true;
        setIsAdmin(userIsAdmin);

        // 2. Check if the admin role has ever been claimed in the system
        const adminInitDocRef = doc(firestore, '_init', 'admin');
        const docSnap = await getDoc(adminInitDocRef);
        setAdminRoleClaimed(docSnap.exists() && docSnap.data().claimed === true);
    } catch (error) {
        console.error("Error verifying admin status:", error);
        toast({
            title: "Error",
            description: "Could not verify admin status. Please try again.",
            variant: "destructive"
        });
        // Fail safe to prevent claim attempts on error
        setIsAdmin(false);
        setAdminRoleClaimed(true);
    } finally {
        setIsLoading(false);
    }
  }, [authUser, auth, firestore, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading) {
      checkAdminStatus();
    }
  }, [isAuthLoading, checkAdminStatus]);

  const handleClaimAdmin = async () => {
    // Logic Gap Fix: Ensure user is logged in
    if (!authUser || !firestore || !auth) {
        toast({ title: "Auth Error", description: "You must be logged in to claim this role.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    const adminInitDocRef = doc(firestore, '_init', 'admin');
    const userDocRef = doc(firestore, 'users', authUser.uid);
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const adminInitDoc = await transaction.get(adminInitDocRef);
        if (adminInitDoc.exists() && adminInitDoc.data().claimed) {
          throw new Error("The admin role has already been claimed by another user.");
        }
        transaction.set(adminInitDocRef, { claimed: true, claimedBy: authUser.uid, claimedAt: serverTimestamp() });
        transaction.update(userDocRef, { role: 'admin', isApproved: true });
      });
      
      // Logic Gap Fix: Await the server action correctly
      const claimResult = await setAdminClaim(authUser.uid);
      if (!claimResult || !claimResult.success) {
          throw new Error(claimResult?.error || "Failed to set custom admin claim.");
      }

      toast({
        title: "Success! You are now an administrator.",
        description: "Logging out to refresh your security session. Please log back in.",
      });

      // Logic Gap Fix: Force logout to refresh the user's JWT token
      await signOut(auth);
      router.push('/login');

    } catch (error: any) {
      console.error("Failed to claim admin role:", error);
      toast({
        title: "Claim Failed",
        description: error.message || "An error occurred. The admin role may have already been claimed.",
        variant: "destructive",
      });
      setAdminRoleClaimed(true); // Update state to reflect claim attempt
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <FullPageLoader />;
    }
     if (!authUser) {
      router.push('/login');
      return <FullPageLoader />;
    }

    if (isAdmin) {
         return (
            <div className="flex flex-col items-center gap-2 text-center">
                <UserCheck className="h-10 w-10 text-green-500" />
                <h3 className="font-semibold">You are an Administrator</h3>
                <p className="text-sm text-muted-foreground">You already have full administrative privileges.</p>
                <Button onClick={() => router.push('/settings')} className="mt-4">Go to Settings</Button>
            </div>
        );
    }
    
    if (adminRoleClaimed) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h3 className="font-semibold">Administrator Role Claimed</h3>
            <p className="text-sm text-muted-foreground">The primary administrator role for this application has already been assigned.</p>
            <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
        </div>
      );
    }
    
    if (adminRoleClaimed === false) {
       return (
        <div className="flex flex-col items-center gap-4 text-center">
            <ShieldAlert className="h-10 w-10 text-primary" />
            <h3 className="font-semibold">Claim Administrator Role</h3>
            <p className="text-sm text-muted-foreground">You are the first user. Click the button below to become the primary administrator for this application. This action can only be performed once.</p>
            <Button onClick={handleClaimAdmin} disabled={isProcessing} className="mt-2">
                {isProcessing ? 'Claiming...' : 'Claim Admin Role & Log Out'}
            </Button>
        </div>
       );
    }

    return (
        <div className="flex flex-col items-center gap-2 text-center text-destructive">
            <ServerCrash className="h-10 w-10" />
            <h3 className="font-semibold">Verification Failed</h3>
            <p className="text-sm">Could not verify admin status. Please check your Firestore security rules for the `_init` collection.</p>
        </div>
    );
  };
  
  return (
    <>
      <PageHeader title="Setup Administrator" />
      <div className="flex justify-center items-start py-8">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>First Time Setup</CardTitle>
                <CardDescription>Finalize the application setup by claiming the admin role.</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
                {renderContent()}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
