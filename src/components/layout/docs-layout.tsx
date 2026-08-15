'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './header';
import Sidebar from './sidebar';

interface DocsLayoutProps {
  children: React.ReactNode;
}

const DocsLayout = ({ children }: DocsLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // /timer is a standalone fullscreen utility, so it opts out of the docs chrome.
  if (pathname?.startsWith('/preview') || pathname?.startsWith('/timer')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-[calc(100vh-3.5rem)]">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DocsLayout;
