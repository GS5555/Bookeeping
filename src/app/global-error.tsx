'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Critical System Error</h2>
          <div className="max-w-lg p-6 bg-muted rounded-2xl border-2 mb-8">
             <p className="text-sm font-mono text-destructive mb-4">{error.message}</p>
             <p className="text-muted-foreground text-sm">The application encountered a terminal error. Please attempt a full reset.</p>
          </div>
          <Button onClick={() => reset()} size="lg" className="font-black uppercase tracking-widest">
            Restart Application
          </Button>
        </div>
      </body>
    </html>
  );
}
