import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Logo3D } from '@/components/logo-3d';
import CTAButton from '@/components/layout/cta-button';
import JsonLd from '@/components/seo/json-ld';
import { Badge } from '@/components/ui/badge';
import { components, categories } from '@/config/components';
import {
  pageMetadata,
  faqSchema,
  collectionSchema,
  categoryPath,
  siteConfig,
} from '@/lib/seo';
import { plainText } from '@/lib/text';

const title = 'messy-ui - Beautiful Animated React Components';
const description = `A collection of ${components.length} animated, accessible React components built with GSAP and Framer Motion. Animated counters, hold buttons, menus, tabs and more. Install with the shadcn CLI or copy the code and make it yours.`;

// Static SEO metadata for the home page
export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/',
  keywords: [
    'animated counter',
    'odometer counter',
    'number counter',
    'gsap animation',
    'framer motion',
    'component gallery',
    'react ui',
    ...siteConfig.keywords,
  ],
});

/**
 * Questions people actually type into search. Answering them in the page body
 * (and mirroring them as FAQPage structured data) is what makes the homepage
 * rankable for anything other than the brand name.
 */
const faqs = [
  {
    question: 'What is messy-ui?',
    answer: `messy-ui is a free collection of ${components.length} animated React components built with TypeScript, Tailwind CSS, GSAP and Framer Motion. It is not an npm dependency - you install the source into your own project and own it from then on.`,
  },
  {
    question: 'How do I install a messy-ui component?',
    answer:
      'Run "npx shadcn@latest add https://messyui.dev/r/[component].json" in a project that already uses shadcn/ui, or open the component page and copy the source from the Code tab.',
  },
  {
    question: 'Do I need shadcn/ui to use these components?',
    answer:
      'No. The shadcn CLI is the fastest path, but every component page shows the full source, its dependencies and its props, so you can paste it into any React project that uses Tailwind CSS.',
  },
  {
    question: 'Do I have to credit messy-ui?',
    answer:
      'No. The components are meant to be copied into your project and edited freely - that is the whole point of a registry rather than an npm package.',
  },
  {
    question: 'Does messy-ui use GSAP or Framer Motion?',
    answer:
      'Both, depending on the component. Each component page lists exactly which animation library it needs under Installation, so you only install what that component uses.',
  },
];

const featured = components.slice(0, 6);

export default function Page() {
  return (
    <>
      <JsonLd
        schema={[
          faqSchema(faqs),
          collectionSchema({
            name: siteConfig.name,
            description,
            path: '/',
            items: components,
          }),
        ]}
      />

      {/* Hero */}
      <div className="min-h-[calc(100vh-200px)] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          {/* Left side - Content */}
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              Beautifully{' '}
              <span className="italic font-serif tracking-tight">Messy</span>{' '}
              <br className="hidden lg:block" />
              React Components
            </h1>
            <p className="text-md text-muted-foreground max-w-xl">
              A collection of animated, accessible components built with React,
              GSAP, and Framer Motion. Copy the code and make it yours.
            </p>
            <CTAButton />
          </div>
          {/* Right side - 3D Logo */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <Logo3D />
          </div>
        </div>
      </div>

      {/* Below the fold: real, crawlable content */}
      <div className="space-y-16 pb-16">
        {/* Featured components */}
        <section aria-labelledby="featured-heading" className="space-y-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <Sparkles className="w-3 h-3 mr-1.5" />
              {components.length} components and counting
            </Badge>
            <h2
              id="featured-heading"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Featured components
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Every component ships with a live preview, an interactive props
              playground, its full source and a one-line shadcn install command.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map((component) => (
              <li key={component.slug}>
                <Link
                  href={`/components/${component.slug}`}
                  className="group flex items-start justify-between gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground group-hover:text-primary transition-colors">
                      {component.name}
                    </span>
                    <span className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {plainText(component.description)}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 mt-1 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link key={category} href={categoryPath(category)}>
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 rounded-full cursor-pointer bg-card/80 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {category}
                </Badge>
              </Link>
            ))}
          </div>
        </section>

        {/* Install */}
        <section aria-labelledby="install-heading" className="space-y-4">
          <h2
            id="install-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Install in one command
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            messy-ui is a{' '}
            <a
              href="https://ui.shadcn.com/docs/registry"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              shadcn registry
            </a>
            , so the CLI drops the source straight into your project. Nothing is
            hidden behind an npm package - you get the file, you own the file.
          </p>
          <pre className="rounded-xl bg-card p-4 overflow-x-auto text-sm">
            <code className="font-mono text-foreground">
              npx shadcn@latest add https://messyui.dev/r/animated-counter.json
            </code>
          </pre>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="space-y-6">
          <h2
            id="faq-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Frequently asked questions
          </h2>
          <dl className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="space-y-1.5">
                <dt className="font-medium text-foreground">{faq.question}</dt>
                <dd className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
