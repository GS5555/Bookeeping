
"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface FormattedNumberCellProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  options?: Intl.NumberFormatOptions;
}

export const FormattedNumberCell = ({ value, prefix = '₹', suffix, className, options }: FormattedNumberCellProps) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }

  const formattedValue = value.toLocaleString('en-IN', options);

  return <span className={className}>{prefix}{formattedValue}{suffix}</span>;
}
