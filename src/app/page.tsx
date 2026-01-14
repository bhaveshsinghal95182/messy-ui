import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { components } from "@/config/components";

// Static SEO metadata for the home page
export const metadata: Metadata = {
  title: "messy-ui - Beautiful React Components",
  description:
    "A collection of animated, accessible React components built with GSAP and Framer Motion. Animated counters, odometer components, number tickers, and more. Copy the code and make it yours.",
  keywords: [
    "react components",
    "animated components",
    "animated counter",
    "odometer counter",
    "number counter",
    "gsap animation",
    "framer motion",
    "messy-ui",
    "component gallery",
    "react ui",
    "tailwind components",
    "gsap react components",
    "framer motion react components",
  ],
  openGraph: {
    title: "messy-ui - Beautiful React Components",
    description:
      "A collection of animated, accessible React components built with GSAP and Framer Motion.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "messy-ui",
    description:
      "A collection of animated, accessible React components built with GSAP and Framer Motion.",
  },
};

export default function Page() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          messy-ui
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
          Beautifully{" "}
          <span className="italic font-serif tracking-tight">Messy</span> React
          Components
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A collection of animated, accessible components built with React,
          GSAP, and Framer Motion. Copy the code and make it yours.
        </p>
      </div>

      <div className="flex items-center justify-center w-full">
        <Link href="/components">
          <Button className="w-full max-w-xs font-semibold text-lg font-sans cursor-pointer">
            Components
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>Total Components</CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{components.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
