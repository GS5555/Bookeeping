export function Footer() {
  return (
    <footer className="w-full border-t py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} NextMinimal. All rights reserved.
        </p>
        <div className="flex gap-4">
          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">v1.0.0</span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">TypeScript</span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground">Next.js 15</span>
        </div>
      </div>
    </footer>
  );
}