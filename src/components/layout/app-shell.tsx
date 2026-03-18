'use client';

import { Sidebar } from './sidebar';
import { Header } from '@/components/layout/header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePathname, useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/full-page-loader';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { PendingApproval } from '@/components/layout/pending-approval';
import { useEffect } from 'react';

/**
 * The AppShell is the primary layout wrapper for the application.
 * Updated for strict mobile viewport constraints.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const { currentUser, isLoading } = useCurrentUser();
    const pathname = usePathname();
    const router = useRouter();
    const { state: sidebarState, isMobile } = useSidebar();

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isPublicPage = pathname === '/add-customer';
    
    // stands-alone document routes
    const isDocumentPage = pathname.startsWith('/invoice/') || 
                           pathname.startsWith('/purchase-order/') || 
                           pathname.startsWith('/quotation/') || 
                           pathname.startsWith('/return-slip/');

    useEffect(() => {
        if (!isLoading) {
            // Document pages are accessible if logged in, but don't redirect to login if not (let the page handle it)
            if (!currentUser && !isAuthPage && !isPublicPage && !isDocumentPage) {
                router.push('/login');
            } else if (currentUser && isAuthPage) {
                router.push('/');
            }
        }
    }, [currentUser, isLoading, isAuthPage, isPublicPage, isDocumentPage, router]);

    if (isLoading) return <FullPageLoader />;
    
    //Standalone pages
    if (isAuthPage || isPublicPage || isDocumentPage) return <>{children}</>;
    
    if (!currentUser) return <FullPageLoader />;
    if (!currentUser.isApproved && pathname !== '/make-admin') return <PendingApproval />;

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 overflow-x-hidden">
            <Sidebar />
            <div className={cn(
                "flex flex-col sm:gap-4 sm:py-4 transition-[padding-left] duration-200 min-w-0 max-w-full flex-1", 
                !isMobile && (sidebarState === 'expanded' ? 'sm:pl-64' : 'sm:pl-14')
                )}>
                <Header onToggleSidebar={() => {}} />
                <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 min-w-0 w-full overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
