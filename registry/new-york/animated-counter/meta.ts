import { ComponentMeta, ComponentFileRef } from '@/config/types';

// Usage example shown in preview Code tab
export const usageCode = `import AnimatedCounter from "@/components/animated-counter";

export default function StatsSection() {
  return (
    <div className="grid grid-cols-3 gap-8">
      <AnimatedCounter target={1234} suffix="+" />
      <AnimatedCounter target={99} prefix="$" suffix="k" duration={1.5} />
      <AnimatedCounter target={500} suffix=" users" />
    </div>
  );
}`;

// Component files to be loaded at build time
export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'animated-counter.tsx',
    targetPath: 'ui/animated-counter.tsx',
    sourcePath: './animated-counter.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'animated-counter',
  name: 'Animated Counter',
  category: 'Animations',
  description:
    'A number counter that animates from 0 to the target value using GSAP. Great for statistics and metrics.',
  seoTitle: 'Animated Counter - React Component | messy-ui',
  seoDescription:
    'A beautiful animated number counter with odometer-style digit rotation using GSAP. Perfect for statistics, metrics, dashboards, and landing page hero sections. Copy the code and use in your React project.',
  keywords: [
    'animated counter',
    'odometer counter',
    'number counter',
    'react counter component',
    'gsap animation',
    'digit animation',
    'statistics animation',
    'number animation react',
    'counting animation',
    'number ticker',
    'animated number',
    'counter component',
  ],
  aliases: ['odometer-counter', 'number-counter', 'digit-counter'],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/animated-counter.json',
  dependencies: ['gsap'],
  notes: [
    {
      type: 'tip',
      message:
        'For best results, use tabular-nums font feature on the counter container.',
    },
    { type: 'info', message: 'This component requires GSAP 3.x or higher.' },
  ],
  props: [
    {
      name: 'target',
      type: 'number',
      default: '1234',
      description: 'The target number to count to',
      control: 'input',
    },
    {
      name: 'duration',
      type: 'number',
      default: '2',
      description: 'Animation duration in seconds',
      control: 'slider',
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'prefix',
      type: 'string',
      default: '""',
      description: 'Text before the number',
    },
    {
      name: 'suffix',
      type: 'string',
      default: '"+"',
      description: 'Text after the number',
    },
  ],
};

export default meta;
