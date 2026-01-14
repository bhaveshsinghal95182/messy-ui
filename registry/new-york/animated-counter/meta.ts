import { ComponentMeta } from "@/config/types";

// Usage example shown in preview Code tab
export const usageCode = `import AnimatedCounter from "@/components/animated-counter";

export default function StatsSection() {
  return (
    <div className="grid grid-cols-3 gap-8">
      <AnimatedCounter target={1234} suffix="+" />
      <AnimatedCounter target={99} prefix="$" suffix="k" duration={1.5} />
      <AnimatedCounter target={500} suffix=" users" />
    </div>
  );
}`;

// Full component code for manual installation
export const componentCode = `"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const MAX_ROTATIONS = 20;

interface AnimatedCounterProps {
  target?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const OdometerDigit = ({
  targetDigit,
  rotations,
  duration = 2,
}: {
  targetDigit: number;
  rotations: number;
  duration?: number;
}) => {
  const digitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!digitRef.current) return;
    const digitHeight = digitRef.current.parentElement?.clientHeight || 72;

    gsap.fromTo(
      digitRef.current,
      { y: 0 },
      { y: -rotations * digitHeight, duration, ease: "power2.out" }
    );
  }, [rotations, duration]);

  const digitCount = Math.ceil(rotations) + 1;
  const digits = Array.from({ length: digitCount }, (_, i) => i % 10);

  return (
    <div className="relative h-[1em] overflow-hidden">
      <div ref={digitRef} className="flex flex-col">
        {digits.map((num, idx) => (
          <span key={idx} className="h-[1em] flex items-center justify-center">
            {num}
          </span>
        ))}
      </div>
    </div>
  );
};

const AnimatedCounter = ({
  target = 1234,
  duration = 2,
  prefix = "",
  suffix = "+",
}: AnimatedCounterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const digitCount = target.toString().length;

  const getDigitData = (position: number) => {
    const divisor = Math.pow(10, position);
    const fullRotations = Math.floor(target / divisor);
    const targetDigit = fullRotations % 10;

    if (fullRotations <= MAX_ROTATIONS) {
      return { targetDigit, rotations: fullRotations };
    }

    const fullCycles = Math.floor(MAX_ROTATIONS / 10);
    return { targetDigit, rotations: fullCycles * 10 + targetDigit };
  };

  const digitData = Array.from({ length: digitCount }, (_, i) => {
    return getDigitData(digitCount - 1 - i);
  });

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    gsap.fromTo(
      containerRef.current,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
    );
  }, []);

  return (
    <div className="flex items-center justify-center p-12">
      <div ref={containerRef} className="text-center">
        <div className="text-6xl font-bold text-primary tabular-nums flex items-center justify-center gap-0">
          {prefix && <span>{prefix}</span>}
          {digitData.map((data, index) => (
            <OdometerDigit
              key={index}
              targetDigit={data.targetDigit}
              rotations={data.rotations}
              duration={duration}
            />
          ))}
          {suffix && <span>{suffix}</span>}
        </div>
        <div className="mt-2 text-muted-foreground text-lg">Active Users</div>
      </div>
    </div>
  );
};

export default AnimatedCounter;`;

const meta: ComponentMeta = {
  slug: "animated-counter",
  name: "Animated Counter",
  category: "Animations",
  description:
    "A number counter that animates from 0 to the target value using GSAP. Great for statistics and metrics.",
  seoTitle: "Animated Counter - React Component | messy-ui",
  seoDescription:
    "A beautiful animated number counter with odometer-style digit rotation using GSAP. Perfect for statistics, metrics, dashboards, and landing page hero sections. Copy the code and use in your React project.",
  keywords: [
    "animated counter",
    "odometer counter",
    "number counter",
    "react counter component",
    "gsap animation",
    "digit animation",
    "statistics animation",
    "number animation react",
    "counting animation",
    "number ticker",
    "animated number",
    "counter component",
  ],
  aliases: ["odometer-counter", "number-counter", "digit-counter"],
  sandbox: "inline",
  registryUrl: "https://messyui.dev/r/animated-counter.json",
  dependencies: ["gsap"],
  notes: [
    { type: "tip", message: "For best results, use tabular-nums font feature on the counter container." },
    { type: "info", message: "This component requires GSAP 3.x or higher." },
  ],
  props: [
    {
      name: "target",
      type: "number",
      default: "1234",
      description: "The target number to count to",
      control: "input",
    },
    {
      name: "duration",
      type: "number",
      default: "2",
      description: "Animation duration in seconds",
      control: "slider",
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: "prefix",
      type: "string",
      default: '""',
      description: "Text before the number",
    },
    {
      name: "suffix",
      type: "string",
      default: '"+"',
      description: "Text after the number",
    },
  ],
};

export default meta;
