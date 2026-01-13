import { lazy, ComponentType } from "react";

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
  sandbox: "inline" | "iframe";
  component: ComponentType;
  code: string;
  props: PropDefinition[];
  dependencies: string[];
  installCommand: string;
}

import AnimatedCounter from "@/components/gallery/animated-counter";
import {AnimatedCounterCode} from "@/components/gallery/animated-counter";

export const components: ComponentConfig[] = [
    {
    slug: "animated-counter",
    name: "Animated Counter",
    category: "Animations",
    description: "A number counter that animates from 0 to the target value using GSAP. Great for statistics and metrics.",
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

export const getComponentBySlug = (slug: string): ComponentConfig | undefined => {
  return components.find((c) => c.slug === slug);
};

export const getComponentsByCategory = (category: string): ComponentConfig[] => {
  return components.filter((c) => c.category === category);
};
