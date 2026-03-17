import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@/components/analytics';
import { FirebaseClientProvider } from '@/firebase';
import { AppShell } from '@/app/layout/app-shell';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Cricket Store Manager',
  description: 'ERP for a cricket goods store',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            storageKey="cricket-store-theme"
            enableSystem={false}
            disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <SidebarProvider>
                <AppShell>{children}</AppShell>
            </SidebarProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
