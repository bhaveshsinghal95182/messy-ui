import { ComponentMeta, ComponentFileRef } from '@/config/types';

export const usageCode = `import { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator } from "@/components/ui/tabs";

export default function Example() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsIndicator />
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsList />
      </TabsList>
    </Tabs>
  );
}`;

export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'tabs.tsx',
    targetPath: 'components/ui/tabs.tsx',
    sourcePath: './tabs.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'tabs',
  name: 'Tabs',
  category: 'Layout',
  description:
    'Shadcn-compatible tabs component with smooth animations and context awareness, built on Base UI.',
  seoTitle: 'Tabs - React Component | messy-ui',
  seoDescription:
    'Animated, context-aware tabs component using Base UI and Tailwind CSS.',
  keywords: ['tabs', 'slider-tabs', 'animated-tabs', 'base-ui', 'shadcn-tabs'],
  aliases: ['animated-tabs'],
  notes: [
    {
      type: 'warning',
      message: "Don't forget to add <TabsIndicator /> in the TabsList!!!",
    },
    {
      type: 'info',
      message: 'You can use this components just like shadcn tabs.',
    },
  ],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/tabs.json',
  dependencies: ['@base-ui/react'],
  cliDependencies: [
    {
      label: 'Install cn utility',
      commands: {
        npx: 'npx shadcn@latest add lib/utils',
        pnpm: 'pnpm dlx shadcn@latest add lib/utils',
        bun: 'bunx shadcn@latest add lib/utils',
      },
    },
  ],
  props: [],
};

export default meta;
