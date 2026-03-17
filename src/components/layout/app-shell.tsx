'use client';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { FullPageLoader } from '../full-page-loader';
import { useEffect } from 'react';
import { useSidebar } from '../ui/sidebar';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const { state: sidebarState, toggleSidebar } = useSidebar();

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isPublicPage = pathname === '/add-customer';

    useEffect(() => {
        // This effect handles redirection after the auth state is resolved.
        if (!isUserLoading) {
            if (user && isAuthPage) {
                // If user is logged in and tries to access an auth page, redirect to dashboard.
                router.push('/');
            } else if (!user && !isAuthPage && !isPublicPage) {
                // If user is not logged in and on a protected page, redirect to login.
                router.push('/login');
            }
        }
    }, [user, isUserLoading, isAuthPage, isPublicPage, router, pathname]);

    // While loading auth state, show a loader.
    if (isUserLoading) {
        return <FullPageLoader />;
    }

    // If user is not logged in AND is trying to access a protected page,
    // the useEffect above will trigger a redirect. In the meantime, show a loader.
    if (!user && !isAuthPage && !isPublicPage) {
        return <FullPageLoader />;
    }
    
    // For auth pages (Login, Signup) or other public pages that don't need the sidebar/header,
    // just render the page content directly.
    if (isAuthPage || isPublicPage) {
        return <>{children}</>;
    }

    // If we have a user and are on a protected page, render the full application shell.
    if(user) {
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

    // Fallback loader while redirecting or for edge cases.
    return <FullPageLoader />;
}
