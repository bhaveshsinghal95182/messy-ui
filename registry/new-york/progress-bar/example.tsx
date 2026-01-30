'use client';

import React from 'react';
import ProgressBar from './progress-bar';

type ExampleProps = Partial<React.ComponentProps<typeof ProgressBar>>;

const sections = [
  {
    title: 'Introduction',
    content:
      'Welcome to the progress bar demonstration. As you scroll down this page, notice how the progress bar at the top (or bottom) of the screen visualizes your current position within the document.',
  },
  {
    title: 'Chapter 1: The Beginning',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  {
    title: 'Chapter 2: The Journey',
    content:
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
  },
  {
    title: 'Chapter 3: The Climax',
    content:
      'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum.',
  },
  {
    title: 'Conclusion',
    content:
      'You have reached the end of the document. The progress bar should now start filling up completely as you near the bottom of the page. Thank you for scrolling through this example.',
  },
];

export default function ProgressBarExample(props: ExampleProps) {
  return (
    <div className="w-full bg-background relative min-h-[300vh]">
      <ProgressBar origin="left" height={2} {...props} />

      <div className="max-w-2xl mx-auto py-20 px-6 space-y-24">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
            Reading Progress
          </h1>
          <p className="text-xl text-muted-foreground">
            A demonstration of the scroll progress indicator.
          </p>
        </header>

        {sections.map((section, i) => (
          <section key={i} className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              {section.title}
            </h2>
            <p className="leading-7 not-first:mt-6 text-lg text-muted-foreground/80">
              {section.content}
            </p>
            {/* Add some extra length to each section to ensure scrolling */}
            <div className="h-64 rounded-lg border bg-muted/20 flex items-center justify-center text-muted-foreground/20 text-sm">
              Visual Content Placeholder
            </div>
            <p className="leading-7 text-muted-foreground/80">
              {section.content}
            </p>
          </section>
        ))}

        <footer className="pt-12 border-t">
          <p className="text-sm text-muted-foreground text-center">
            End of content
          </p>
        </footer>
      </div>
    </div>
  );
}
