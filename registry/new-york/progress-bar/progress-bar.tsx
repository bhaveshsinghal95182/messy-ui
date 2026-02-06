'use client';

import * as React from 'react';
import { motion, useScroll } from 'motion/react';

import { cn } from '@/lib/utils';

/**
 * Props for the ProgressBar component.
 */
interface ProgressBarProps extends React.ComponentProps<typeof motion.div> {
  /**
   * Custom CSS classes for the progress bar.
   */
  className?: string;
  /**
   * The color of the progress bar in hex format .
   * @default "#eec847"
   */
  color?: string;
  /**
   * The position of the progress bar on the viewport.
   * @default "top"
   */
  position?: 'top' | 'bottom';
  /**
   * The height of the progress bar. Corresponds to Tailwind's height scale (e.g. 1, 4, 7.5).
   * @default 2
   */
  height?: number;
  /**
   * The transform origin of the progress bar animation.
   * Can be "left", "right", "center", or a percentage value (number).
   */
  origin: number | 'left' | 'right' | 'center';
}

/**
 * A progress bar component that visualizes scroll progress.
 * Automatically attaches to the viewport top or bottom.
 */
const ProgressBar = ({
  origin,
  className,
  color,
  position = 'top',
  height,
  ...props
}: ProgressBarProps) => {
  const { scrollYProgress } = useScroll();

  const heightValue =
    typeof height === 'number' ? `${height * 0.25}rem` : height;

  const originValue =
    origin === 'left'
      ? '0%'
      : origin === 'right'
        ? '100%'
        : origin === 'center'
          ? '50%'
          : typeof origin === 'number'
            ? `${origin}%`
            : origin;

  return (
    <motion.div
      className={cn(
        'fixed left-0 right-0 z-100 bg-[#eec847] h-2',
        className,
        position === 'top' ? 'top-0' : 'bottom-0'
      )}
      style={{
        scaleX: scrollYProgress,
        ...(color ? { backgroundColor: color } : {}),
        ...(height ? { height: heightValue } : {}),
        transformOrigin: originValue,
      }}
      {...props}
    />
  );
};

export default ProgressBar;
