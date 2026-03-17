
import type { SVGProps } from 'react';

export function StumpBooksLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M15.5 15.5L18 18" />
      <path d="M8.5 8.5L6 6" />
      <path d="M12 8.5V12h3.5" />
      <path d="M8.5 12H12v3.5" />
      <path d="M12 15.5V12h-3.5" />
      <path d="M15.5 12H12V8.5" />
    </svg>
  );
}
