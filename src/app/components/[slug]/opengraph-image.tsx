import { ImageResponse } from 'next/og';
import { components, getComponentBySlugOrAlias } from '@/config/components';
import { plainText } from '@/lib/text';

export const alt = 'messy-ui component';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Per-component social card.
 *
 * Every component page used to share the same og-image.png, so a link to a
 * counter and a link to a menu looked identical in a tweet or a Discord embed.
 * This renders a unique card per component at build time.
 */
export async function generateStaticParams() {
  return components.map((component) => ({ slug: component.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const component = getComponentBySlugOrAlias(slug);

  const name = component?.name ?? 'messy-ui';
  const category = component?.category ?? 'React Components';
  const description = component
    ? plainText(component.description)
    : 'Animated, accessible React components built with GSAP and Framer Motion.';
  const install = component
    ? `npx shadcn@latest add ${component.registryUrl}`
    : 'npx shadcn@latest add https://messyui.dev/r/[component].json';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#09090b',
        color: '#fafafa',
        padding: '64px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Top row: wordmark + category pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: -1 }}>
          <span style={{ color: '#fafafa' }}>messy</span>
          <span style={{ color: '#a1a1aa' }}>-ui</span>
        </div>
        <div
          style={{
            display: 'flex',
            padding: '10px 24px',
            borderRadius: 999,
            border: '1px solid #27272a',
            color: '#a1a1aa',
            fontSize: 24,
          }}
        >
          {category}
        </div>
      </div>

      {/* Component name + description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#a1a1aa',
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          {description.length > 140
            ? `${description.slice(0, 137)}...`
            : description}
        </div>
      </div>

      {/* Install command */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px 28px',
          borderRadius: 16,
          background: '#131316',
          border: '1px solid #27272a',
          color: '#d4d4d8',
          fontSize: 24,
        }}
      >
        <span style={{ color: '#71717a', marginRight: 12 }}>$</span>
        {install.length > 70 ? `${install.slice(0, 67)}...` : install}
      </div>
    </div>,
    size
  );
}
