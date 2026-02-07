import { ComponentMeta, ComponentFileRef } from '@/config/types';

export const usageCode = `import BloomColorPicker from "@/components/bloom-color-picker";

export default function Example() {
  return <BloomColorPicker stagger={true} />;
}`;

export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'bloom-color-picker.tsx',
    targetPath: 'components/bloom-color-picker.tsx',
    sourcePath: './bloom-color-picker.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'bloom-color-picker',
  name: 'Bloom Color Picker',
  category: 'Inputs',
  description:
    'A beautiful flower-petal color picker with radial hue selection, saturation and brightness arcs.',
  seoTitle: 'Bloom Color Picker - React Color Picker Component | messy-ui',
  seoDescription:
    'A stunning flower-petal color picker with animated petals, arc-based saturation and brightness controls using Framer Motion.',
  keywords: [
    'color picker',
    'hsl',
    'hue',
    'saturation',
    'brightness',
    'flower',
    'petals',
    'react component',
    'motion',
  ],
  aliases: [
    'flower-color-picker',
    'petal-color-picker',
    'color-wheel',
    'color-selector',
    'radial-color-picker',
    'hsl-picker',
  ],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/bloom-color-picker.json',
  dependencies: ['motion'],
  notes: [
    {
      type: 'tip',
      message: 'Click the center button to expand/collapse the petals',
    },
    {
      type: 'info',
      message:
        'Click petals to select hue, drag arcs to adjust saturation and brightness',
    },
  ],
  cliDependencies: [],
  props: [
    {
      name: 'stagger',
      type: 'boolean',
      default: 'false',
      description: 'Whether to stagger the petal animation when opening',
      control: 'switch',
    },
  ],
};

export default meta;
