import { ComponentMeta, ComponentFileRef } from '@/config/types';

export const usageCode = `import AnimatedMenu from "@/components/animated-menu/animated-menu";

export default function NavigationExample() {
  const menuItems = [
    { title: "Home", href: "/" },
    { title: "Work", href: "/work" },
    { title: "About", href: "/about" },
    { title: "Contact", href: "/contact" },
  ];

  return (
    <div className="min-h-80 overflow-hidden rounded-2xl border bg-background">
      <AnimatedMenu menuItems={menuItems} />
    </div>
  );
}`;

export const componentFiles: ComponentFileRef[] = [
  {
    filename: 'animated-menu.tsx',
    targetPath: 'components/animated-menu/animated-menu.tsx',
    sourcePath: './animated-menu.tsx',
  },
  {
    filename: 'menu-box.tsx',
    targetPath: 'components/animated-menu/menu-box.tsx',
    sourcePath: './menu-box.tsx',
  },
  {
    filename: 'link.tsx',
    targetPath: 'components/animated-menu/link.tsx',
    sourcePath: './link.tsx',
  },
  {
    filename: 'curve.tsx',
    targetPath: 'components/animated-menu/curve.tsx',
    sourcePath: './curve.tsx',
  },
];

const meta: ComponentMeta = {
  slug: 'animated-menu',
  name: 'Animated Menu',
  category: 'Navigation',
  description:
    'A slide-out navigation menu with staggered links, an animated curve accent, and motion-driven transitions. This component is inspired from [Oliver larose tutorial](https://blog.olivierlarose.com/tutorials/curved-menu) and I built this in the library just for fun and learning purposes.',
  seoTitle: 'Animated Menu - React Component | messy-ui',
  seoDescription:
    'A stylish animated navigation menu with slide-in panel motion, staggered link entrances, and a curved background accent for React and Next.js apps.',
  keywords: [
    'animated menu',
    'navigation menu',
    'slide out menu',
    'drawer menu',
    'motion menu',
    'next.js menu',
    'sidebar menu',
    'react navigation',
  ],
  aliases: ['slide-menu', 'navigation-drawer', 'mobile-menu'],
  sandbox: 'inline',
  registryUrl: 'https://messyui.dev/r/animated-menu.json',
  dependencies: ['motion'],
  props: [
    {
      name: 'menuItems',
      type: 'MenuItem[]',
      default:
        '[{ "title": "Home", "href": "/" }, { "title": "Work", "href": "/work" }, { "title": "About", "href": "/about" }]',
      control: 'object-array',
      description:
        'Links shown in the menu, each with a title and an href. Rendered in order, with a staggered entrance.',
    },
  ],
};

export default meta;
