'use client';
import Link from 'next/link';
import {
  Bot,
  Building,
  ClipboardList,
  Home,
  LineChart,
  Package,
  PanelLeft,
  Scale,
  Settings,
  ShoppingCart,
  Ticket,
  Truck,
  Users2,
  Wallet,
  Wrench,
  UserPlus,
  FileText,
  HelpCircle,
  Notebook,
  Calendar,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useSidebar } from '../ui/sidebar';
import { ScrollArea } from '../ui/scroll-area';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Company } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

export const navItems = [
  { href: '/', icon: Home, label: 'Dashboard', roles: ['admin', 'editor', 'viewer', 'data-entry'] },
  { href: '/sales', icon: ShoppingCart, label: 'Sales', roles: ['admin', 'editor'] },
  { href: '/enquiries', icon: HelpCircle, label: 'Enquiries', roles: ['admin', 'editor'] },
  { href: '/quotations', icon: FileText, label: 'Quotations', roles: ['admin', 'editor'] },
  { href: '/inventory', icon: ClipboardList, label: 'Inventory', roles: ['admin', 'editor'] },
  { href: '/products', icon: Package, label: 'Products', roles: ['admin', 'editor'] },
  { href: '/purchases', icon: Truck, label: 'Purchases', roles: ['admin', 'editor'] },
  { href: '/repairs', icon: Wrench, label: 'Repairs', roles: ['admin', 'editor'] },
  { href: '/customers', icon: UserPlus, label: 'Customers', roles: ['admin', 'editor', 'data-entry'] },
  { href: '/vendors', icon: Building, label: 'Vendors', roles: ['admin', 'editor'] },
  { href: '/expenses', icon: Wallet, label: 'Expenses', roles: ['admin', 'editor'] },
  { href: '/notes', icon: Notebook, label: 'Notes', roles: ['admin', 'editor', 'viewer', 'data-entry'] },
  { href: '/planner', icon: Calendar, label: 'Planner', roles: ['admin', 'editor', 'viewer', 'data-entry'] },
  { href: '/reports', icon: LineChart, label: 'Reports', roles: ['admin', 'viewer'] },
  { href: '/accounting', icon: Scale, label: 'Accounting', roles: ['admin', 'viewer'] },
  { href: '/support', icon: Ticket, label: 'Support', roles: ['admin', 'editor'] },
  { href: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { href: '/ai-insights', icon: Bot, label: 'Gemini Chat', roles: ['admin', 'editor'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { currentUser } = useCurrentUser();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const isExpanded = sidebarState === 'expanded';

  const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
  const { data: companyDetails, isLoading: isCompanyLoading } = useDoc<Company>(companyDocRef);

  const accessibleNavItems = navItems.filter(item => 
    currentUser?.role && item.roles.includes(currentUser.role)
  );
  
  const CompanyLogo = () => {
    if (isCompanyLoading) {
      return (
        <div className="flex h-9 items-center gap-2 px-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          {isExpanded && <Skeleton className="h-4 w-32" />}
        </div>
      );
    }

    if (!companyDetails) {
        return <div className="h-9 w-9" />;
    }
    
    const showLogo = companyDetails.displayLogo && companyDetails.logoUrl;
    const displayName = companyDetails.name || 'Store Manager';
    const initials = companyDetails.shortName || displayName.substring(0, 2).toUpperCase();

    return (
        <Link
            href="/"
            className={cn(
                "group flex h-12 items-center gap-3 transition-all duration-200",
                isExpanded ? "w-full self-start px-4" : "self-center justify-center w-10 shrink-0 rounded-full md:h-10 md:w-10"
            )}
        >
            {isExpanded ? (
                <div className='flex items-center gap-3 w-full min-w-0'>
                  {showLogo ? (
                     <div className="relative h-10 w-10 shrink-0">
                        <Image src={companyDetails.logoUrl!} alt={displayName} fill className="rounded-md object-contain" />
                     </div>
                  ) : (
                    <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs uppercase">{initials}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-sm font-bold text-foreground truncate uppercase tracking-tight leading-tight max-w-[160px]">
                    {displayName}
                  </span>
                </div>
            ) : (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center justify-center">
                            {showLogo ? (
                                <div className="relative h-8 w-8">
                                    <Image src={companyDetails.logoUrl!} alt={displayName} fill className="rounded-sm object-contain" />
                                </div>
                            ) : (
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs uppercase">{initials}</AvatarFallback>
                                </Avatar>
                            )}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-bold text-xs">{displayName}</TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
            )}
            <span className="sr-only">{displayName}</span>
        </Link>
    );
  }

  return (
    <aside className={cn(
        "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-[width] duration-200",
        isExpanded ? 'w-64' : 'w-14'
    )}>
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
         <CompanyLogo />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-9 w-9 md:h-8 md:w-8 transition-all", isExpanded && "self-start ml-2")}
                onClick={() => toggleSidebar()}
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle sidebar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
      <ScrollArea className="flex-1">
        <TooltipProvider>
            <nav className={cn("flex flex-col gap-1 px-2", isExpanded ? "items-stretch" : "items-center")}>
            {accessibleNavItems.map((item) => (
                <Tooltip key={item.href} delayDuration={isExpanded ? 100000 : 0}>
                <TooltipTrigger asChild>
                    <Link
                    href={item.href}
                    className={cn(
                        'flex h-10 items-center justify-start gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:text-foreground',
                        pathname === item.href && 'bg-accent text-accent-foreground',
                        isExpanded ? 'w-full' : 'w-10 justify-center'
                    )}
                    >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className={cn("truncate text-sm font-medium", !isExpanded && 'sr-only' )}>{item.label}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">{item.label}</TooltipContent>
                </Tooltip>
            ))}
            </nav>
        </TooltipProvider>
       </ScrollArea>
    </aside>
  );
}
