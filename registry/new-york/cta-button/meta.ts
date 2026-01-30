import { ComponentMeta, ComponentFileRef } from '@/config/types';

// Usage example shown in preview Code tab
export const usageCode = `import CTAButton from "@/components/cta-button";

export default function HeroSection() {
  return (
    <div className="flex flex-col gap-4">
      <CTAButton
        label="Browse"
        highlightLabel="Components"
        onClick={() => console.log("Clicked!")}
      />
      
      <CTAButton
        label="Get Started"
        highlightLabel="Now"
        bgColorHex="#6366f1"
        arrowBgColorBefore="#818cf8"
      />
    </div>
  );
}`;

// Component files to be loaded at build time
export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'cta-button.tsx',
    targetPath: 'ui/cta-button.tsx',
    sourcePath: './cta-button.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'cta-button',
  name: 'CTA Button',
  category: 'Buttons',
  description:
    'An animated call-to-action button with a traveling arrow and expanding background effect. Perfect for hero sections and prominent action triggers.',
  seoTitle: 'CTA Button - Animated React Component | messy-ui',
  seoDescription:
    'An animated call-to-action button with traveling arrow and expanding background hover effect. Customizable colors, smooth Framer Motion animations. Copy the code and use in your React project.',
  keywords: [
    'cta button',
    'call to action',
    'animated button',
    'hover animation',
    'framer motion button',
    'react button component',
    'hero button',
    'arrow animation',
    'expanding background',
    'motion react',
    'interactive button',
  ],
  aliases: ['action-button', 'hero-button', 'animated-cta'],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/cta-button.json',
  dependencies: ['motion', 'lucide-react'],
  notes: [
    {
      type: 'info',
      message:
        'Uses cn() utility from shadcn/ui. Make sure you have it installed.',
    },
    {
      type: 'tip',
      message:
        'Customize arrowTravelDistance to match your button width. Default works well for label + highlightLabel text.',
    },
  ],
  cliDependencies: [
    {
      label: 'Install cn utility (if not already installed)',
      commands: {
        npx: 'npx shadcn@latest add lib/utils',
        pnpm: 'pnpm dlx shadcn@latest add lib/utils',
        bun: 'bunx shadcn@latest add lib/utils',
      },
    },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      default: '"Browse"',
      description: 'Main label text shown on the button',
    },
    {
      name: 'highlightLabel',
      type: 'string',
      default: '"Components"',
      description: 'Highlighted/italic portion of the label with serif font',
    },
    {
      name: 'bgColorHex',
      type: 'string',
      default: '"#ff2056"',
      description: 'Background color hex value for the hover state',
    },
    {
      name: 'arrowBgColorBefore',
      type: 'string',
      default: '"#efb100"',
      description: 'Arrow container background color before hover',
    },
    {
      name: 'arrowTravelDistance',
      type: 'string',
      default: '"calc(100% + 7.8rem)"',
      description: 'How far the arrow travels on hover (CSS calc value)',
    },
    {
      name: 'textShift',
      type: 'number',
      default: '-30',
      description: 'How much the text shifts left on hover (in pixels)',
      control: 'slider',
      min: -100,
      max: 0,
      step: 5,
    },
    {
      name: 'duration',
      type: 'number',
      default: '0.3',
      description: 'Animation duration in seconds',
      control: 'slider',
      min: 0.1,
      max: 1,
      step: 0.05,
    },
    {
      name: 'textColorAfter',
      type: 'string',
      default: '"#fff"',
      description: 'Text color after hover (hex value)',
    },
    {
      name: 'iconColorBefore',
      type: 'string',
      default: '"#000000"',
      description: 'Icon color before hover (hex value)',
    },
    {
      name: 'iconColorAfter',
      type: 'string',
      default: '"#fff"',
      description: 'Icon color after hover (hex value)',
    },
    {
      name: 'className',
      type: 'string',
      default: '""',
      description: 'Additional className for the button',
    },
  ],
};

export default meta;
