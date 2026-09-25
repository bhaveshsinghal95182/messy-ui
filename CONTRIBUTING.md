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
'use client';

interface YourComponentProps {
  /** Size of the component */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function YourComponent({
  size = 100,
  className = '',
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
import { ComponentMeta } from '@/config/types';

// Example code shown in the "Code" tab
export const usageCode = `import { YourComponent } from "@/components/your-component";

export default function Example() {
  return <YourComponent size={150} />;
}`;

// Component files to be loaded at build time
// This references your actual source files instead of duplicating code
import { ComponentFileRef } from '@/config/types';

export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'your-component.tsx',
    targetPath: 'ui/your-component.tsx',
    sourcePath: './your-component.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'your-component',
  name: 'Your Component',
  category: 'Layout',
  description: 'A brief description of what your component does.',

  // SEO
  seoTitle: 'Your Component - Animated React Component | messy-ui',
  seoDescription: 'A longer description for search engines.',
  keywords: ['react', 'component', 'animation'],
  aliases: ['alternate-name'],

  // Display
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/your-component.json',

  // Dependencies
  dependencies: ['gsap'], // npm packages required

  // Installation notes
  notes: [
    { type: 'tip', message: 'Helpful usage tip' },
    { type: 'info', message: 'Important information' },
  ],

  // Props documentation
  props: [
    {
      name: 'size',
      type: 'number',
      default: '100',
      description: 'Size of the component in pixels',
      control: 'slider',
      min: 50,
      max: 300,
      step: 10,
    },
    {
      name: 'className',
      type: 'string',
      default: '""',
      description: 'Additional CSS classes',
    },
  ],
};

export default meta;
```

### 3. Create the Index File

Create `registry/new-york/your-component/index.ts`:

```typescript
import { YourComponent } from './your-component';
import meta, { usageCode, componentFiles } from './meta';

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
} from '@/registry/new-york/your-component';
import { loadComponentFiles, getRegistryPath } from '@/lib/component-loader';

// Add lazy load
const YourComponent = lazy(() =>
  import('@/registry/new-york/your-component').then((mod) => ({
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
    loadComponentFiles(getRegistryPath('your-component'), yourComponentFiles)
  ),
];
```

### 5. Test Your Component

Run the dev server and visit `/components/your-component`:

```bash
pnpm dev
```

Then write tests. Every component ships with a colocated `*.test.tsx`:

```bash
pnpm test              # everything
pnpm test:watch        # while you work
pnpm test:unit         # pure logic + registry contract tests
pnpm test:components   # jsdom + Testing Library + axe
pnpm test:coverage     # what CI enforces
pnpm test:e2e          # Playwright, builds and starts the app first
```

Model the test on an existing one, for example
`registry/new-york/hold-button/hold-button.test.tsx`. Cover the props the
component documents, the interaction it exists for, and finish with the shared
accessibility check:

```tsx
import { checkA11y } from '@tests/setup/a11y';

it('has no accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  expect(await checkA11y(container)).toHaveNoViolations();
});
```

Anything that needs a real viewport — scroll-linked motion, `position: fixed`,
media queries, fullscreen — belongs in `e2e/` rather than jsdom.

Two things bite in `e2e/`, both because this site animates a lot:

- **Clicking below the fold.** The page reflows as it scrolls, so a click can
  chase a moving target and quietly miss. Call `scrollIntoViewIfNeeded()` and
  assert `toBeInViewport()` before clicking, then assert the state the click
  was supposed to produce rather than its side effect.
- **One test, many pages.** The per-test budget is sized for a single
  navigation. A test that loops over several paths needs
  `test.setTimeout()` scaled to how many it visits, or it fails on arithmetic
  instead of on the thing it checks.

The accessibility specs re-scan until the page stops animating, so a contrast
failure there is a real palette problem rather than an element caught mid-fade.
The failure message reports each offending element's computed opacity, which is
how you tell the two apart.

## Registry integrity

Four things have to stay in step, and CI fails the PR if they drift:

| Source of truth              | Feeds                                    |
| ---------------------------- | ---------------------------------------- |
| `registry/new-york/<name>/`  | the component itself                     |
| `registry.json`              | what the shadcn CLI installs             |
| `public/r/<name>.json`       | generated; served at `messyui.dev/r/...` |
| `meta.ts` → `componentFiles` | the docs "Manual installation" tab       |

After touching a component, run `pnpm registry:build` and commit `public/r/`.
`tests/contract/registry.test.ts` checks that every directory has a registry
entry, every listed file exists, every relative import is itself listed, and
that `meta.ts` covers everything the CLI installs.

## Props Control Types

Use these controls in your props for the interactive playground:

| Control         | Use For                 | Extra Fields         |
| --------------- | ----------------------- | -------------------- |
| `input`         | Text/numbers            | —                    |
| `slider`        | Numeric ranges          | `min`, `max`, `step` |
| `switch`        | Booleans                | —                    |
| `select`        | Enum types              | `options`            |
| `select-custom` | Enums plus free text    | `options`            |
| `object-array`  | Lists of `{title,href}` | —                    |

`select` and `select-custom` need an explicit `options` array — without it the
dropdown renders empty, and the contract tests will fail.

## Checklist

Before submitting your PR, make sure:

- [ ] Component has TypeScript types
- [ ] All props have JSDoc comments
- [ ] `meta.ts` has complete SEO metadata, with `seoDescription` at most 160 characters
- [ ] Component added to `registry.json`
- [ ] Component added to `src/config/components.ts`
- [ ] `pnpm registry:build` run and `public/r/` committed
- [ ] Component renders correctly at `/components/your-slug`
- [ ] Props playground works with interactive controls
- [ ] Colocated `*.test.tsx` covers the props and the main interaction
- [ ] `pnpm typecheck && pnpm lint && pnpm test:coverage` all pass
- [ ] Commit messages follow Conventional Commits — releases are generated from them

## CI and releases

Every pull request runs four jobs: `quality` (typecheck, lint, formatting),
`test` (unit, contract and component tests against a coverage threshold),
`build` (Next build plus a check that `public/r/` was regenerated), and an E2E
run. For branches in this repo the E2E lane runs against the Vercel preview
deployment; for forks and for pushes to `master` it builds and starts the app
itself, because `deployment_status` workflows do not get secrets on forks.

Releases are automated with release-please. It reads the conventional commits
that commitlint already enforces and keeps a release PR open with the version
bump and generated `CHANGELOG.md`; merging that PR tags the release. Nothing is
published to npm — the package is private and distribution happens through the
registry JSON served from the site.

## Design Guidelines

- **Use animations wisely** — messy-ui is about delightful interactions
- **Keep it accessible** — support keyboard navigation and screen readers
- **Support dark mode** — use `currentColor` or CSS variables
- **Be performant** — lazy load heavy dependencies

## Thank You!

Every contribution makes messy-ui better. If you have questions, feel free to open an issue!
