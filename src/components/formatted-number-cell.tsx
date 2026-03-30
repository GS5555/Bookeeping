
"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface FormattedNumberCellProps {
  value?: number | null;
  prefix?: string;
  suffix?: string;
  className?: string;
  options?: Intl.NumberFormatOptions;
}

/**
 * A safe wrapper for formatting numbers with en-IN locale.
 * Prevents hydration errors and handles undefined/null values gracefully.
 */
export const FormattedNumberCell = ({ value, prefix = '₹', suffix = '', className, options }: FormattedNumberCellProps) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <Skeleton className="h-4 w-[65px]" />;
  }

  // Safety guard for undefined/null/NaN to prevent toLocaleString crashes
  if (value === undefined || value === null || isNaN(value)) {
    return <span className={className}>{prefix}0{suffix}</span>;
  }

  try {
    const formattedValue = value.toLocaleString('en-IN', options);
    return <span className={className}>{prefix}{formattedValue}{suffix}</span>;
  } catch (e) {
    return <span className={className}>{prefix}0{suffix}</span>;
  }
}
