'use client';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { MenuBox, type MenuItem } from './menu-box';

const defaultMenuItems: MenuItem[] = [
  { title: 'Home', href: '/' },
  { title: 'Work', href: '/work' },
  { title: 'About', href: '/about' },
];

interface AnimatedMenuProps {
  menuItems?: MenuItem[];
}

export default function AnimatedMenu({ menuItems }: AnimatedMenuProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      <button
        type="button"
        // The trigger renders two bars and no text, so it needs an explicit
        // name and state - without them it reaches assistive tech as an
        // unlabelled button with no indication of whether the menu is open.
        aria-label={isActive ? 'Close menu' : 'Open menu'}
        aria-expanded={isActive}
        className="m-5 w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center z-10 relative"
        onClick={() => setIsActive((prev) => !prev)}
      >
        <span
          className={`absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 bg-white transition-all duration-300 ${
            isActive ? 'rotate-45' : '-translate-y-1'
          }`}
        />

        <span
          className={`absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 bg-white transition-all duration-300 ${
            isActive ? '-rotate-45' : 'translate-y-1'
          }`}
        />
      </button>
      <AnimatePresence mode="wait">
        {isActive && <MenuBox menuItems={menuItems ?? defaultMenuItems} />}
      </AnimatePresence>
    </>
  );
}
