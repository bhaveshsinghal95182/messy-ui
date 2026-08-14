'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Info, AlertTriangle, Lightbulb, ChevronDown } from 'lucide-react';
import { InstallationNote } from '@/config/types';
import { cn } from '@/lib/utils';

const noteStyles: Record<
  InstallationNote['type'],
  { icon: typeof Info; className: string; label: string }
> = {
  info: { icon: Info, className: 'callout-info', label: 'Note' },
  warning: {
    icon: AlertTriangle,
    className: 'callout-warning',
    label: 'Heads up',
  },
  tip: { icon: Lightbulb, className: 'callout-tip', label: 'Tip' },
};

/** How far each collapsed card peeks out from behind the one in front. */
const PEEK_Y = 8;
/** How much each collapsed card shrinks relative to the one in front. */
const SCALE_STEP = 0.04;
/** Cards deeper than this are faded out — a deck reads as a deck at ~3. */
const MAX_VISIBLE = 3;
/** Vertical gap between cards once the deck is open. */
const GAP = 8;

/* useLayoutEffect warns during SSR; the measurement it guards is browser-only. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface NoteStackProps {
  notes: InstallationNote[];
  className?: string;
}

const NoteCard = ({
  note,
  trailing,
}: {
  note: InstallationNote;
  trailing?: React.ReactNode;
}) => {
  const style = noteStyles[note.type];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        'callout flex items-start gap-3 rounded-xl py-3 pl-5 pr-4',
        style.className
      )}
    >
      <span className="callout-icon flex size-7 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="callout-label text-[0.6875rem] font-semibold uppercase tracking-wider">
          {style.label}
        </p>
        <p className="text-sm text-foreground">{note.message}</p>
      </div>
      {trailing}
    </div>
  );
};

/**
 * Renders installation notes as a stacked deck, the way a notification centre
 * collapses a run of alerts. Hover or focus fans the deck out; a click pins it
 * open so it stays readable while scrolling past.
 *
 * Motion here is plain CSS transitions rather than framer, deliberately. The
 * open/closed geometry is written straight into inline styles on render, so the
 * resting layout is correct even if the tween never runs — a framer `animate`
 * pass left the deck at `transform: none` with no height whenever its rAF loop
 * did not drive, and a `layout` pass fought the depth transform and stuck the
 * cards shut. Transitions only decorate a layout that is already right.
 *
 * Cards are absolutely positioned in both states and moved only by transform, so
 * nothing reflows. That costs one measurement: the open offsets are cumulative
 * card heights. Cards render in normal flow until measured, so the pre-JS
 * rendering is a plain readable list and the swap happens before paint.
 *
 * A single note skips the stacking entirely — a deck of one is just a card.
 */
const NoteStack = ({ notes, className }: NoteStackProps) => {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const isStack = notes.length > 1;
  const measured =
    heights.length === notes.length && heights.every((h) => h > 0);
  // Reduced motion gets the plain open list: a deck that only resolves itself
  // through movement is not much use without the movement.
  const open = pinned || hovered || !!reduceMotion;

  // Measured off the container's children rather than a per-card ref array —
  // the ref-array version silently measured nothing and the deck stayed zeroed.
  useIsomorphicLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !isStack) return;

    const measureAll = () => {
      const next = Array.from(el.children).map(
        (c) => (c as HTMLElement).offsetHeight
      );
      setHeights((prev) =>
        next.length === prev.length && next.every((h, i) => h === prev[i])
          ? prev
          : next
      );
    };

    measureAll();
    // Card height depends on text wrap, which depends on width.
    const ro = new ResizeObserver(measureAll);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [isStack, notes.length]);

  if (!isStack) {
    return (
      <div className={className}>
        <NoteCard note={notes[0]} />
      </div>
    );
  }

  const visibleCount = Math.min(notes.length, MAX_VISIBLE);
  const offsetFor = (i: number) =>
    heights.slice(0, i).reduce((sum, h) => sum + h + GAP, 0);
  const containerHeight = open
    ? heights.reduce((sum, h) => sum + h, 0) + GAP * (notes.length - 1)
    : (heights[0] ?? 0) + PEEK_Y * (visibleCount - 1);

  const ease = 'cubic-bezier(0.32, 0.72, 0, 1)';

  return (
    <div className={className}>
      <div
        ref={listRef}
        className={cn(
          'relative cursor-pointer',
          !measured && 'space-y-2',
          'motion-reduce:transition-none'
        )}
        style={
          measured
            ? { height: containerHeight, transition: `height 380ms ${ease}` }
            : undefined
        }
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPinned((p) => !p);
          }
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${notes.length} notes about this component. ${
          open ? 'Collapse' : 'Expand'
        }.`}
      >
        {notes.map((note, i) => {
          const buried = !open && i >= MAX_VISIBLE;
          const y = open ? offsetFor(i) : i * PEEK_Y;
          const scale = open ? 1 : 1 - i * SCALE_STEP;
          return (
            <div
              key={i}
              className={cn(
                measured && 'absolute inset-x-0 top-0',
                'motion-reduce:transition-none'
              )}
              style={{
                zIndex: notes.length - i,
                transformOrigin: 'top center',
                ...(measured
                  ? {
                      transform: `translateY(${y}px) scale(${scale})`,
                      opacity: buried ? 0 : 1,
                      transition: `transform 380ms ${ease}, opacity 220ms ease-out`,
                    }
                  : null),
                // The peeking edges must not swallow the click.
                pointerEvents: measured && !open && i > 0 ? 'none' : 'auto',
              }}
            >
              <NoteCard
                note={note}
                trailing={
                  i === 0 && !open ? (
                    <span className="callout-label ml-auto shrink-0 self-center text-xs font-semibold tabular-nums">
                      +{notes.length - 1}
                    </span>
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {/* Affordance, parked outside the animated box so it does not ride the
          height transition. */}
      <div
        aria-hidden="true"
        className={cn(
          'flex justify-center pt-1 text-muted-foreground transition-opacity duration-200 motion-reduce:transition-none',
          open ? 'opacity-0' : 'opacity-100'
        )}
      >
        <ChevronDown className="size-3.5" />
      </div>
    </div>
  );
};

export default NoteStack;
