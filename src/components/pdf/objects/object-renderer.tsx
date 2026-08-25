'use client';

import { getAssetUrl } from '@/lib/pdf/assets';
import { cn } from '@/lib/utils';
import type { PdfObject, RGB } from '@/lib/pdf/types';

/** RGB in 0-1, as PDF stores it, to a CSS colour. */
export const toCss = (color: RGB, alpha = 1): string =>
  `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;

interface ObjectRendererProps {
  object: PdfObject;
  /** Scale from PDF points to CSS pixels, for stroke widths and font sizes. */
  scale: number;
  selected: boolean;
}

/**
 * Draws one object's appearance.
 *
 * Positioning and hit-testing belong to the object layer; this only paints the
 * inside of an already-placed box. The `switch` is exhaustive — the `never`
 * check at the end means adding an object kind without a renderer fails the
 * build rather than silently rendering nothing.
 */
const ObjectRenderer = ({ object, scale, selected }: ObjectRendererProps) => {
  switch (object.kind) {
    case 'text':
      return (
        <div
          className="h-full w-full overflow-hidden whitespace-pre-wrap break-words"
          style={{
            fontSize: object.size * scale,
            lineHeight: object.lineHeight,
            color: toCss(object.color),
            textAlign: object.align,
            fontWeight: object.bold ? 700 : 400,
            fontStyle: object.italic ? 'italic' : 'normal',
            // Helvetica is the standard-14 face the export uses by default, so
            // the on-screen preview matches what lands in the file.
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          {object.text}
        </div>
      );

    case 'image':
    case 'signature': {
      const url = getAssetUrl(object.assetId);
      if (!url) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- a blob: URL held in memory, not a remote asset
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full"
          style={{
            objectFit:
              object.kind === 'image'
                ? object.fit === 'stretch'
                  ? 'fill'
                  : 'contain'
                : 'contain',
          }}
        />
      );
    }

    case 'shape': {
      const stroke = object.stroke ? toCss(object.stroke) : 'none';
      const fill = object.fill ? toCss(object.fill) : 'none';
      const width = object.strokeWidth * scale;

      if (object.shape === 'rect' || object.shape === 'ellipse') {
        return (
          <div
            className={cn(
              'h-full w-full',
              object.shape === 'ellipse' && 'rounded-[50%]'
            )}
            style={{
              background: fill,
              border: object.stroke ? `${width}px solid ${stroke}` : undefined,
            }}
          />
        );
      }

      // Lines and arrows are drawn corner to corner of their box, which is how
      // they were dragged out in the first place.
      return (
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`arrow-${object.id}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 z" fill={stroke} />
            </marker>
          </defs>
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke={stroke}
            strokeWidth={width}
            vectorEffect="non-scaling-stroke"
            markerEnd={
              object.arrowHead !== 'none'
                ? `url(#arrow-${object.id})`
                : undefined
            }
            markerStart={
              object.arrowHead === 'both'
                ? `url(#arrow-${object.id})`
                : undefined
            }
          />
        </svg>
      );
    }

    case 'ink': {
      if (object.points.length < 2) return null;
      // Points are absolute PDF coordinates; re-express them relative to the
      // object's own box so the SVG scales with it.
      const { x, y, w, h } = object.rect;
      const path = object.points
        .map((point, index) => {
          const px = ((point.x - x) / (w || 1)) * 100;
          // SVG is y-down, PDF is y-up.
          const py = 100 - ((point.y - y) / (h || 1)) * 100;
          return `${index === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
        })
        .join(' ');

      return (
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke={toCss(object.color)}
            strokeWidth={object.strokeWidth * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }

    case 'highlight':
      return (
        <div
          className="h-full w-full"
          style={{
            background: toCss(object.color),
            // Multiply keeps the text underneath readable, which is the whole
            // point of a highlighter rather than a filled box.
            mixBlendMode: 'multiply',
          }}
        />
      );

    case 'whiteout':
      return (
        <div
          className="h-full w-full"
          style={{ background: toCss(object.color) }}
        />
      );

    case 'redaction':
      return (
        <div
          className="relative h-full w-full bg-black"
          // A hatch as well as the fill, so redactions are distinguishable from
          // a black-filled shape at a glance and without relying on colour.
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.25) 6px 8px)',
          }}
        >
          {object.label && (
            <span className="absolute inset-0 grid place-items-center text-[10px] text-white">
              {object.label}
            </span>
          )}
        </div>
      );

    case 'note':
      return (
        <div
          className="grid h-full w-full place-items-center rounded-sm text-xs shadow-sm"
          style={{ background: toCss(object.color) }}
          title={object.body}
        >
          <span aria-hidden="true">💬</span>
        </div>
      );

    case 'link':
      return (
        <div
          className={cn(
            'h-full w-full rounded-xs border border-dashed',
            selected ? 'border-primary' : 'border-primary/40'
          )}
        />
      );

    default: {
      // Exhaustiveness guard: a new object kind without a case fails to compile.
      const never: never = object;
      return never;
    }
  }
};

export default ObjectRenderer;
