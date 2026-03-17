'use client';

import { StumpBooksLogo } from "./icons";

export function FullPageLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <StumpBooksLogo className="h-12 w-12 animate-pulse" />
            <p className="mt-4 text-muted-foreground">Loading Application...</p>
        </div>
    )
}
