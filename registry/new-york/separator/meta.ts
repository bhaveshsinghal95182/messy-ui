import { ComponentMeta, ComponentFileRef } from "@/config/types";

// Usage example shown in preview Code tab
export const usageCode = `import { Separator } from "@/components/separator";

export default function ContentDivider() {
  return (
    <div className="w-full">
      <h2>Section One</h2>
      <p>Some content here...</p>
      
      <Separator />
      
      <h2>Section Two</h2>
      <p>More content here...</p>
    </div>
  );
}`;

// Component files to be loaded at build time
export const componentFiles: ComponentFileRef[] = [
  {
    filename: "separator.tsx",
    targetPath: "ui/separator.tsx",
    sourcePath: "./separator.tsx",
  },
];

const meta: ComponentMeta = {
  slug: "separator",
  name: "Separator",
  category: "Layout",
  description:
    "An interactive separator with a wobbling string animation. The line bends toward the mouse cursor and oscillates with a satisfying spring effect when released.",
  seoTitle: "Separator - Interactive Wobble Animation | messy-ui",
  seoDescription:
    "An interactive separator component with physics-based wobble animation. The line follows your cursor and bounces back with customizable damping and frequency. Built with GSAP. Copy the code and use in your React project.",
  keywords: [
    "separator",
    "divider",
    "wobble animation",
    "interactive separator",
    "physics animation",
    "spring animation",
    "gsap animation",
    "string physics",
    "react separator",
    "mouse follow",
    "elastic animation",
    "damped oscillation",
  ],
  aliases: ["divider", "wobble-separator", "string-separator"],
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/separator.json",
  dependencies: ["gsap"],
  notes: [
    { type: "tip", message: "Adjust damping (lower = more bouncy) and frequency to customize the wobble feel." },
    { type: "info", message: "Uses GSAP for smooth, performant animations." },
  ],
  cliDependencies: [],
  props: [
    {
      name: "baseY",
      type: "number",
      default: "50",
      description: "Vertical position of the line in viewbox units (0-100)",
      control: "slider",
      min: 10,
      max: 90,
      step: 5,
    },
    {
      name: "maxDisplacement",
      type: "number",
      default: "40",
      description: "Maximum distance the line can bend from center",
      control: "slider",
      min: 10,
      max: 80,
      step: 5,
    },
    {
      name: "hoverZoneHeight",
      type: "number",
      default: "100",
      description: "Height of the hover detection zone in pixels",
      control: "slider",
      min: 50,
      max: 200,
      step: 10,
    },
    {
      name: "strokeWidth",
      type: "number",
      default: "2",
      description: "Thickness of the separator line",
      control: "slider",
      min: 1,
      max: 8,
      step: 0.5,
    },
    {
      name: "damping",
      type: "number",
      default: "0.15",
      description: "Damping factor (0-1, lower = more oscillations)",
      control: "slider",
      min: 0.05,
      max: 0.5,
      step: 0.05,
    },
    {
      name: "frequency",
      type: "number",
      default: "8",
      description: "Oscillation frequency (higher = faster wobble)",
      control: "slider",
      min: 2,
      max: 20,
      step: 1,
    },
    {
      name: "duration",
      type: "number",
      default: "1.5",
      description: "Duration of the wobble animation in seconds",
      control: "slider",
      min: 0.5,
      max: 3,
      step: 0.1,
    },
    {
      name: "className",
      type: "string",
      default: '""',
      description: "Additional CSS classes for custom styling (e.g., width control)",
    },
  ],
};

export default meta;
