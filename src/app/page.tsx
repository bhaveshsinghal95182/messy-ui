import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo3D } from "@/components/logo-3d";
import CTAButton from "@/components/layout/cta-button";

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
    <div className="min-h-[calc(100vh-200px)] flex items-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
        {/* Left side - Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Only library that offers gsap components
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            Beautifully{" "}
            <span className="italic font-serif tracking-tight">Messy</span>{" "}
            <br className="hidden lg:block" />
            React Components
          </h1>
          <p className="text-md text-muted-foreground max-w-xl">
            A collection of animated, accessible components built with React,
            GSAP, and Framer Motion. Copy the code and make it yours.
          </p>
          <CTAButton bgColorClass="bg-rose-500" bgColorHex="#ff2056"/>
        </div>

        {/* Right side - 3D Logo */}
        <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
          <Logo3D />
        </div>
      </div>
    </div>
  );
}
