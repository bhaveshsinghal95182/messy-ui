import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface AnimatedCounterProps {
  target?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter = ({
  target = 1234,
  duration = 2,
  prefix = "",
  suffix = "+",
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const obj = { value: 0 };
    
    gsap.to(obj, {
      value: target,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        setCount(Math.round(obj.value));
      },
    });

    // Animate the container
    gsap.fromTo(
      counterRef.current,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
  }, [target, duration]);

  return (
    <div className="flex items-center justify-center p-12">
      <div
        ref={counterRef}
        className="text-center"
      >
        <div className="text-6xl font-bold text-primary tabular-nums">
          {prefix}
          {count.toLocaleString()}
          {suffix}
        </div>
        <div className="mt-2 text-muted-foreground text-lg">
          Active Users
        </div>
      </div>
    </div>
  );
};

export default AnimatedCounter;

export const AnimatedCounterCode = `import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface AnimatedCounterProps {
  target?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter = ({
  target = 1234,
  duration = 2,
  prefix = "",
  suffix = "+",
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const obj = { value: 0 };
    
    gsap.to(obj, {
      value: target,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        setCount(Math.round(obj.value));
      },
    });
  }, [target, duration]);

  return (
    <div className="text-6xl font-bold tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
};`;
