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
    { bg: 'bg-chart-1/20', text: 'text-chart-1', border: 'border-chart-1/30' },
    { bg: 'bg-chart-2/20', text: 'text-chart-2', border: 'border-chart-2/30' },
    { bg: 'bg-chart-3/20', text: 'text-chart-3', border: 'border-chart-3/30' },
    { bg: 'bg-chart-4/20', text: 'text-chart-4', border: 'border-chart-4/30' },
    { bg: 'bg-chart-5/20', text: 'text-chart-5', border: 'border-chart-5/30' },
    { bg: 'bg-chart-6/20', text: 'text-chart-6', border: 'border-chart-6/30' },
    { bg: 'bg-chart-7/20', text: 'text-chart-7', border: 'border-chart-7/30' },
    { bg: 'bg-chart-8/20', text: 'text-chart-8', border: 'border-chart-8/30' },
    { bg: 'bg-chart-9/20', text: 'text-chart-9', border: 'border-chart-9/30' },
    { bg: 'bg-chart-10/20', text: 'text-chart-10', border: 'border-chart-10/30' },
];

export function PageSummary({ cards }: PageSummaryProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 w-full min-w-0">
      {cards.map((card, index) => {
          const colorClasses = cardColorClasses[index % cardColorClasses.length];
          return (
            <Card key={card.title} className={cn("min-w-0 w-full", colorClasses.bg, colorClasses.border)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-xs sm:text-sm font-medium", colorClasses.text)}>
                  {card.title}
                </CardTitle>
                <card.icon className={cn("h-4 w-4 shrink-0", colorClasses.text)} />
              </CardHeader>
              <CardContent className={cn(colorClasses.text)}>
                <div className="text-xl sm:text-2xl font-bold truncate">{card.value}</div>
                {card.description && (
                  <p className={cn(
                    "text-[9px] sm:text-[10px] opacity-80 break-words line-clamp-2", 
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
