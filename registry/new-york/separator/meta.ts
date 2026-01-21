import { ComponentMeta } from "@/config/types";

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

// Full component code for manual installation
export const componentCode = `"use client";
import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

// Fixed internal coordinate system for SVG
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 100;

interface SeparatorProps {
  /** Base Y position of the line (0-100) */
  baseY?: number;
  /** Maximum displacement when mouse hovers */
  maxDisplacement?: number;
  /** Height of the hover detection zone in pixels */
  hoverZoneHeight?: number;
  /** Stroke width of the line */
  strokeWidth?: number;
  /** Damping factor (0-1, lower = more oscillations) */
  damping?: number;
  /** Oscillation frequency */
  frequency?: number;
  /** Duration of the wobble animation in seconds */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

export function Separator({
  baseY = 50,
  maxDisplacement = 40,
  hoverZoneHeight = 100,
  strokeWidth = 2,
  damping = 0.15,
  frequency = 8,
  duration = 1.5,
  className = "",
}: SeparatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  // Animation state refs
  const stateRef = useRef<{
    displacement: number;
    controlX: number;
    isInsideViewbox: boolean;
  }>({
    displacement: 0,
    controlX: VIEWBOX_WIDTH / 2,
    isInsideViewbox: false,
  });

  const wobbleTweenRef = useRef<gsap.core.Tween | null>(null);

  const updatePath = useCallback(() => {
    if (!pathRef.current) return;
    const { displacement, controlX } = stateRef.current;
    const controlY = baseY + displacement;
    pathRef.current.setAttribute(
      "d",
      \`M 0 \${baseY} Q \${controlX} \${controlY} \${VIEWBOX_WIDTH} \${baseY}\`
    );
  }, [baseY]);

  // Start damped oscillation from current displacement
  const startOscillation = useCallback(() => {
    // Kill any existing animation
    if (wobbleTweenRef.current) {
      wobbleTweenRef.current.kill();
    }

    const initialDisplacement = stateRef.current.displacement;
    
    // Don't oscillate if barely displaced
    if (Math.abs(initialDisplacement) < 1) {
      stateRef.current.displacement = 0;
      updatePath();
      return;
    }

    // Custom damped sinusoidal oscillation
    // Formula: A * e^(-damping * t) * cos(frequency * t)
    // Using cos so it starts at the current displacement
    const wobbleData = { progress: 0 };
    const amplitude = initialDisplacement;

    wobbleTweenRef.current = gsap.to(wobbleData, {
      progress: 1,
      duration: duration,
      ease: "none",
      onUpdate: () => {
        // t represents actual elapsed time (0 to duration)
        const t = wobbleData.progress * duration;
        // Damped cosine wave: starts at amplitude, oscillates with decay
        // frequency controls oscillations per second
        const decay = Math.exp(-damping * frequency * t);
        const oscillation = Math.cos(frequency * t * Math.PI * 2);
        stateRef.current.displacement = amplitude * decay * oscillation;
        updatePath();
      },
      onComplete: () => {
        stateRef.current.displacement = 0;
        updatePath();
      },
    });
  }, [updatePath, damping, frequency, duration]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      // Check if mouse is inside the viewbox
      const isInside = 
        relativeX >= 0 && 
        relativeX <= rect.width && 
        relativeY >= 0 && 
        relativeY <= rect.height;

      if (isInside) {
        // Mouse is inside - pull string toward mouse position
        if (!stateRef.current.isInsideViewbox) {
          // Just entered the viewbox - kill any running oscillation
          if (wobbleTweenRef.current) {
            wobbleTweenRef.current.kill();
          }
          stateRef.current.isInsideViewbox = true;
        }

        // Calculate displacement based on mouse Y position relative to line
        const lineY = (baseY / 100) * rect.height;
        const distanceFromLine = relativeY - lineY;
        
        // Clamp displacement to maxDisplacement
        const displacement = Math.max(
          -maxDisplacement,
          Math.min(maxDisplacement, distanceFromLine * (maxDisplacement / (rect.height / 2)))
        );

        // Update control point X based on mouse X position (mapped to viewbox coords)
        stateRef.current.controlX = (relativeX / rect.width) * VIEWBOX_WIDTH;
        stateRef.current.displacement = displacement;
        updatePath();

      } else if (stateRef.current.isInsideViewbox) {
        // Mouse just left the viewbox - start oscillation from current displacement
        stateRef.current.isInsideViewbox = false;
        startOscillation();
      }
    };

    const handleMouseLeave = () => {
      if (stateRef.current.isInsideViewbox) {
        // Mouse left the container - start oscillation
        stateRef.current.isInsideViewbox = false;
        startOscillation();
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (wobbleTweenRef.current) {
        wobbleTweenRef.current.kill();
      }
    };
  }, [baseY, maxDisplacement, updatePath, startOscillation]);

  // Initialize path on mount
  useEffect(() => {
    updatePath();
  }, [updatePath]);

  return (
    <div className={\`\${className}\`}>
    <div
      ref={containerRef}
      className={\`text-foreground w-full cursor-pointer \`}
      style={{ height: \`\${hoverZoneHeight}px\` }}
    >
      <svg
        height="100%"
        width="100%"
        viewBox={\`0 0 \${VIEWBOX_WIDTH} \${VIEWBOX_HEIGHT}\`}
        preserveAspectRatio="none"
      >
        <path
          ref={pathRef}
          d={\`M 0 \${baseY} Q \${VIEWBOX_WIDTH / 2} \${baseY} \${VIEWBOX_WIDTH} \${baseY}\`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    </div>
    </div>
  );
}`;

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
