/**
 * The commercial licence for the PDF toolkit.
 *
 * Kept in config rather than hard-coded into the page so the price, the tiers
 * and the checkout destination can change without touching markup — and so the
 * checkout URL can be supplied per-environment rather than committed.
 */

export interface KitTier {
  id: string;
  name: string;
  price: number;
  currency: 'USD';
  tagline: string;
  seats: string;
  features: string[];
  highlighted?: boolean;
}

export const KIT_TIERS: KitTier[] = [
  {
    id: 'personal',
    name: 'Personal',
    price: 49,
    currency: 'USD',
    tagline: 'One developer, your own projects.',
    seats: '1 developer',
    features: [
      'Full source for the PDF toolkit',
      'Unlimited personal and side projects',
      'The Playwright smoke suite (44 assertions)',
      'Integration notes',
      '12 months of updates',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 199,
    currency: 'USD',
    tagline: 'Ship it in a product you sell.',
    seats: 'Up to 8 developers',
    highlighted: true,
    features: [
      'Everything in Personal',
      'Unlimited commercial products',
      'Up to 8 developers at your company',
      'Priority on issues you open',
      '12 months of updates',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 499,
    currency: 'USD',
    tagline: 'Client work and white-labelling.',
    seats: 'Unlimited developers',
    features: [
      'Everything in Team',
      'Unlimited developers',
      'Use in work delivered to clients',
      'White-label — no attribution required',
      '12 months of updates',
    ],
  },
];

/**
 * Where a "buy" button goes.
 *
 * Set `NEXT_PUBLIC_KIT_CHECKOUT_URL` to the merchant-of-record checkout (Polar,
 * Lemon Squeezy or Paddle — all three act as seller of record and handle
 * global VAT and sales tax, which matters a great deal more than the fee
 * difference when selling software internationally).
 *
 * Until that is set the button points at the repository's discussions, so the
 * page is honest rather than broken: it says to get in touch instead of
 * pretending a checkout exists.
 */
export function kitCheckoutUrl(tierId: string): string {
  const base = process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;
  if (!base) {
    return 'https://github.com/bhaveshsinghal95182/messy-ui/discussions';
  }
  const url = new URL(base);
  url.searchParams.set('tier', tierId);
  return url.toString();
}

export const kitCheckoutConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL);
