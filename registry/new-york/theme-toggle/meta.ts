import { ComponentMeta, ComponentFileRef } from "@/config/types";

// Usage example shown in preview Code tab
export const usageCode = `import ThemeToggle from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}`;

// Component files to be loaded at build time
export const componentFiles: ComponentFileRef[] = [
  {
    filename: "theme-toggle.tsx",
    targetPath: "ui/theme-toggle.tsx",
    sourcePath: "./theme-toggle.tsx",
  },
];

// CSS code for manual installation
export const cssCode = `/* Theme Toggle Component CSS - Self-contained styles */

/* View Transition API - Required for clip-path animation */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

.theme-toggle {
  --toggle-size: 2.25rem;
  --toggle-transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--toggle-size);
  height: var(--toggle-size);
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  transition: background var(--toggle-transition);
}

.theme-toggle:hover {
  background: oklch(0.5 0 0 / 10%);
}

.theme-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.theme-toggle__icon {
  position: relative;
  width: 1.2rem;
  height: 1.2rem;
}

.theme-toggle__svg {
  width: 100%;
  height: 100%;
}

.theme-toggle__sun,
.theme-toggle__moon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 
    opacity var(--toggle-transition),
    transform var(--toggle-transition);
}

/* Light mode: Sun visible, Moon hidden */
.theme-toggle__sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-toggle__moon {
  opacity: 0;
  transform: rotate(90deg) scale(0);
}

/* Dark mode: Sun hidden, Moon visible */
.dark .theme-toggle__sun {
  opacity: 0;
  transform: rotate(-90deg) scale(0);
}

.dark .theme-toggle__moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}`;

const meta: ComponentMeta = {
  slug: "theme-toggle",
  name: "Theme Toggle",
  category: "Navigation",
  description:
    "A theme toggle button with a stunning clip-path view transition animation. The theme change expands from the button in a smooth circular reveal effect.",
  seoTitle: "Theme Toggle - React Component | messy-ui",
  seoDescription:
    "A beautiful animated theme toggle with clip-path view transition. Smooth circular reveal animation when switching between dark and light mode. Self-contained CSS. Works with next-themes.",
  keywords: [
    "theme toggle",
    "dark mode toggle",
    "view transition",
    "clip-path animation",
    "theme switcher",
    "circular reveal",
    "next-themes",
    "react theme toggle",
    "animated toggle",
  ],
  aliases: ["theme-switcher", "dark-mode-toggle", "mode-toggle"],
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/theme-toggle.json",
  dependencies: [],
  notes: [
    { type: "info", message: "Requires next-themes to be configured in your app." },
    { type: "tip", message: "The clip-path animation uses View Transitions API with graceful fallback for unsupported browsers." },
    { type: "info", message: "The CSS is self-contained - won't conflict with your existing styles." },
  ],
  cliDependencies: [
    {
      label: "Install next-themes",
      commands: {
        npx: "npm install next-themes",
        pnpm: "pnpm add next-themes",
        bun: "bun add next-themes",
      },
    },
    {
      label: "Install cn utility (if not already installed)",
      commands: {
        npx: "npx shadcn@latest add lib/utils",
        pnpm: "pnpm dlx shadcn@latest add lib/utils",
        bun: "bunx shadcn@latest add lib/utils",
      },
    },
  ],
  snippets: [
    {
      label: "Add theme-toggle.css to your component folder",
      language: "css",
      targetPath: "components/theme-toggle/theme-toggle.css",
      registryType: "registry:style",
      code: cssCode,
    },
  ],
  props: [
    {
      name: "className",
      type: "string",
      default: "undefined",
      description: "Additional CSS classes to apply to the toggle button",
    },
  ],
};

export default meta;
