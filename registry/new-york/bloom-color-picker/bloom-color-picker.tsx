'use client';

import { useId, useState } from 'react';
import { motion } from 'motion/react';

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Saturation arc geometry
const SAT_ARC_RADIUS = 80;
const SAT_ARC_START = (-35 * Math.PI) / 180;
const SAT_ARC_END = (35 * Math.PI) / 180;

const polarToCartesian = (angle: number, radius: number) => ({
  x: Math.cos(angle) * radius,
  y: Math.sin(angle) * radius,
});

const satArcPath = (() => {
  const start = polarToCartesian(SAT_ARC_START, SAT_ARC_RADIUS);
  const end = polarToCartesian(SAT_ARC_END, SAT_ARC_RADIUS);
  return `M ${start.x},${start.y} A ${SAT_ARC_RADIUS},${SAT_ARC_RADIUS} 0 0 1 ${end.x},${end.y}`;
})();

// Brightness arc geometry
const BRIGHT_ARC_RADIUS = 80;
const BRIGHT_ARC_START = (55 * Math.PI) / 180;
const BRIGHT_ARC_END = (125 * Math.PI) / 180;

const brightArcPath = (() => {
  const start = polarToCartesian(BRIGHT_ARC_START, BRIGHT_ARC_RADIUS);
  const end = polarToCartesian(BRIGHT_ARC_END, BRIGHT_ARC_RADIUS);
  return `M ${start.x},${start.y} A ${BRIGHT_ARC_RADIUS},${BRIGHT_ARC_RADIUS} 0 0 1 ${end.x},${end.y}`;
})();

export default function BloomColorPicker({
  stagger = false,
}: {
  stagger?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState(false);
  const [hsl, setHsl] = useState({ h: 0, s: 100, l: 50 });

  const totalCircles = 16;
  const arcCoverage = 360;

  const hexColor = hslToHex(hsl.h, hsl.s, hsl.l);

  // Saturation thumb position along the arc
  const satThumbAngle =
    SAT_ARC_START + (hsl.s / 100) * (SAT_ARC_END - SAT_ARC_START);
  const satThumb = polarToCartesian(satThumbAngle, SAT_ARC_RADIUS);

  // Brightness thumb position along the arc
  const brightThumbAngle =
    BRIGHT_ARC_START + (hsl.l / 100) * (BRIGHT_ARC_END - BRIGHT_ARC_START);
  const brightThumb = polarToCartesian(brightThumbAngle, BRIGHT_ARC_RADIUS);

  const updateSatFromPointer = (e: React.PointerEvent) => {
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const clamped = Math.max(SAT_ARC_START, Math.min(SAT_ARC_END, angle));
    const s = ((clamped - SAT_ARC_START) / (SAT_ARC_END - SAT_ARC_START)) * 100;
    setHsl((prev) => ({ ...prev, s }));
  };

  const updateBrightFromPointer = (e: React.PointerEvent) => {
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const clamped = Math.max(BRIGHT_ARC_START, Math.min(BRIGHT_ARC_END, angle));
    const l =
      ((clamped - BRIGHT_ARC_START) / (BRIGHT_ARC_END - BRIGHT_ARC_START)) *
      100;
    setHsl((prev) => ({ ...prev, l }));
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: totalCircles }).map((_, i) => {
          const angle = (i * arcCoverage) / totalCircles;
          const radian = (angle * Math.PI) / 180;
          const hex = hslToHex(angle, 100, 50);

          return (
            // petals
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={
                active
                  ? {
                      x: Math.cos(radian) * 60,
                      y: Math.sin(radian) * 60,
                      opacity: 1,
                    }
                  : { x: 0, y: 0, opacity: 0.9 }
              }
              transition={{ duration: 0.5, delay: stagger ? i * 0.05 : 0 }}
              style={{ backgroundColor: hex }}
              className="petal absolute w-8 h-8 rounded-full cursor-pointer pointer-events-auto "
              onClick={() => setHsl((prev) => ({ ...prev, h: angle }))}
            />
          );
        })}
        {/* saturation arc*/}
        <motion.svg
          width="230"
          height="200"
          viewBox="-100 -100 200 200"
          className="absolute pointer-events-none "
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-95px',
            marginTop: '-100px',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={
            active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
          }
          transition={{ duration: 0.5 }}
        >
          <defs>
            <linearGradient id={`sat-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hslToHex(hsl.h, 0, hsl.l)} />
              <stop offset="100%" stopColor={hslToHex(hsl.h, 100, hsl.l)} />
            </linearGradient>
          </defs>
          {/* invisible wider hit area */}
          <path
            d={satArcPath}
            stroke="transparent"
            strokeWidth={28}
            fill="none"
            className="pointer-events-auto cursor-pointer"
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              updateSatFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) updateSatFromPointer(e);
            }}
          />
          {/* visible gradient arc */}
          <path
            d={satArcPath}
            stroke={`url(#sat-${uid})`}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
            className="pointer-events-none"
          />
          {/* thumb */}
          <motion.circle
            cx={satThumb.x}
            cy={satThumb.y}
            r={8}
            fill="white"
            className="pointer-events-none"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
            animate={{ cx: satThumb.x, cy: satThumb.y }}
            transition={{ duration: 0.1 }}
          />
        </motion.svg>
        {/* brightness arc (SVG) */}
        <motion.svg
          width="190"
          height="230"
          viewBox="-100 -100 200 200"
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-95px',
            marginTop: '-100px',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={
            active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
          }
          transition={{ duration: 0.5 }}
        >
          <defs>
            <linearGradient id={`bright-${uid}`} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="50%" stopColor={hslToHex(hsl.h, hsl.s, 50)} />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          {/* invisible wider hit area for brightness */}
          <path
            d={brightArcPath}
            stroke="transparent"
            strokeWidth={28}
            fill="none"
            className="pointer-events-auto cursor-pointer"
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              updateBrightFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) updateBrightFromPointer(e);
            }}
          />
          {/* visible gradient arc for brightness */}
          <path
            d={brightArcPath}
            stroke={`url(#bright-${uid})`}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
            className="pointer-events-none"
          />
          {/* brightness thumb */}
          <motion.circle
            cx={brightThumb.x}
            cy={brightThumb.y}
            r={8}
            fill="white"
            className="pointer-events-none"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
            animate={{ cx: brightThumb.x, cy: brightThumb.y }}
            transition={{ duration: 0.1 }}
          />
        </motion.svg>
      </div>
      {/* center color button */}
      <motion.div
        className="relative z-10 w-8 h-8 border-2 border-white cursor-pointer shadow-md"
        style={{ backgroundColor: hexColor }}
        animate={
          active
            ? { rotate: 90, borderRadius: '100%' }
            : { rotate: 0, borderRadius: '20%' }
        }
        onClick={() => setActive(!active)}
      ></motion.div>
    </div>
  );
}
