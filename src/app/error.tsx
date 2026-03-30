'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('Runtime Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Something went wrong</CardTitle>
          <CardDescription className="text-xs font-bold uppercase text-muted-foreground">
            A client-side error occurred while rendering this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-muted rounded-lg border text-left overflow-auto max-h-[200px]">
            <p className="text-xs font-mono text-destructive break-words">
              {error.message || 'An unknown error occurred.'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Try refreshing the page or contact support if the issue persists.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => reset()} className="font-black uppercase tracking-widest">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
