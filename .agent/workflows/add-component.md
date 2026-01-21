---
description: How to add a new component to messy-ui registry
---

# Adding a New Component to messy-ui

This guide covers the complete workflow for adding a new component to the messy-ui component library.

## Directory Structure

Each component lives in `registry/new-york/<component-name>/` with these files:

```
registry/new-york/<component-name>/
├── <component-name>.tsx    # Main component file
├── meta.ts                 # Metadata, usage code, and full component code
├── index.ts                # Barrel exports
├── *.css (optional)        # Component-specific CSS
└── utils.ts (optional)     # Utility functions (e.g., cn helper)
```

---

## Step 1: Create the Component

Create `registry/new-york/<component-name>/<component-name>.tsx`:

```tsx
"use client";
import { /* hooks */ } from "react";

interface MyComponentProps {
  /** Document each prop with JSDoc */
  propName?: string;
}

export function MyComponent({ propName = "default" }: MyComponentProps) {
  return <div>{/* component JSX */}</div>;
}
```

---

## Step 2: Create meta.ts

Create `registry/new-york/<component-name>/meta.ts`:

```typescript
import { ComponentMeta } from "@/config/types";

// Usage example shown in preview Code tab
export const usageCode = `import { MyComponent } from "@/components/my-component";

export default function Example() {
  return <MyComponent propName="value" />;
}`;

// Full component code for manual installation (copy entire component)
export const componentCode = `"use client";
// ... full component code as a string ...`;

const meta: ComponentMeta = {
  slug: "my-component",
  name: "My Component",
  category: "Buttons", // or Layout, Navigation, etc.
  description: "Brief description of what the component does.",
  seoTitle: "My Component - React Component | messy-ui",
  seoDescription: "SEO-optimized description for search engines.",
  keywords: ["keyword1", "keyword2", "react component"],
  aliases: ["alternate-name"], // redirects to this component
  sandbox: "inline", // or "iframe"
  registryUrl: "https://messyui.dev/r/my-component.json",
  dependencies: ["gsap", "motion"], // npm packages
  notes: [
    { type: "tip", message: "Helpful tip for users" },
    { type: "info", message: "Important information" },
    { type: "warning", message: "Warning about usage" },
  ],
  cliDependencies: [
    {
      label: "Install cn utility",
      commands: {
        npx: "npx shadcn@latest add lib/utils",
        pnpm: "pnpm dlx shadcn@latest add lib/utils",
        bun: "bunx shadcn@latest add lib/utils",
      },
    },
  ],
  props: [
    {
      name: "propName",
      type: "string",
      default: '"default"',
      description: "Description of this prop",
    },
    {
      name: "size",
      type: "number",
      default: "100",
      description: "Size in pixels",
      control: "slider", // or "input", "switch", "select"
      min: 0,
      max: 200,
      step: 10,
    },
  ],
};

export default meta;
```

---

## Step 3: Create index.ts

Create `registry/new-york/<component-name>/index.ts`:

```typescript
import { MyComponent } from "./my-component";
import meta, { usageCode, componentCode } from "./meta";

export { MyComponent, meta, usageCode, componentCode };
```

---

## Step 4: Add to registry.json

Add entry to `registry.json`:

```json
{
  "name": "my-component",
  "type": "registry:component",
  "title": "My Component",
  "description": "Brief description for shadcn CLI.",
  "dependencies": ["gsap"],
  "files": [
    {
      "path": "registry/new-york/my-component/my-component.tsx",
      "type": "registry:component"
    }
  ]
}
```

---

## Step 5: Add to components.ts

Update `src/config/components.ts`:

```typescript
// Add import at top
import {
  meta as myComponentMeta,
  usageCode as myComponentUsage,
  componentCode as myComponentCode,
} from "@/registry/new-york/my-component";

// Add lazy component
const MyComponent = lazy(() =>
  import("@/registry/new-york/my-component").then((mod) => ({
    default: mod.MyComponent,
  }))
);

// Add to components array
export const components: ComponentConfig[] = [
  // ... existing components
  buildComponentConfig(
    myComponentMeta,
    MyComponent,
    myComponentUsage,
    myComponentCode
  ),
];
```

---

## Step 6: Generate Registry JSON (Optional)

// turbo
```bash
pnpm build:registry
```

This generates `public/r/<component-name>.json` for shadcn CLI.

---

## Prop Control Types

| Control   | Use Case                         | Required Fields      |
|-----------|----------------------------------|----------------------|
| `input`   | Text/number input                | -                    |
| `slider`  | Numeric range                    | `min`, `max`, `step` |
| `switch`  | Boolean toggle                   | -                    |
| `select`  | Enum/union types                 | -                    |

---

## Checklist

- [ ] Component file created with TypeScript types
- [ ] Props documented with JSDoc comments
- [ ] `meta.ts` with complete metadata
- [ ] `index.ts` barrel exports
- [ ] Added to `registry.json`
- [ ] Added to `src/config/components.ts`
- [ ] Test component renders at `/components/<slug>`
- [ ] Verify props playground works
