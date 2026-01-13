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

/**
 * Static metadata for a component - stored in registry/[name]/meta.ts
 * Does NOT include the component itself or code strings.
 */
export interface ComponentMeta {
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
  /** Shadcn CLI registry URL for installation */
  registryUrl: string;
  props: PropDefinition[];
  dependencies: string[];
  installCommand: string;
}

/**
 * Full component config - includes component + code strings
 * Built from ComponentMeta + imports in components.ts
 */
export interface ComponentConfig extends ComponentMeta {
  /** React component for preview rendering */
  component: ComponentType;
  /** Short usage example code shown in the preview Code tab */
  usageCode: string;
  /** Full component code for manual installation */
  componentCode: string;
}
