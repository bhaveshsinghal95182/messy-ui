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
 * A CLI command that needs to be run during installation
 * Flexible enough to support any CLI tool, not just shadcn
 */
export interface CLICommand {
  /** Label shown in the UI (e.g., "Install shadcn button", "Initialize Prisma") */
  label: string;
  /** 
   * Command variants for different package managers
   * Use {url} as placeholder for registry URL if needed
   */
  commands: {
    npx: string;
    pnpm: string;
    bun: string;
  };
}

/**
 * Represents a single component file with optional JS version
 */
export interface ComponentFile {
  /** Display name shown in tabs (e.g., "animated-counter.tsx") */
  filename: string;
  /** Target path relative to components folder (e.g., "ui/animated-counter.tsx") */
  targetPath: string;
  /** TypeScript/TSX version of the code */
  code: string;
  /** JavaScript/JSX version (optional - if not provided, only TS shown) */
  jsCode?: string;
}

/**
 * Important note to display to users during installation
 */
export interface InstallationNote {
  /** Type of note - affects styling (info=blue, warning=yellow, tip=green) */
  type: "info" | "warning" | "tip";
  /** The message to display */
  message: string;
}

/**
 * Additional code snippet to show in installation (e.g., CSS, config files)
 * Also used to generate shadcn registry files
 */
export interface CodeSnippet {
  /** Label for the snippet (e.g., "Add to globals.css") */
  label: string;
  /** The code to display */
  code: string;
  /** Language for syntax highlighting */
  language: "tsx" | "jsx" | "js" | "ts" | "html" | "css" | "json" | "bash";
  /** 
   * Target file path for shadcn registry (e.g., "styles/shimmer.css")
   * If provided, this file will be included in the shadcn registry JSON
   */
  targetPath?: string;
  /**
   * Registry type for shadcn (defaults to "registry:file")
   */
  registryType?: "registry:style" | "registry:file" | "registry:hook" | "registry:lib";
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
  /** Shadcn CLI registry URL for this component */
  registryUrl: string;
  /**
   * Optional thumbnail URL for the component gallery
   * If not provided, a fallback pattern will be used
   * Can be a single string (used for both) or an object with light/dark variants
   */
  thumbnailUrl?: string | { light: string; dark: string };
  props: PropDefinition[];
  
  /** 
   * NPM package dependencies (shown in manual installation)
   * Will be joined with spaces for install command
   */
  dependencies: string[];
  
  /**
   * CLI commands to run before manual installation (optional)
   * Use for shadcn dependencies, prisma init, or any other CLI tools
   * These are shown BEFORE the npm install step
   */
  cliDependencies?: CLICommand[];
  
  /**
   * Important notes/messages to show users during installation
   * Displayed at the top of the installation section
   */
  notes?: InstallationNote[];
  
  /**
   * Additional code snippets to show (CSS, config files, etc.)
   * Displayed as a separate step in manual installation
   */
  snippets?: CodeSnippet[];
}

/**
 * Full component config - includes component + code strings
 * Built from ComponentMeta + imports in components.ts
 */
export interface ComponentConfig extends ComponentMeta {
  /** React component for preview rendering */
  component: ComponentType | React.LazyExoticComponent<any>;
  /** Short usage example code shown in the preview Code tab */
  usageCode: string;
  /** 
   * Component code for manual installation
   * Can be a single string (legacy/simple) or array of ComponentFile for multi-file components
   */
  componentCode: string | ComponentFile[];
}
