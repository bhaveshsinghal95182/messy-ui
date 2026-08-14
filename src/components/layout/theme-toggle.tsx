'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { flushSync } from 'react-dom';

import { Button } from '@/components/ui/button';

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

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const ref = React.useRef<HTMLButtonElement>(null);

  async function themeToggle(event: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    /* Open from the pointer, not from the button's box. The two usually
       coincide, but the pointer is the position the user is actually looking
       at, and it can't drift the way a measured rect can. Keyboard activation
       falls back to the button centre. Both are read synchronously, before any
       await: sampling after `.ready` reads the layout a frame later, once the
       theme swap has been flushed, and any scroll or reflow in between moves
       the origin. */
    const origin = getOrigin(event, ref.current);
    if (!origin) return;
    const { x, y } = origin;

    /* innerWidth/innerHeight, not documentElement.clientWidth/clientHeight.
       The clip-path is resolved against ::view-transition-new(root), whose box
       is the snapshot containing block — the whole window, scrollbar area
       included. clientWidth excludes the scrollbar, so measuring against it
       leaves the circle short of the corner by the scrollbar's width.
       Measuring from the centre (not the top-left) is what makes it reach. */
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

  return (
    <Button ref={ref} variant="ghost" size="icon" onClick={themeToggle}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
