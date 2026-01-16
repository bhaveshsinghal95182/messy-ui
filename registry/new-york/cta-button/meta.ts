import { ComponentMeta } from "@/config/types";

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

// Full component code for manual installation
export const componentCode = `"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "./utils";

interface CTAButtonProps {
  /** Text to render before the button */
  children?: ReactNode;
  /** Custom icon component (defaults to ArrowRight) */
  icon?: ReactNode;
  /** Main label text */
  label?: string;
  /** Highlighted/italic portion of the label */
  highlightLabel?: string;
  /** Background color hex value for hover state */
  bgColorHex?: string;
  /** Arrow container color before hover (hex value) */
  arrowBgColorBefore?: string;
  /** How far the arrow travels on hover (CSS calc value) */
  arrowTravelDistance?: string;
  /** How much the text shifts left on hover (in pixels) */
  textShift?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Additional className for the button */
  className?: string;
  /** Text color after hover (hex value) */
  textColorAfter?: string;
  /** Icon color before hover (hex value) */
  iconColorBefore?: string;
  /** Icon color after hover (hex value) */
  iconColorAfter?: string;
  /** Click handler */
  onClick?: () => void;
}

const CTAButton = ({
  children,
  icon,
  label = "Browse",
  highlightLabel = "Components",
  bgColorHex = "#ff2056",
  arrowBgColorBefore = "#efb100",
  arrowTravelDistance = "calc(100% + 7.8rem)",
  textShift = -30,
  duration = 0.3,
  className = "",
  textColorAfter = "#fff",
  iconColorBefore = "#000000",
  iconColorAfter = "#fff",
  onClick,
}: CTAButtonProps) => {
  return (
    <motion.button
      className={cn(
        "relative font-semibold text-lg cursor-pointer tracking-tight flex items-center gap-2 overflow-hidden",
        className
      )}
      initial="idle"
      whileHover="hover"
      onClick={onClick}
    >
      {/* Expanding background */}
      <motion.div
        className="absolute inset-0 origin-left"
        style={{ backgroundColor: bgColorHex }}
        variants={{
          idle: { scaleX: 0 },
          hover: { scaleX: 1 },
        }}
        transition={{ duration, ease: "easeOut" }}
      />

      {/* Arrow container - travels from left to right */}
      <motion.div
        className="relative z-10 w-8 h-8 flex items-center justify-center shrink-0"
        variants={{
          idle: { x: 0, backgroundColor: arrowBgColorBefore },
          hover: { x: arrowTravelDistance, backgroundColor: bgColorHex },
        }}
        transition={{ duration, ease: "easeOut" }}
      >
        <motion.span
          variants={{
            idle: { color: iconColorBefore },
            hover: { color: iconColorAfter },
          }}
          transition={{ duration, ease: "easeOut" }}
        >
          {icon ?? <ArrowRight className="h-4 w-4" />}
        </motion.span>
      </motion.div>

      {/* Text content - uses mix-blend-difference for light/dark theme support */}
      <motion.span
        className="relative z-10"
        variants={{
          idle: { x: 0, mixBlendMode: "difference" as const },
          hover: { x: textShift, mixBlendMode: "normal" as const },
        }}
        style={{ color: textColorAfter }}
        transition={{ duration, ease: "easeOut" }}
      >
        {children ?? (
          <>
            {label}{" "}
            {highlightLabel && (
              <span className="font-serif italic tracking-wide">
                {highlightLabel}
              </span>
            )}
          </>
        )}
      </motion.span>
    </motion.button>
  );
};

export default CTAButton;`;

const meta: ComponentMeta = {
  slug: "cta-button",
  name: "CTA Button",
  category: "Buttons",
  description:
    "An animated call-to-action button with a traveling arrow and expanding background effect. Perfect for hero sections and prominent action triggers.",
  seoTitle: "CTA Button - Animated React Component | messy-ui",
  seoDescription:
    "An animated call-to-action button with traveling arrow and expanding background hover effect. Customizable colors, smooth Framer Motion animations. Copy the code and use in your React project.",
  keywords: [
    "cta button",
    "call to action",
    "animated button",
    "hover animation",
    "framer motion button",
    "react button component",
    "hero button",
    "arrow animation",
    "expanding background",
    "motion react",
    "interactive button",
  ],
  aliases: ["action-button", "hero-button", "animated-cta"],
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/cta-button.json",
  dependencies: ["motion", "lucide-react"],
  notes: [
    { type: "info", message: "Uses cn() utility from shadcn/ui. Make sure you have it installed." },
    { type: "tip", message: "Customize arrowTravelDistance to match your button width. Default works well for label + highlightLabel text." },
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
  props: [
    {
      name: "label",
      type: "string",
      default: '"Browse"',
      description: "Main label text shown on the button",
    },
    {
      name: "highlightLabel",
      type: "string",
      default: '"Components"',
      description: "Highlighted/italic portion of the label with serif font",
    },
    {
      name: "bgColorHex",
      type: "string",
      default: '"#ff2056"',
      description: "Background color hex value for the hover state",
    },
    {
      name: "arrowBgColorBefore",
      type: "string",
      default: '"#efb100"',
      description: "Arrow container background color before hover",
    },
    {
      name: "arrowTravelDistance",
      type: "string",
      default: '"calc(100% + 7.8rem)"',
      description: "How far the arrow travels on hover (CSS calc value)",
    },
    {
      name: "textShift",
      type: "number",
      default: "-30",
      description: "How much the text shifts left on hover (in pixels)",
      control: "slider",
      min: -100,
      max: 0,
      step: 5,
    },
    {
      name: "duration",
      type: "number",
      default: "0.3",
      description: "Animation duration in seconds",
      control: "slider",
      min: 0.1,
      max: 1,
      step: 0.05,
    },
    {
      name: "textColorAfter",
      type: "string",
      default: '"#fff"',
      description: "Text color after hover (hex value)",
    },
    {
      name: "iconColorBefore",
      type: "string",
      default: '"#000000"',
      description: "Icon color before hover (hex value)",
    },
    {
      name: "iconColorAfter",
      type: "string",
      default: '"#fff"',
      description: "Icon color after hover (hex value)",
    },
    {
      name: "className",
      type: "string",
      default: '""',
      description: "Additional className for the button",
    },
  ],
};

export default meta;
