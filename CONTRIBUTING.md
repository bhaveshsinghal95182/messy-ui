# Contributing to messy-ui

Thank you for your interest in contributing to messy-ui! This guide will walk you through the process of adding a new component to the library.

> If you dont wanna go through all this trouble there is a workflow file optimised for ai agents. Just write your component and give that along with the file in `.agent/workflows/add-component.md` to the ai agent.

## Component Structure

Each component lives in its own folder under `registry/new-york/`:

```
registry/new-york/your-component/
├── your-component.tsx   # The main component
├── meta.ts              # Metadata and documentation
├── index.ts             # Exports
├── your-component.css   # (Optional) Component styles
└── utils.ts             # (Optional) Utility functions
```

## Quick Start

### 1. Create Your Component

Create `registry/new-york/your-component/your-component.tsx`:

```tsx
"use client";

interface YourComponentProps {
  /** Size of the component */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function YourComponent({ 
  size = 100, 
  className = "" 
}: YourComponentProps) {
  return (
    <div className={className} style={{ width: size }}>
      {/* Your component JSX */}
    </div>
  );
}
```

> **Tip:** Use JSDoc comments (`/** */`) to document your props they'll appear in the documentation!

### 2. Create the Metadata File

Create `registry/new-york/your-component/meta.ts`:

```typescript
import { ComponentMeta } from "@/config/types";

// Example code shown in the "Code" tab
export const usageCode = `import { YourComponent } from "@/components/your-component";

export default function Example() {
  return <YourComponent size={150} />;
}`;

// Component files to be loaded at build time
// This references your actual source files instead of duplicating code
import { ComponentFileRef } from "@/config/types";

export const componentFiles: ComponentFileRef[] = [
  {
    filename: "your-component.tsx",
    targetPath: "ui/your-component.tsx",
    sourcePath: "./your-component.tsx",
  },
];

const meta: ComponentMeta = {
  slug: "your-component",
  name: "Your Component",
  category: "Layout",
  description: "A brief description of what your component does.",
  
  // SEO
  seoTitle: "Your Component - Animated React Component | messy-ui",
  seoDescription: "A longer description for search engines.",
  keywords: ["react", "component", "animation"],
  aliases: ["alternate-name"],
  
  // Display
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/your-component.json",
  
  // Dependencies
  dependencies: ["gsap"],  // npm packages required
  
  // Installation notes
  notes: [
    { type: "tip", message: "Helpful usage tip" },
    { type: "info", message: "Important information" },
  ],
  
  // Props documentation
  props: [
    {
      name: "size",
      type: "number",
      default: "100",
      description: "Size of the component in pixels",
      control: "slider",
      min: 50,
      max: 300,
      step: 10,
    },
    {
      name: "className",
      type: "string",
      default: '""',
      description: "Additional CSS classes",
    },
  ],
};

export default meta;
```

### 3. Create the Index File

Create `registry/new-york/your-component/index.ts`:

```typescript
import { YourComponent } from "./your-component";
import meta, { usageCode, componentFiles } from "./meta";

export { YourComponent, meta, usageCode, componentFiles };
```

### 4. Register the Component

Add your component to these files:

#### `registry.json`

```json
{
  "name": "your-component",
  "type": "registry:component",
  "title": "Your Component",
  "description": "A brief description for the CLI.",
  "dependencies": ["gsap"],
  "files": [
    {
      "path": "registry/new-york/your-component/your-component.tsx",
      "type": "registry:component"
    }
  ]
}
```

#### `src/config/components.ts`

```typescript
// Add imports
import {
  meta as yourComponentMeta,
  usageCode as yourComponentUsage,
  componentFiles as yourComponentFiles,
} from "@/registry/new-york/your-component";
import { loadComponentFiles, getRegistryPath } from "@/lib/component-loader";

// Add lazy load
const YourComponent = lazy(() =>
  import("@/registry/new-york/your-component").then((mod) => ({
    default: mod.YourComponent,
  }))
);

// Add to components array
export const components: ComponentConfig[] = [
  // ... existing components
  buildComponentConfig(
    yourComponentMeta,
    YourComponent,
    yourComponentUsage,
    loadComponentFiles(getRegistryPath("your-component"), yourComponentFiles)
  ),
];
```

### 5. Test Your Component

Run the dev server and visit `/components/your-component`:

```bash
pnpm dev
```

## Props Control Types

Use these controls in your props for the interactive playground:

| Control  | Use For              | Extra Fields         |
|----------|----------------------|----------------------|
| `input`  | Text/numbers         | —                    |
| `slider` | Numeric ranges       | `min`, `max`, `step` |
| `switch` | Booleans             | —                    |
| `select` | Enum types           | —                    |

## Checklist

Before submitting your PR, make sure:

- [ ] Component has TypeScript types
- [ ] All props have JSDoc comments
- [ ] `meta.ts` has complete SEO metadata
- [ ] Component added to `registry.json`
- [ ] Component added to `src/config/components.ts`
- [ ] Component renders correctly at `/components/your-slug`
- [ ] Props playground works with interactive controls

## Design Guidelines

- **Use animations wisely** — messy-ui is about delightful interactions
- **Keep it accessible** — support keyboard navigation and screen readers
- **Support dark mode** — use `currentColor` or CSS variables
- **Be performant** — lazy load heavy dependencies

## Thank You!

Every contribution makes messy-ui better. If you have questions, feel free to open an issue!
