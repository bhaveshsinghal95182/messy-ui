'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { components, categories } from '@/config/components';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] =
    useState<string[]>(categories);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const isActive = (slug: string) => pathname === `/components/${slug}`;
  const isHomeActive = pathname === '/';

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background'
        )}
      >
        <ScrollArea className="h-full py-4">
          <div className="px-3 space-y-1">
            {/* Home Link */}
            <Link
              href="/"
              onClick={onClose}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isHomeActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>

            {/* Categories */}
            <div className="pt-4">
              {categories.map((category) => {
                const categoryComponents = components.filter(
                  (c) => c.category === category
                );
                const isExpanded = expandedCategories.includes(category);
                const hasActiveChild = categoryComponents.some((c) =>
                  isActive(c.slug)
                );

                return (
                  <div key={category} className="mb-2">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        hasActiveChild
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{category}</span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </button>

                    {/* Category Items */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-3 border-l border-border pl-3 space-y-1 py-1">
                            {categoryComponents.map((component) => (
                              <Link
                                key={component.slug}
                                href={`/components/${component.slug}`}
                                onClick={onClose}
                                className={cn(
                                  'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                                  isActive(component.slug)
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                {component.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </motion.aside>
    </>
  );
};

export default Sidebar;
