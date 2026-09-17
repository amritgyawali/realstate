import type { Currency, Property } from '@/lib/types';

/**
 * Indicative conversion rates used by the currency switcher. A production build
 * would swap this constant for a rates feed; the shape stays the same.
 */
export const RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  SEK: 10.6,
  AED: 3.67,
  CHF: 0.88,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  SEK: 'kr',
  AED: 'AED ',
  CHF: 'CHF ',
};

export const CURRENCIES = Object.keys(RATES) as Currency[];

/** Converts an amount expressed in `from` into `to` via the USD pivot. */
export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return (amount / RATES[from]) * RATES[to];
}

export function formatMoney(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  return `${CURRENCY_SYMBOL[currency]}${rounded.toLocaleString('en-US')}`;
}

/**
 * Price as the listing grids render it: converted when a display currency is
 * active, and "Price Upon Request" when the source had no figure.
 */
export function priceLabel(property: Property, display?: Currency): string {
  if (!property.price) return 'Price Upon Request';
  const target = display ?? property.currency;
  const amount = convert(property.price, property.currency, target);
  return `${formatMoney(amount, target)} ${target}`;
}

export function compactPrice(property: Property, display?: Currency): string {
  if (!property.price) return 'Upon Request';
  const target = display ?? property.currency;
  const amount = convert(property.price, property.currency, target);
  const symbol = CURRENCY_SYMBOL[target];
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}K`;
  return `${symbol}${Math.round(amount)}`;
}

export function locationLabel(property: Property): string {
  return [property.city, property.region, property.country].filter(Boolean).join(', ');
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString('en-US')} sqft`;
}

/** Deterministic pseudo-random helper so server and client agree on layout. */
export function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % Math.max(1, length);
}
