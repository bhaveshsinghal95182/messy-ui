import { ComponentMeta, ComponentFileRef } from "@/config/types";

// Usage example shown in preview Code tab
export const usageCode = `import HoldButton from "@/components/hold-button";

export default function DangerZone() {
  const handleDelete = () => {
    console.log("Item deleted!");
    // Perform your destructive action here
  };

  return (
    <div className="space-y-4">
      <HoldButton
        label="Hold to Delete"
        holdingLabel="Keep holding..."
        completedLabel="Deleted!"
        holdDuration={1500}
        onConfirm={handleDelete}
        variant="destructive"
      />
      
      <HoldButton
        label="Hold to Reset"
        variant="warning"
        onConfirm={() => console.log("Reset!")}
      />
    </div>
  );
}`;

// Component files to be loaded at build time
export const componentFiles: ComponentFileRef[] = [
  {
    filename: "hold-button.tsx",
    targetPath: "ui/hold-button.tsx",
    sourcePath: "./hold-button.tsx",
  },
];

const meta: ComponentMeta = {
  slug: "hold-button",
  name: "Hold Button",
  category: "Buttons",
  description:
    "A confirmation button that fills up while being held, perfect for destructive or irreversible actions. Prevents accidental clicks by requiring a sustained press.",
  seoTitle: "Hold Button - React Component | messy-ui",
  seoDescription:
    "A hold-to-confirm button component with smooth fill animation for destructive actions. Prevents accidental clicks by requiring users to hold the button. Includes multiple variants, sizes, and visual feedback. Copy the code and use in your React project.",
  keywords: [
    "hold button",
    "hold to confirm",
    "confirmation button",
    "destructive button",
    "delete button",
    "press and hold",
    "react button component",
    "animated button",
    "safe delete",
    "progress button",
    "hold to delete",
    "long press button",
  ],
  aliases: ["hold-to-confirm", "press-hold-button", "destructive-button"],
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/hold-button.json",
  dependencies: [],
  notes: [
    { type: "tip", message: "Add the shimmer keyframe animation to your globals.css for the shimmer effect during hold." },
    { type: "info", message: "Uses cn() utility from shadcn/ui. Make sure you have it installed." },
  ],
  cliDependencies: [
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
      label: "Add shimmer animation to globals.css",
      language: "css",
      targetPath: "styles/hold-button-shimmer.css",
      registryType: "registry:style",
      code: `/* Shimmer animation for HoldButton */
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 1s infinite linear;
  background-size: 200% 100%;
}`,
    },
  ],
  props: [
    {
      name: "label",
      type: "string",
      default: '"Hold to Delete"',
      description: "Text shown initially on the button",
    },
    {
      name: "holdingLabel",
      type: "string",
      default: '"Keep holding..."',
      description: "Text shown while the button is being held",
    },
    {
      name: "completedLabel",
      type: "string",
      default: '"Deleted!"',
      description: "Text shown after the action completes",
    },
    {
      name: "holdDuration",
      type: "number",
      default: "1500",
      description: "Duration in milliseconds to hold before action triggers",
      control: "slider",
      min: 500,
      max: 5000,
      step: 100,
    },
    {
      name: "variant",
      type: '"destructive" | "warning" | "default"',
      default: '"destructive"',
      description: "Visual style variant of the button",
      control: "select",
    },
    {
      name: "size",
      type: '"sm" | "md" | "lg"',
      default: '"md"',
      description: "Size of the button",
      control: "select",
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Whether the button is disabled",
      control: "switch",
    },
  ],
};

export default meta;
