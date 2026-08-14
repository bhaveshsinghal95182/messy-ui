import type { Metadata } from 'next';
import GsapMenu from '@/registry/new-york/animated-menu/animated-menu';

// Scratch route - kept out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return (
    <div className="">
      <GsapMenu />
    </div>
  );
}
