import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NextMinimal - Clean Starter',
  description: 'A professional and minimal Next.js starter project with TypeScript and Tailwind CSS.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}