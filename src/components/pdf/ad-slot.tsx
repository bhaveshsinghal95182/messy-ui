import Script from 'next/script';

/**
 * A single ad placement for the PDF landing pages.
 *
 * Off unless `NEXT_PUBLIC_ADS_ENABLED` is set, which is deliberate: the pages
 * have no traffic yet, and an ad network at this volume pays approximately
 * nothing while costing the thing that makes these pages worth visiting.
 *
 * Two rules this must keep:
 *
 * 1. **Never inside the editor.** The whole appeal is a tool that does not
 *    interrupt you. Ads live below the fold, in the prose, on landing pages.
 * 2. **EthicalAds, not AdSense.** EthicalAds serves no third-party tracking
 *    cookies and does not profile the reader, so the privacy claim these very
 *    pages make stays literally true. Swapping in a behavioural network would
 *    make this site's central promise misleading.
 */
const AdSlot = ({ id = 'pdf' }: { id?: string }) => {
  const publisher = process.env.NEXT_PUBLIC_ADS_ENABLED;
  if (!publisher) return null;

  return (
    <aside
      aria-label="Sponsored"
      className="text-body mt-12 rounded-lg border p-4"
    >
      <div
        data-ea-publisher={publisher}
        data-ea-type="text"
        data-ea-keywords="pdf|documents|privacy|webdev"
        id={`ea-${id}`}
      />
      <Script
        src="https://media.ethicalads.io/media/client/ethicalads.min.js"
        strategy="lazyOnload"
      />
    </aside>
  );
};

export default AdSlot;
