/**
 * The shared social card for every /pdf page.
 *
 * Until this existed all sixteen tool pages fell back to the site-wide
 * og-image.png, which advertises a React animation library — so a link to the
 * PDF signer previewed in Slack or on X as something unrelated. The layout
 * deliberately mirrors `app/components/[slug]/opengraph-image.tsx` so the two
 * families of page look like they come from the same site.
 */

export const alt = 'messy-ui PDF tools';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface CardProps {
  eyebrow: string;
  heading: string;
  description: string;
}

export function pdfCard({ eyebrow, heading, description }: CardProps) {
  return (
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
          {eyebrow}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.05,
          }}
        >
          {heading.length > 42 ? `${heading.slice(0, 39)}...` : heading}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#a1a1aa',
            lineHeight: 1.35,
            maxWidth: 940,
          }}
        >
          {description.length > 140
            ? `${description.slice(0, 137)}...`
            : description}
        </div>
      </div>

      {/* The claim that separates this from every other online PDF tool. */}
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
        <span style={{ color: '#4ade80', marginRight: 12 }}>&#9679;</span>
        Runs in your browser — no upload, no account, no watermark
      </div>
    </div>
  );
}
