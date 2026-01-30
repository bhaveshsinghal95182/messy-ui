import { ComponentMeta, ComponentFileRef } from '@/config/types';

export const usageCode = `import { LiquidSlider } from "@/components/ui/liquid-slider";

export default function Example() {
  return (
    <div className="flex justify-center p-10">
      <LiquidSlider defaultValue={50} />
    </div>
  );
}`;

export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'liquid-sidebar.tsx',
    targetPath: 'ui/liquid-slider.tsx',
    sourcePath: './liquid-sidebar.tsx',
  },
  {
    filename: 'filter.tsx',
    targetPath: 'ui/filter.tsx',
    sourcePath: './filter.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'liquid-slider',
  name: 'Liquid Slider',
  category: 'Inputs',
  description:
    'A fluid, interactive slider component with liquid metal effects using Framer Motion and SVG filters. Perfect for premium UI controls.',
  seoTitle: 'Liquid Slider - React Component | messy-ui',
  seoDescription:
    'A beautiful liquid slider component with organic morphing effects and physics-based interactions. Built with Framer Motion and SVG filters.',
  keywords: [
    'slider',
    'range input',
    'liquid effect',
    'framer motion',
    'svg filter',
    'gooey effect',
    'react slider',
    'custom slider',
  ],
  aliases: ['liquid-sidebar', 'fluid-slider'],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/liquid-slider.json',
  dependencies: ['motion'],
  props: [
    {
      name: 'size',
      type: 'enum',
      default: 'md',
      description: 'Size of the slider',
      options: ['xs', 'sm', 'md', 'lg'],
      control: 'select',
    },
    {
      name: 'defaultValue',
      type: 'number',
      default: '50',
      description: 'Default value',
      control: 'input',
    },
    {
      name: 'min',
      type: 'number',
      default: '0',
      description: 'Minimum value',
      control: 'input',
    },
    {
      name: 'max',
      type: 'number',
      default: '100',
      description: 'Maximum value',
      control: 'input',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disable interaction',
      control: 'switch',
    },
  ],
};

export default meta;
