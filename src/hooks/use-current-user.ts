
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface AppUser {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    isApproved: boolean;
}

interface UseCurrentUserResult {
    currentUser: AppUser | null;
    isLoading: boolean;
    error: Error | null;
}

/**
 * A hook to get the full profile of the currently logged-in user from Firestore.
 * This serves as the single source of truth for the user's role and approval status.
 * @returns An object containing the user's profile data, loading state, and any errors.
 */
export function useCurrentUser(): UseCurrentUserResult {
    const { user: authUser, isUserLoading: isAuthLoading, userError: authError } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return doc(firestore, 'users', authUser.uid);
    }, [firestore, authUser]);

    const { data: currentUserData, isLoading: isDocLoading, error: docError } = useDoc<AppUser>(userDocRef);

    const isLoading = isAuthLoading || (!!authUser && !docError && currentUserData === undefined);


    return {
        currentUser: currentUserData,
        isLoading,
        error: authError || docError,
    };
}
