import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Code2, Layout, Zap, ShieldCheck } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "App Router",
      description: "Modern routing for improved performance and nested layouts.",
      icon: <Layout className="w-5 h-5 text-accent" />,
    },
    {
      title: "TypeScript",
      description: "Type-safe code development across the entire project.",
      icon: <ShieldCheck className="w-5 h-5 text-accent" />,
    },
    {
      title: "Tailwind CSS",
      description: "Utility-first styling with a custom professional color palette.",
      icon: <Code2 className="w-5 h-5 text-accent" />,
    },
    {
      title: "Optimized",
      description: "Subtle transitions and accessible components by default.",
      icon: <Zap className="w-5 h-5 text-accent" />,
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <section className="text-center mb-20 animate-fade-in">
          <h1 className="text-4xl sm:text-6xl font-headline font-extrabold text-primary mb-6 tracking-tight">
            Clean, Professional <br />
            <span className="text-accent">Next.js Starter</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Initialize your next big idea with a minimalist foundation built for speed,
            accessibility, and type-safety.
          </p>
        </section>

        <section id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {features.map((feature, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-4 bg-secondary w-10 h-10 rounded-lg flex items-center justify-center">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg font-headline font-bold text-primary">{feature.title}</CardTitle>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="mt-20 w-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="bg-primary text-primary-foreground p-8 sm:p-12 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-left">
              <h2 className="text-2xl font-headline font-bold mb-2">Ready to develop?</h2>
              <p className="text-primary-foreground/80">Start by editing <code className="bg-white/10 px-1 rounded">src/app/page.tsx</code></p>
            </div>
            <button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 rounded-full font-semibold transition-all shadow-lg hover:scale-105 active:scale-95">
              Documentation
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}