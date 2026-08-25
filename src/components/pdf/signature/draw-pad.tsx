'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface DrawPadProps {
  /** Called with the pad canvas whenever the drawing changes. */
  onChange: (canvas: HTMLCanvasElement | null) => void;
}

const INK_COLORS = [
  { label: 'Black', value: '#111111' },
  { label: 'Blue', value: '#12347a' },
  { label: 'Red', value: '#8a1418' },
];

/**
 * A pad for drawing a signature by hand.
 *
 * Pointer events give mouse, finger and stylus one code path, and
 * `event.pressure` varies the stroke width on a real stylus, which is what
 * makes a drawn signature look written rather than traced.
 *
 * Strokes are collected as points and the whole drawing is repainted each
 * frame rather than appended to. That costs a little per frame and buys
 * resolution independence: the pad can be re-rendered at any backing-store
 * size, so the exported signature is crisp rather than a blown-up screen-sized
 * bitmap.
 */
const DrawPad = ({ onChange }: DrawPadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ x: number; y: number; w: number }[][]>([]);
  const current = useRef<{ x: number; y: number; w: number }[] | null>(null);

  const [color, setColor] = useState(INK_COLORS[0].value);
  const [width, setWidth] = useState(2.5);
  const [hasInk, setHasInk] = useState(false);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;

    for (const stroke of [...strokes.current, current.current ?? []]) {
      if (stroke.length < 2) {
        // A tap should still leave a dot rather than nothing at all.
        if (stroke.length === 1) {
          context.beginPath();
          context.arc(
            stroke[0].x,
            stroke[0].y,
            stroke[0].w / 2,
            0,
            Math.PI * 2
          );
          context.fillStyle = color;
          context.fill();
        }
        continue;
      }
      for (let i = 1; i < stroke.length; i += 1) {
        context.beginPath();
        context.lineWidth = stroke[i].w;
        context.moveTo(stroke[i - 1].x, stroke[i - 1].y);
        context.lineTo(stroke[i].x, stroke[i].y);
        context.stroke();
      }
    }
  }, [color]);

  // Size the backing store to the element, at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const box = canvas.getBoundingClientRect();
      canvas.width = Math.floor(box.width * ratio);
      canvas.height = Math.floor(box.height * ratio);
      const context = canvas.getContext('2d');
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      repaint();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [repaint]);

  useEffect(repaint, [repaint]);

  const pointFrom = (event: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    // A mouse reports pressure 0 or 0.5; only trust it from a real pen.
    const pressure = event.pointerType === 'pen' ? event.pressure || 0.5 : 0.5;
    return {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      w: width * (0.6 + pressure),
    };
  };

  const begin = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    current.current = [pointFrom(event)];
    repaint();
  };

  const extend = (event: React.PointerEvent) => {
    if (!current.current) return;
    current.current.push(pointFrom(event));
    repaint();
  };

  const finish = (event: React.PointerEvent) => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setHasInk(true);
    repaint();
    onChange(canvasRef.current);
  };

  const clear = () => {
    strokes.current = [];
    current.current = null;
    setHasInk(false);
    repaint();
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={begin}
          onPointerMove={extend}
          onPointerUp={finish}
          onPointerCancel={finish}
          // touch-action:none, or a finger drag scrolls the dialog instead of
          // drawing — the single most important line for touch signing.
          className="bg-card h-48 w-full touch-none rounded-md border"
          aria-label="Signature drawing area"
          role="img"
        />
        {/* A baseline to sign on, the way a paper form has one. */}
        <div
          aria-hidden="true"
          className="border-border pointer-events-none absolute inset-x-6 bottom-10 border-b border-dashed"
        />
        {!hasInk && (
          <p className="text-muted-foreground pointer-events-none absolute inset-0 grid place-items-center text-sm">
            Sign here with a mouse, finger or stylus
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          {INK_COLORS.map((ink) => (
            <button
              key={ink.value}
              type="button"
              aria-label={`${ink.label} ink`}
              aria-pressed={color === ink.value}
              onClick={() => setColor(ink.value)}
              className="size-6 rounded-full border-2 data-[active=true]:ring-2"
              data-active={color === ink.value}
              style={{
                background: ink.value,
                borderColor:
                  color === ink.value ? 'var(--primary)' : 'transparent',
              }}
            />
          ))}
        </div>

        <div className="flex min-w-32 flex-1 items-center gap-2">
          <Label htmlFor="pen-width" className="text-xs whitespace-nowrap">
            Pen
          </Label>
          <Slider
            id="pen-width"
            min={1}
            max={6}
            step={0.5}
            value={[width]}
            onValueChange={([value]) => setWidth(value)}
          />
        </div>

        <Button variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser className="size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
};

export default DrawPad;
