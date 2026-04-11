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
        const idTokenResult = await getIdTokenResult(authUser);
        const userIsAdmin = idTokenResult.claims.admin === true;
        setIsAdmin(userIsAdmin);

        const adminInitDocRef = doc(firestore, '_init', 'admin');
        const docSnap = await getDoc(adminInitDocRef);
        setAdminRoleClaimed(docSnap.exists() && docSnap.data().claimed === true);
    } catch (error) {
        console.error("Error verifying admin status:", error);
        toast({ title: "Error", description: "Could not verify admin status.", variant: "destructive" });
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
      
      const claimResult = await setAdminClaim(authUser.uid);
      if (!claimResult || !claimResult.success) {
          throw new Error(claimResult?.error || "Failed to set custom admin claim.");
      }

      toast({ title: "Success! You are now an administrator.", description: "Logging out to refresh your security session." });
      await signOut(auth);
      router.push('/login');

    } catch (error: any) {
      console.error("Failed to claim admin role:", error);
      toast({ title: "Claim Failed", description: error.message || "An error occurred.", variant: "destructive" });
      setAdminRoleClaimed(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <FullPageLoader />;
  if (!authUser) { router.push('/login'); return <FullPageLoader />; }

  return (
    <>
      <PageHeader title="Setup Administrator" />
      <div className="flex justify-center items-start py-8">
        <Card className="w-full max-w-md">
            <CardHeader><CardTitle>First Time Setup</CardTitle><CardDescription>Finalize application setup.</CardDescription></CardHeader>
            <CardContent className="py-8">
                {isAdmin ? (
                    <div className="flex flex-col items-center gap-2 text-center"><UserCheck className="h-10 w-10 text-green-500" /><h3 className="font-semibold">You are an Administrator</h3><Button onClick={() => router.push('/settings')} className="mt-4">Go to Settings</Button></div>
                ) : adminRoleClaimed ? (
                    <div className="flex flex-col items-center gap-2 text-center"><ShieldCheck className="h-10 w-10 text-primary" /><h3 className="font-semibold">Administrator Role Claimed</h3><Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button></div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-center"><ShieldAlert className="h-10 w-10 text-primary" /><h3 className="font-semibold">Claim Administrator Role</h3><p className="text-sm text-muted-foreground">You are the first user. Click the button below to become the primary administrator.</p><Button onClick={handleClaimAdmin} disabled={isProcessing}>{isProcessing ? 'Claiming...' : 'Claim Admin Role & Log Out'}</Button></div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
