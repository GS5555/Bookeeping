'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 min-w-0 w-full overflow-hidden">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate w-full sm:w-auto">{title}</h2>
      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
        {children}
      </div>
    </div>
  );
}
