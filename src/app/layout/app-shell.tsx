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
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const { currentUser, isLoading } = useCurrentUser();
    const pathname = usePathname();
    const router = useRouter();
    const { state: sidebarState, toggleSidebar } = useSidebar();

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isPublicPage = pathname === '/add-customer';

    useEffect(() => {
        if (!isLoading) {
            if (!currentUser && !isAuthPage && !isPublicPage) {
                router.push('/login');
            } else if (currentUser && isAuthPage) {
                router.push('/');
            }
        }
    }, [currentUser, isLoading, isAuthPage, isPublicPage, router]);

    if (isLoading) return <FullPageLoader />;
    if (isAuthPage || isPublicPage) return <>{children}</>;
    if (!currentUser) return <FullPageLoader />;
    if (!currentUser.isApproved && pathname !== '/make-admin') return <PendingApproval />;

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar />
            <div className={cn(
                "flex flex-col sm:gap-4 sm:py-4 transition-[padding-left] duration-200", 
                sidebarState === 'expanded' ? 'sm:pl-64' : 'sm:pl-14'
                )}>
                <Header onToggleSidebar={toggleSidebar} />
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
