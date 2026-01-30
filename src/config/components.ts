import { lazy } from "react";
import {
  ComponentConfig,
  ComponentFile,
  ComponentMeta,
  ComponentFileRef,
} from "./types";

// Import registry components with their co-located metadata
import {
  meta as animatedCounterMeta,
  usageCode as animatedCounterUsage,
  componentFiles as animatedCounterFiles,
} from "@/registry/new-york/animated-counter";

import {
  meta as holdButtonMeta,
  usageCode as holdButtonUsage,
  componentFiles as holdButtonFiles,
} from "@/registry/new-york/hold-button";

import {
  meta as themeToggleMeta,
  usageCode as themeToggleUsage,
  componentFiles as themeToggleFiles,
} from "@/registry/new-york/theme-toggle";

import {
  meta as ctaButtonMeta,
  usageCode as ctaButtonUsage,
  componentFiles as ctaButtonFiles,
} from "@/registry/new-york/cta-button";

import {
  meta as separatorMeta,
  usageCode as separatorUsage,
  componentFiles as separatorFiles,
} from "@/registry/new-york/separator";

import {
  meta as tabsMeta,
  usageCode as tabsUsage,
  componentFiles as tabsFiles,
} from "@/registry/new-york/tabs";

import {
  meta as progressBarMeta,
  usageCode as progressBarUsage,
  componentFiles as progressBarFiles,
  ProgressBarExample,
} from "@/registry/new-york/progress-bar";

import {
  meta as liquidSliderMeta,
  usageCode as liquidSliderUsage,
  componentFiles as liquidSliderFiles,
} from "@/registry/new-york/liquid-slider";

const LiquidSlider = lazy(() =>
  import("@/registry/new-york/liquid-slider").then((mod) => ({
    default: mod.LiquidSlider,
  })),
);

const AnimatedCounter = lazy(() =>
  import("@/registry/new-york/animated-counter").then((mod) => ({
    default: mod.AnimatedCounter,
  })),
);

const HoldButton = lazy(() =>
  import("@/registry/new-york/hold-button").then((mod) => ({
    default: mod.HoldButton,
  })),
);

const ThemeToggle = lazy(() =>
  import("@/registry/new-york/theme-toggle").then((mod) => ({
    default: mod.ThemeToggle,
  })),
);

const CTAButton = lazy(() =>
  import("@/registry/new-york/cta-button").then((mod) => ({
    default: mod.CTAButton,
  })),
);

const Separator = lazy(() =>
  import("@/registry/new-york/separator").then((mod) => ({
    default: mod.Separator,
  })),
);

const Tabs = lazy(() =>
  import("@/registry/new-york/tabs").then((mod) => ({
    default: mod.TabsCode,
  })),
);

/**
 * Build full ComponentConfig from co-located metadata and code.
 * componentCode can be a string (legacy), ComponentFile[] (multi-file loaded),
 * or ComponentFileRef[] (to be loaded by server components later)
 */
function buildComponentConfig(
  meta: ComponentMeta,
  component: React.ComponentType | React.LazyExoticComponent<any>,
  usageCode: string,
  componentCode: string | ComponentFile[] | ComponentFileRef[],
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
    animatedCounterFiles,
  ),
  buildComponentConfig(
    holdButtonMeta,
    HoldButton,
    holdButtonUsage,
    holdButtonFiles,
  ),
  buildComponentConfig(
    themeToggleMeta,
    ThemeToggle,
    themeToggleUsage,
    themeToggleFiles,
  ),
  buildComponentConfig(
    ctaButtonMeta,
    CTAButton,
    ctaButtonUsage,
    ctaButtonFiles,
  ),
  buildComponentConfig(
    separatorMeta,
    Separator,
    separatorUsage,
    separatorFiles,
  ),
  buildComponentConfig(tabsMeta, Tabs, tabsUsage, tabsFiles),
  buildComponentConfig(
    progressBarMeta,
    ProgressBarExample,
    progressBarUsage,
    progressBarFiles,
  ),
  buildComponentConfig(
    liquidSliderMeta,
    LiquidSlider,
    liquidSliderUsage,
    liquidSliderFiles,
  ),
];

// Re-export types
export type { ComponentConfig, ComponentMeta, PropDefinition } from "./types";

// Derived data
export const categories = [...new Set(components.map((c) => c.category))];

export const getComponentBySlug = (
  slug: string,
): ComponentConfig | undefined => {
  return components.find((c) => c.slug === slug);
};

/** Find component by its main slug or any of its aliases */
export const getComponentBySlugOrAlias = (
  slugOrAlias: string,
): ComponentConfig | undefined => {
  return components.find(
    (c) => c.slug === slugOrAlias || c.aliases.includes(slugOrAlias),
  );
};

/** Get all slugs and aliases for static generation */
export const getAllSlugsAndAliases = (): string[] => {
  return components.flatMap((c) => [c.slug, ...c.aliases]);
};

export const getComponentsByCategory = (
  category: string,
): ComponentConfig[] => {
  return components.filter((c) => c.category === category);
};
