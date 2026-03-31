
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
  PercentSquare,
  Scale,
  Settings,
  ShoppingCart,
  Ticket,
  Truck,
  Users2,
  Wallet,
  Wrench,
  ShieldCheck,
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
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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

    return (
        <Link
            href="/"
            className={cn(
                "group flex h-9 items-center gap-2 font-semibold text-primary-foreground transition-all duration-200",
                isExpanded ? "w-full self-start px-2 overflow-hidden" : "self-center justify-center w-9 shrink-0 rounded-full bg-primary md:h-8 md:w-8"
            )}
        >
            {isExpanded ? (
                <div className='flex items-center gap-2 w-full min-w-0 pr-4'>
                  {showLogo ? (
                     <Image src={companyDetails.logoUrl!} alt={companyDetails.name} width={32} height={32} className="rounded-sm object-contain shrink-0" />
                  ) : (
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">{companyDetails.shortName || companyDetails.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-sm font-black text-foreground truncate uppercase tracking-tighter shrink leading-none">
                    {companyDetails.name}
                  </span>
                </div>
            ) : (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>
                            {showLogo ? (
                                <Image src={companyDetails.logoUrl!} alt={companyDetails.name} width={24} height={24} className="rounded-sm object-contain" />
                            ) : (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">{companyDetails.shortName || companyDetails.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">{companyDetails.name}</TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
            )}
            <span className="sr-only">{companyDetails.name}</span>
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
                className={cn("h-9 w-9 md:h-8 md:w-8", isExpanded && "self-start ml-2")}
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
                        'flex h-9 items-center justify-start gap-3 rounded-lg px-2 text-muted-foreground transition-colors hover:text-foreground md:h-8',
                        pathname === item.href && 'bg-accent text-accent-foreground',
                        isExpanded ? 'w-full' : 'w-9 justify-center'
                    )}
                    >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className={cn("truncate text-xs font-bold uppercase tracking-tight", !isExpanded && 'sr-only' )}>{item.label}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
            ))}
            </nav>
        </TooltipProvider>
       </ScrollArea>
    </aside>
  );
}
