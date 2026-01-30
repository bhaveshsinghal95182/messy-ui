"use client";

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

export default AnimatedCounter;
