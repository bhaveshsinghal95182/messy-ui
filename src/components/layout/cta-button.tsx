"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode } from "react";

interface CTAButtonProps {
  /** The URL to navigate to when clicked */
  href?: string;
  /** Main label text */
  label?: string;
  /** Highlighted/italic portion of the label */
  highlightLabel?: string;
  /** Custom icon component (defaults to ArrowRight) */
  icon?: ReactNode;
  /** Background color for hover state (Tailwind class) */
  bgColorClass?: string;
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
  /** Text color before hover (hex value) */
  textColorBefore?: string;
  /** Text color after hover (hex value) */
  textColorAfter?: string;
  /** Icon color before hover (hex value) */
  iconColorBefore?: string;
  /** Icon color after hover (hex value) */
  iconColorAfter?: string;
}

const CTAButton = ({
  href = "/components",
  label = "Browse",
  highlightLabel = "Components",
  icon,
  bgColorClass = "bg-rose-500",
  bgColorHex = "#ff2056",
  arrowBgColorBefore = "#efb100",
  arrowTravelDistance = "calc(100% + 7.8rem)",
  textShift = -30,
  duration = 0.3,
  className = "",
  textColorBefore = "currentColor",
  textColorAfter = "#fff",
  iconColorBefore = "#000000",
  iconColorAfter = "#fff",
}: CTAButtonProps) => {
  return (
    <div className="flex justify-center lg:justify-start">
      <Link href={href}>
        <motion.button
          className={`relative font-semibold text-lg font-sans cursor-pointer tracking-tight flex items-center gap-2 overflow-hidden ${className}`}
          initial="idle"
          whileHover="hover"
        >
          {/* Expanding background */}
          <motion.div
            className={`absolute inset-0 ${bgColorClass} origin-left`}
            variants={{
              idle: { scaleX: 0 },
              hover: { scaleX: 1 },
            }}
            transition={{ duration, ease: "easeOut" }}
          />

          {/* Arrow container - travels from left to right */}
          <motion.div
            className={`relative z-10 ${bgColorClass} w-8 h-8 flex items-center justify-center shrink-0`}
            variants={{
              idle: { x: 0, backgroundColor: arrowBgColorBefore ?? bgColorHex },
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

          {/* Text content */}
          <motion.span
            className="relative z-10"
            variants={{
              idle: { x: 0, color: textColorBefore },
              hover: { x: textShift, color: textColorAfter },
            }}
            transition={{ duration, ease: "easeOut" }}
          >
            {label}{" "}
            {highlightLabel && (
              <span className="font-serif italic tracking-wide">
                {highlightLabel}
              </span>
            )}
          </motion.span>
        </motion.button>
      </Link>
    </div>
  );
};

export default CTAButton;
