export interface SiteTool {
  name: string;
  description: string;
  href: string;
}

/** Standalone utilities that are available outside the component gallery. */
export const availableTools: SiteTool[] = [
  {
    name: 'Countdown Timer',
    description: 'Preset and custom timers with fullscreen and sound.',
    href: '/timer',
  },
];
