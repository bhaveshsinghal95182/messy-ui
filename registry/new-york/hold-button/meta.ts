import { ComponentMeta } from "@/config/types";

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

// Full component code for manual installation
export const componentCode = `"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HoldButtonProps {
  /** Text shown initially */
  label?: string;
  /** Text shown while holding */
  holdingLabel?: string;
  /** Text shown after action completes */
  completedLabel?: string;
  /** Duration in milliseconds to hold before action triggers */
  holdDuration?: number;
  /** Callback when hold completes */
  onConfirm?: () => void;
  /** Visual variant */
  variant?: "destructive" | "warning" | "default";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

const HoldButton = ({
  label = "Hold to Delete",
  holdingLabel = "Keep holding...",
  completedLabel = "Deleted!",
  holdDuration = 1500,
  onConfirm,
  variant = "destructive",
  size = "md",
  disabled = false,
  className,
}: HoldButtonProps) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const variantStyles = {
    destructive: {
      base: "bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30 text-red-500 hover:border-red-500/50",
      fill: "bg-gradient-to-r from-red-500 to-red-600",
      completed: "bg-gradient-to-r from-red-600 to-red-700 border-red-600 text-white",
      glow: "shadow-red-500/25",
    },
    warning: {
      base: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500 hover:border-amber-500/50",
      fill: "bg-gradient-to-r from-amber-500 to-orange-500",
      completed: "bg-gradient-to-r from-amber-600 to-orange-600 border-amber-600 text-white",
      glow: "shadow-amber-500/25",
    },
    default: {
      base: "bg-gradient-to-r from-primary/10 to-primary/10 border-primary/30 text-primary hover:border-primary/50",
      fill: "bg-gradient-to-r from-primary to-primary",
      completed: "bg-primary border-primary text-primary-foreground",
      glow: "shadow-primary/25",
    },
  };

  const sizeStyles = {
    sm: "h-9 px-4 text-sm min-w-[120px]",
    md: "h-11 px-6 text-base min-w-[160px]",
    lg: "h-14 px-8 text-lg min-w-[200px]",
  };

  const updateProgress = useCallback(() => {
    if (!startTimeRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min((elapsed / holdDuration) * 100, 100);

    setProgress(newProgress);

    if (newProgress >= 100) {
      // Action triggered!
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsHolding(false);
      setIsCompleted(true);
      onConfirm?.();

      // Reset after showing completed state
      setTimeout(() => {
        setIsCompleted(false);
        setProgress(0);
      }, 1500);
    }
  }, [holdDuration, onConfirm]);

  const startHold = useCallback(() => {
    if (disabled || isCompleted) return;

    setIsHolding(true);
    startTimeRef.current = Date.now();

    // Use requestAnimationFrame-based interval for smooth animation
    intervalRef.current = setInterval(() => {
      updateProgress();
    }, 16); // ~60fps
  }, [disabled, isCompleted, updateProgress]);

  const cancelHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsHolding(false);
    startTimeRef.current = null;

    // Animate progress back to 0
    const currentProgress = progress;
    const steps = 20;
    const stepDuration = 200 / steps;
    let step = 0;

    const animateBack = setInterval(() => {
      step++;
      const newProgress = currentProgress * (1 - step / steps);
      setProgress(Math.max(0, newProgress));

      if (step >= steps) {
        clearInterval(animateBack);
        setProgress(0);
      }
    }, stepDuration);
  }, [progress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentLabel = isCompleted
    ? completedLabel
    : isHolding
    ? holdingLabel
    : label;

  const styles = variantStyles[variant];

  return (
    <button
      ref={buttonRef}
      className={cn(
        // Base styles
        "relative overflow-hidden rounded-lg border-2 font-semibold",
        "transition-all duration-300 ease-out",
        "select-none cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        // Size
        sizeStyles[size],
        // State-based styles
        isCompleted
          ? styles.completed
          : styles.base,
        // Holding state - add glow
        isHolding && \`shadow-lg \${styles.glow}\`,
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      disabled={disabled}
      type="button"
    >
      {/* Progress fill layer */}
      <div
        className={cn(
          "absolute inset-0 origin-left transition-transform duration-75",
          styles.fill
        )}
        style={{
          transform: \`scaleX(\${progress / 100})\`,
        }}
      />

      {/* Shimmer effect during hold */}
      {isHolding && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1s infinite linear",
          }}
        />
      )}

      {/* Label */}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-2",
          "transition-all duration-200",
          // Make text white when more than 50% filled
          progress > 50 && !isCompleted && "text-white"
        )}
      >
        {/* Icon based on state */}
        {isCompleted ? (
          <svg
            className="w-5 h-5 animate-in zoom-in-50 duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : isHolding ? (
          <svg
            className="w-5 h-5 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ) : null}
        {currentLabel}
      </span>
    </button>
  );
};

export default HoldButton;`;

const meta: ComponentMeta = {
  slug: "hold-button",
  name: "Hold Button",
  category: "Buttons",
  description:
    "A confirmation button that fills up while being held, perfect for destructive or irreversible actions. Prevents accidental clicks by requiring a sustained press.",
  seoTitle: "Hold Button - React Component | Bhavesh's UI Library",
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
  registryUrl: "https://bhavesh-ui.vercel.app/r/hold-button.json",
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
