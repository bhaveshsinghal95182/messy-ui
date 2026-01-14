import { lazy } from "react";
import { ComponentConfig, ComponentMeta } from "./types";

// Import registry components with their co-located metadata
import {
  meta as animatedCounterMeta,
  usageCode as animatedCounterUsage,
  componentCode as animatedCounterCode,
} from "@/registry/new-york/animated-counter";

import {
  meta as holdButtonMeta,
  usageCode as holdButtonUsage,
  componentCode as holdButtonCode,
} from "@/registry/new-york/hold-button";

import {
  meta as themeToggleMeta,
  usageCode as themeToggleUsage,
  componentCode as themeToggleCode,
} from "@/registry/new-york/theme-toggle";

const AnimatedCounter = lazy(() =>
  import("@/registry/new-york/animated-counter").then((mod) => ({
    default: mod.AnimatedCounter,
  }))
);

const HoldButton = lazy(() =>
  import("@/registry/new-york/hold-button").then((mod) => ({
    default: mod.HoldButton,
  }))
);

const ThemeToggle = lazy(() =>
  import("@/registry/new-york/theme-toggle").then((mod) => ({
    default: mod.ThemeToggle,
  }))
);

/**
 * Build full ComponentConfig from co-located metadata and code.
 */
function buildComponentConfig(
  meta: ComponentMeta,
  component: React.ComponentType | React.LazyExoticComponent<any>,
  usageCode: string,
  componentCode: string
): ComponentConfig {
  return {
    ...meta,
    component,
    usageCode,
    componentCode,
  };
}

// Build all component configs from co-located registry data
export const components: ComponentConfig[] = [
  buildComponentConfig(
    animatedCounterMeta,
    AnimatedCounter,
    animatedCounterUsage,
    animatedCounterCode
  ),
  buildComponentConfig(
    holdButtonMeta,
    HoldButton,
    holdButtonUsage,
    holdButtonCode
  ),
  buildComponentConfig(
    themeToggleMeta,
    ThemeToggle,
    themeToggleUsage,
    themeToggleCode
  ),
];

// Re-export types
export type { ComponentConfig, ComponentMeta, PropDefinition } from "./types";

// Derived data
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
