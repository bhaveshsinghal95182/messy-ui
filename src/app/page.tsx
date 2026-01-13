import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { components, categories } from "@/config/components";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Static SEO metadata for the home page
export const metadata: Metadata = {
  title: "Bhavesh's Component Gallery - Beautiful React Components",
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
    "ui library",
    "component gallery",
    "react ui",
    "tailwind components",
  ],
  openGraph: {
    title: "Bhavesh's Component Gallery - Beautiful React Components",
    description:
      "A collection of animated, accessible React components built with GSAP and Framer Motion.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhavesh's Component Gallery",
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
          Bhavesh&apos;s Component Gallery
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Beautiful React Components
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A collection of animated, accessible components built with React,
          GSAP, and Framer Motion. Copy the code and make it yours.
        </p>
      </div>

      {/* Categories & Components */}
      {categories.map((category, categoryIndex) => {
        const categoryComponents = components.filter(
          (c) => c.category === category
        );

        return (
          <section
            key={category}
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${categoryIndex * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-foreground">
                {category}
              </h2>
              <Badge variant="secondary">{categoryComponents.length}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryComponents.map((component, index) => (
                <Link
                  key={component.slug}
                  href={`/components/${component.slug}`}
                  className="animate-in fade-in zoom-in-95 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card className="h-full group hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {component.name}
                        </CardTitle>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <CardDescription className="line-clamp-2">
                        {component.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {component.dependencies.map((dep) => (
                          <Badge key={dep} variant="outline" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                        <Badge
                          variant={
                            component.sandbox === "iframe"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {component.sandbox}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
