
import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="flex w-full items-center justify-start gap-2 overflow-x-auto pb-2 md:ml-auto md:w-auto md:justify-end md:overflow-visible md:pb-0">{children}</div>
    </div>
  );
}
