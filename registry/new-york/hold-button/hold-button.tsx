"use client";

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
        isHolding && `shadow-lg ${styles.glow}`,
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
          transform: `scaleX(${progress / 100})`,
        }}
      />

      {/* Shimmer effect during hold */}
      {isHolding && (
        <div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"
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

export default HoldButton;

// Add shimmer keyframes to your global CSS:
// @keyframes shimmer {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }
