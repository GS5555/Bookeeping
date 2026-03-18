'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SummaryCardData {
    title: string;
    value: string;
    icon: LucideIcon;
    description?: string;
}

interface PageSummaryProps {
    cards: SummaryCardData[];
}

const cardColorClasses = [
    { bg: 'bg-chart-1/10', text: 'text-chart-1', border: 'border-chart-1/30' },
    { bg: 'bg-chart-2/10', text: 'text-chart-2', border: 'border-chart-2/30' },
    { bg: 'bg-chart-3/10', text: 'text-chart-3', border: 'border-chart-3/30' },
    { bg: 'bg-chart-4/10', text: 'text-chart-4', border: 'border-chart-4/30' },
    { bg: 'bg-chart-5/10', text: 'text-chart-5', border: 'border-chart-5/30' },
];

/**
 * Summary grid that reflows from 1 to 5 columns.
 */
export function PageSummary({ cards }: PageSummaryProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 w-full min-w-0">
      {cards.map((card, index) => {
          const colorClasses = cardColorClasses[index % cardColorClasses.length];
          return (
            <Card key={card.title} className={cn("min-w-0 w-full shadow-sm border-2 transition-all hover:shadow-md", colorClasses.bg, colorClasses.border)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-[10px] sm:text-xs font-black uppercase tracking-widest", colorClasses.text)}>
                  {card.title}
                </CardTitle>
                <card.icon className={cn("h-4 w-4 shrink-0", colorClasses.text)} />
              </CardHeader>
              <CardContent className={cn(colorClasses.text)}>
                <div className="text-xl sm:text-2xl font-black truncate tracking-tighter leading-tight">{card.value}</div>
                {card.description && (
                  <p className={cn(
                    "text-[10px] font-bold opacity-80 mt-1 truncate uppercase tracking-tight", 
                    colorClasses.text
                  )}>
                    {card.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )
      })}
    </div>
  );
}
