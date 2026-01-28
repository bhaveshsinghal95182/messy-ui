import { ComponentMeta, ComponentFileRef } from "@/config/types";

export const usageCode = `import ProgressBar from "@/registry/new-york/progress-bar/progress-bar";

export default function Example() {
  return (
    <div className="relative h-96 w-full overflow-hidden rounded-lg border bg-background">
      <div className="absolute inset-0 overflow-auto">
        <div className="h-[200vh] w-full bg-linear-to-b from-background to-muted p-8">
          <ProgressBar position="top" />
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Scroll Down</h1>
            <p className="text-muted-foreground">The progress bar will indicate your scroll position.</p>
          </div>
        </div>
      </div>
    </div>
  );
}`;

export const componentFiles: ComponentFileRef[] = [
  {
    filename: "progress-bar.tsx",
    targetPath: "components/progress-bar.tsx",
    sourcePath: "./progress-bar.tsx",
  },
];

const meta: ComponentMeta = {
  slug: "progress-bar",
  name: "Progress Bar",
  category: "Elements",
  description: "A reading progress bar that visualizes scroll position.",
  seoTitle: "Progress Bar - React Component | messy-ui",
  seoDescription:
    "A customizable scroll progress bar component for React applications.",
  keywords: [
    "progress bar",
    "scroll progress",
    "reading progress",
    "framer motion",
  ],
  sandbox: "iframe",
  aliases: [],
  registryUrl: "https://messyui.dev/r/progress-bar.json",
  dependencies: ["motion"],
  props: [
    {
      name: "position",
      type: "string",
      default: '"top"',
      description: "Position of the progress bar",
      control: "select",
      options: ["top", "bottom"],
    },
    {
      name: "color",
      type: "string",
      default: '"#eec847"',
      description: "Color of the progress bar",
      control: "select-custom",
      options: ["#eec847", "#3b82f6", "#ef4444", "#22c55e"],
    },
    {
      name: "height",
      type: "number",
      default: "2",
      description: "Height of the progress bar (Tailwind scale)",
      control: "slider",
      min: 1,
      max: 8,
      step: 0.5,
    },
    {
      name: "origin",
      type: "string",
      default: '"left"',
      description: "Transform origin of the animation",
      control: "select-custom",
      options: ["left", "center", "right"],
    },
  ],
};

export default meta;
