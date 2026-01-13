import { ComponentType } from "react";

export interface PropDefinition {
  name: string;
  type: string;
  default: string;
  description: string;
  /** Explicitly specify the control type to avoid dynamic switching */
  control?: "input" | "slider" | "switch" | "select";
  /** Min value for slider controls */
  min?: number;
  /** Max value for slider controls */
  max?: number;
  /** Step value for slider controls */
  step?: number;
}

export interface ComponentConfig {
  slug: string;
  name: string;
  category: string;
  description: string;
  /** SEO title for the page - appears in browser tab and Google results */
  seoTitle: string;
  /** SEO meta description for search engines */
  seoDescription: string;
  /** Keywords for SEO - used in meta tags */
  keywords: string[];
  /** Alternative slugs that redirect to this component */
  aliases: string[];
  sandbox: "inline" | "iframe";
  component: ComponentType;
  code: string;
  props: PropDefinition[];
  dependencies: string[];
  installCommand: string;
}

import AnimatedCounter from "@/components/gallery/animated-counter";
import { AnimatedCounterCode } from "@/components/gallery/animated-counter";

export const components: ComponentConfig[] = [
  {
    slug: "animated-counter",
    name: "Animated Counter",
    category: "Animations",
    description:
      "A number counter that animates from 0 to the target value using GSAP. Great for statistics and metrics.",
    seoTitle: "Animated Counter - React Component | Bhavesh's UI Library",
    seoDescription:
      "A beautiful animated number counter with odometer-style digit rotation using GSAP. Perfect for statistics, metrics, dashboards, and landing page hero sections. Copy the code and use in your React project.",
    keywords: [
      "animated counter",
      "odometer counter",
      "number counter",
      "react counter component",
      "gsap animation",
      "digit animation",
      "statistics animation",
      "number animation react",
      "counting animation",
      "number ticker",
      "animated number",
      "counter component",
    ],
    aliases: ["odometer-counter", "number-counter", "digit-counter"],
    sandbox: "inline",
    component: AnimatedCounter,
    code: AnimatedCounterCode,
    dependencies: ["gsap"],
    installCommand: "gsap",
    props: [
      {
        name: "target",
        type: "number",
        default: "1234",
        description: "The target number to count to",
        control: "input",
      },
      {
        name: "duration",
        type: "number",
        default: "2",
        description: "Animation duration in seconds",
        control: "slider",
        min: 0.1,
        max: 10,
        step: 0.1,
      },
      {
        name: "prefix",
        type: "string",
        default: '""',
        description: "Text before the number",
      },
      {
        name: "suffix",
        type: "string",
        default: '"+"',
        description: "Text after the number",
      },
    ],
  },
];

export const categories = [...new Set(components.map((c) => c.category))];

export const getComponentBySlug = (
  slug: string
): ComponentConfig | undefined => {
  return components.find((c) => c.slug === slug);
};

/** Find component by its main slug or any of its aliases */
export const getComponentBySlugOrAlias = (
  slugOrAlias: string
): ComponentConfig | undefined => {
  return components.find(
    (c) => c.slug === slugOrAlias || c.aliases.includes(slugOrAlias)
  );
};

/** Get all slugs and aliases for static generation */
export const getAllSlugsAndAliases = (): string[] => {
  return components.flatMap((c) => [c.slug, ...c.aliases]);
};

export const getComponentsByCategory = (
  category: string
): ComponentConfig[] => {
  return components.filter((c) => c.category === category);
};

