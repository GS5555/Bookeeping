import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="w-full border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-headline font-bold text-xl text-primary tracking-tight">
          Next<span className="text-accent">Minimal</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="#features" className="text-sm font-medium hover:text-accent transition-colors">Features</Link>
          <Link href="https://github.com" target="_blank" className="text-sm font-medium hover:text-accent transition-colors">GitHub</Link>
        </div>
      </div>
    </nav>
  );
}