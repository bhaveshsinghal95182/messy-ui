"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        {children ? (
          <>{children}</>
        ) : (
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

export default CTAButton;
