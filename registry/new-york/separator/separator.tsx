"use client";
import useMousePosition from "@/hooks/use-mouse-position";
import { useCallback, useMemo, useRef } from "react";

function quadBezier(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

export function Separator() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { x, y } = useMousePosition();

  return (
    <div className="text-foreground">
      <div>{JSON.stringify({ x, y })}</div>
      <svg ref={svgRef} height="100%" width="100%" viewBox="0 0 1000 1000">
        <path
          d={`M 0 50 Q ${x} ${y} 1000 50`}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
