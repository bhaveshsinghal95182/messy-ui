import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import GithubIcon from '@/components/ui/github-icon';
import { AnimatedIconHandle } from '@/components/ui/types';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { components, categories } from '@/config/components';

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

const Header = ({ onMenuToggle, isSidebarOpen }: HeaderProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const githubRef = useRef<AnimatedIconHandle>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (slug: string) => {
    router.push(`/components/${slug}`);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onMenuToggle}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <svg
              width="20"
              height="21"
              viewBox="0 0 460 480"
              className="text-primary"
              fill="currentColor"
            >
              <path d="M 42 10 L 98 10 A 32 32 0 0 1 130 42 L 130 438 A 32 32 0 0 1 98 470 L 42 470 A 32 32 0 0 1 10 438 L 10 42 A 32 32 0 0 1 42 10 Z" />
              <path d="M 362 10 L 418 10 A 32 32 0 0 1 450 42 L 450 438 A 32 32 0 0 1 418 470 L 362 470 A 32 32 0 0 1 330 438 L 330 42 A 32 32 0 0 1 362 10 Z" />
              <path d="M 200 70 L 260 70 L 260 70 L 260 110 A 30 30 0 0 1 230 140 L 232 140 A 30 30 0 0 1 200 110 L 200 70 L 200 70 Z" />
              <path d="M 112 10 L 168 10 A 32 32 0 0 1 200 42 L 200 90 L 200 90 L 112 90 A 32 32 0 0 1 80 58 L 80 42 A 32 32 0 0 1 112 10 Z" />
              <path d="M 292 10 L 348 10 A 32 32 0 0 1 380 42 L 380 58 A 32 32 0 0 1 348 90 L 260 90 L 260 90 L 260 42 A 32 32 0 0 1 292 10 Z" />
              <path
                d="M 0 0 C 0 -23.872 -5.76 -32 -32 -32 H 0 Z"
                transform="translate(200, 122)"
              />
              <path
                d="M 0 0 C 0 -23.872 5.76 -32 32 -32 H 0 Z"
                transform="translate(260, 122)"
              />
              <path
                d="M 0 0 C 0 23.872 5.76 32 32 32 H 0 Z"
                transform="translate(200, 38)"
              />
              <path
                d="M 0 0 C 0 23.872 -5.76 32 -32 32 H 0 Z"
                transform="translate(260, 38)"
              />
            </svg>
            <span className="hidden sm:inline-block">
              <span className="italic font-serif">Messy</span> UI
            </span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <Button
            variant="outline"
            className="relative h-9 w-9 p-0 sm:w-64 sm:justify-start sm:px-3 sm:py-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline-flex text-muted-foreground text-sm">
              Search components...
            </span>
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* GitHub Link */}
          <Link
            href="https://github.com/bhaveshsinghal95182/messy-ui"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
            onMouseEnter={() => githubRef.current?.startAnimation()}
            onMouseLeave={() => githubRef.current?.stopAnimation()}
          >
            <GithubIcon size={20} ref={githubRef} />
            <span className="sr-only">GitHub</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Command Palette */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search components..." />
        <CommandList>
          <CommandEmpty>No components found.</CommandEmpty>
          {categories.map((category) => (
            <CommandGroup key={category} heading={category}>
              {components
                .filter((c) => c.category === category)
                .map((component) => (
                  <CommandItem
                    key={component.slug}
                    value={component.name}
                    onSelect={() => handleSelect(component.slug)}
                  >
                    <span>{component.name}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default Header;
