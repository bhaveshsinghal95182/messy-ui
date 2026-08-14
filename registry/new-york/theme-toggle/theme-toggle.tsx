'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';
import './theme-toggle.css';

interface ThemeToggleProps {
  /** Additional class names */
  className?: string;
}

/**
 * Where the circular reveal should start, in viewport coordinates.
 *
 * A pointer-driven click carries the cursor position; a keyboard-driven one
 * (Enter/Space) reports `detail === 0` and clientX/clientY of 0, which would
 * otherwise open the circle from the top-left corner of the page.
 */
function getOrigin(
  event: React.MouseEvent<HTMLElement>,
  fallback: HTMLElement | null
): { x: number; y: number } | null {
  if (event.detail > 0) {
    return { x: event.clientX, y: event.clientY };
  }

  if (!fallback) return null;

  const { top, left, width, height } = fallback.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { setTheme, theme } = useTheme();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function themeToggle(event: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    // Fallback for browsers without View Transitions API
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    // Open from the pointer, not from the button's box. The two usually
    // coincide, but the pointer is the position the user is actually looking
    // at, and it can't drift the way a measured rect can. Keyboard activation
    // reports detail === 0 and clientX/Y of 0, so fall back to the button
    // centre there. Both are read synchronously, before any await: sampling
    // after `.ready` reads the layout a frame later, once the theme swap has
    // been flushed, and any scroll or reflow in between moves the origin.
    const origin = getOrigin(event, ref.current);
    if (!origin) return;
    const { x, y } = origin;

    // innerWidth/innerHeight, not documentElement.clientWidth/clientHeight.
    // The clip-path is resolved against ::view-transition-new(root), whose box
    // is the snapshot containing block — the whole window, scrollbar area
    // included. clientWidth excludes the scrollbar, so measuring against it
    // leaves the circle short of the corner by the scrollbar's width.
    // Measuring from the centre (not the top-left) is what makes it reach.
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    }).ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  }

  if (!mounted) {
    return (
      <button
        className={cn('theme-toggle', className)}
        aria-label="Toggle theme"
        disabled
      >
        <span className="theme-toggle__icon">
          <SunIcon />
        </span>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      className={cn('theme-toggle', className)}
      onClick={themeToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      type="button"
    >
      <span className="theme-toggle__icon">
        <span className="theme-toggle__sun" aria-hidden="true">
          <SunIcon />
        </span>
        <span className="theme-toggle__moon" aria-hidden="true">
          <MoonIcon />
        </span>
      </span>
    </button>
  );
};

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="theme-toggle__svg"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="theme-toggle__svg"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export default ThemeToggle;
