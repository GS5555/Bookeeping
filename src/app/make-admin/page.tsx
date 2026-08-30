'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { doc, getDoc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ShieldCheck, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
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
        // toast({ title: "Error", description: "Could not verify admin status.", variant: "destructive" });
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

  const handleClaimAdmin = async (forceOverwrite = false) => {
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
        if (adminInitDoc.exists() && adminInitDoc.data().claimed && !forceOverwrite) {
          throw new Error("The admin role has already been claimed.");
        }
        transaction.set(adminInitDocRef, { claimed: true, claimedBy: authUser.uid, claimedAt: serverTimestamp() }, { merge: true });
        transaction.update(userDocRef, { role: 'admin', isApproved: true });
      });
      
      const claimResult = await setAdminClaim(authUser.uid);
      if (!claimResult || !claimResult.success) {
          throw new Error(claimResult?.error || "Failed to set custom admin claim.");
      }

      toast({ title: "Success! Admin role claimed.", description: "Logging out to refresh your session." });
      await signOut(auth);
      router.push('/login');

    } catch (error: any) {
      console.error("Failed to claim admin role:", error);
      toast({ title: "Claim Failed", description: error.message || "An error occurred.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmergencyReset = async () => {
      if (!firestore) return;
      try {
          setIsProcessing(true);
          const adminInitDocRef = doc(firestore, '_init', 'admin');
          await deleteDoc(adminInitDocRef);
          setAdminRoleClaimed(false);
          toast({ title: "Emergency Reset Success", description: "Initial claim lock removed." });
      } catch (e) {
          toast({ title: "Reset Failed", variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  }

  if (isLoading) return <FullPageLoader />;
  if (!authUser) { router.push('/login'); return <FullPageLoader />; }

  return (
    <>
      <PageHeader title="Setup Administrator" />
      <div className="flex flex-col items-center py-8 gap-8">
        <Card className="w-full max-w-md shadow-xl border-2">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-black uppercase">Admin Setup</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Finalize application security access.</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
                {isAdmin ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <UserCheck className="h-16 w-16 text-green-500 mb-2" />
                        <h3 className="font-black uppercase text-xl">Access Granted</h3>
                        <p className="text-sm text-muted-foreground">You are already an Administrator.</p>
                        <Button onClick={() => router.push('/settings')} className="mt-6 font-black uppercase tracking-widest">Go to Settings</Button>
                    </div>
                ) : adminRoleClaimed ? (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <ShieldCheck className="h-16 w-16 text-primary mb-2" />
                        <h3 className="font-black uppercase text-xl">Role Claimed</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">An administrator has already been designated for this store system.</p>
                        
                        <div className="w-full pt-6 border-t mt-4">
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-4">Account Recovery Tools</p>
                            <Button variant="outline" onClick={handleEmergencyReset} disabled={isProcessing} className="w-full text-destructive hover:bg-destructive/5 border-destructive/20 font-black uppercase text-[10px] tracking-widest">
                                <AlertTriangle className="mr-2 h-3 w-3" />
                                Emergency Reset
                            </Button>
                            <p className="text-[8px] text-muted-foreground mt-2 italic">Use this if you forgot your original admin email.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <ShieldAlert className="h-16 w-16 text-orange-500 mb-2" />
                        <div className="space-y-2">
                            <h3 className="font-black uppercase text-xl">Claim Admin Role</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">You are currently a generic user. Click below to take full control of the store modules.</p>
                        </div>
                        <Button onClick={() => handleClaimAdmin()} disabled={isProcessing} className="w-full h-12 text-base font-black uppercase tracking-widest shadow-lg">
                            {isProcessing ? 'Claiming...' : 'Designate me as Admin'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}