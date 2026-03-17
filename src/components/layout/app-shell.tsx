
'use client';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePathname, useRouter } from 'next/navigation';
import { FullPageLoader } from '../full-page-loader';
import { useEffect } from 'react';
import { useSidebar } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { PendingApproval } from './pending-approval';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { currentUser, isLoading } = useCurrentUser();
    const pathname = usePathname();
    const router = useRouter();
    const { state: sidebarState, toggleSidebar } = useSidebar();

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isPublicPage = pathname === '/add-customer';

    useEffect(() => {
        if (!isLoading) {
            if (currentUser && isAuthPage) {
                router.push('/');
            } else if (!currentUser && !isAuthPage && !isPublicPage) {
                router.push('/login');
            }
        }
    }, [currentUser, isLoading, isAuthPage, isPublicPage, router]);

    if (isLoading) {
        return <FullPageLoader />;
    }

    if (isAuthPage || isPublicPage) {
        return <>{children}</>;
    }

    if (!currentUser) {
        return <FullPageLoader />;
    }
    
    if (!currentUser.isApproved && pathname !== '/make-admin') {
        return <PendingApproval />;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar />
            <div className={cn(
                "flex flex-col sm:gap-4 sm:py-4 transition-[padding-left] duration-200 min-w-0", 
                sidebarState === 'expanded' ? 'sm:pl-64' : 'sm:pl-14'
                )}>
                <Header onToggleSidebar={toggleSidebar} />
                <main className="flex-1 p-4 sm:px-6 sm:py-0 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
