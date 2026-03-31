
'use client';
import React from 'react';
import {
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { UserNav } from './user-nav';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { navItems } from './sidebar';
import { ScrollArea } from '../ui/scroll-area';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Company } from '@/lib/types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import Image from 'next/image';
import { useSidebar } from '../ui/sidebar';

interface HeaderProps {
    onToggleSidebar: () => void;
}

const MobileCompanyLogo = () => {
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

    if (isCompanyLoading || !companyDetails) {
        return (
             <div className="flex items-center gap-2 text-lg font-semibold">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>CS</AvatarFallback>
                </Avatar>
                <span>Cricket Store</span>
            </div>
        );
    }
    
    const showLogo = companyDetails.displayLogo && companyDetails.logoUrl;

    return (
         <Link href="/" className="flex items-center gap-2 text-lg font-semibold max-w-[85%]">
            {showLogo ? (
                <Image src={companyDetails.logoUrl!} alt={companyDetails.name} width={32} height={32} className="rounded-sm object-contain shrink-0" />
            ) : (
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">{companyDetails.shortName || companyDetails.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <span className="truncate text-sm font-black uppercase tracking-tighter leading-none pr-4">
                {companyDetails.name}
            </span>
        </Link>
    )
}

export function Header({ onToggleSidebar }: HeaderProps) {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(Boolean);
    const { openMobile, setOpenMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs flex flex-col p-0">
            <ScrollArea className="flex-1">
                 <nav className="grid gap-6 text-lg font-medium p-6">
                    <MobileCompanyLogo />
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground text-sm font-bold uppercase tracking-tight"
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    ))}
                </nav>
            </ScrollArea>
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleSidebar}
        className="hidden sm:inline-flex"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
             <React.Fragment key={segment}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    {index < pathSegments.length - 1 ? (
                        <BreadcrumbLink asChild>
                            <Link href={`/${pathSegments.slice(0, index + 1).join('/')}`}>
                                {segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')}
                            </Link>
                        </BreadcrumbLink>
                    ) : (
                        <BreadcrumbPage>
                             {segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')}
                        </BreadcrumbPage>
                    )}
                </BreadcrumbItem>
             </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="relative ml-auto flex items-center gap-2 md:grow-0">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
