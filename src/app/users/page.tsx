'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullPageLoader } from '@/components/full-page-loader';

/**
 * Redirects to Settings -> Team Management tab to consolidate user UX.
 */
export default function UsersRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/settings');
    }, [router]);

    return <FullPageLoader />;
}