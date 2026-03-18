'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8 min-w-0 w-full">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate w-full md:w-auto">{title}</h2>
      <div className="flex w-full flex-wrap items-center justify-start gap-2 md:ml-auto md:w-auto md:justify-end">
        {children}
      </div>
    </div>
  );
}
