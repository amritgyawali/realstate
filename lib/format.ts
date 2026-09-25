import type { Currency, Property } from '@/lib/types';

/**
 * Indicative conversion rates used by the currency switcher. A production build
 * would swap this constant for a rates feed; the shape stays the same.
 */
export const RATES: Record<Currency, number> = {
  NPR: 141.6,
  INR: 88.5,
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  NPR: 'Rs ',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

export const CURRENCIES = Object.keys(RATES) as Currency[];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && value in RATES;
}

/** Rupee amounts group in lakhs and crores (1,00,00,000); everything else in thousands. */
function groupsInLakhs(currency: Currency) {
  return currency === 'NPR' || currency === 'INR';
}

/** Converts an amount expressed in `from` into `to` via the USD pivot. */
export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return (amount / RATES[from]) * RATES[to];
}

export function formatMoney(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  const locale = groupsInLakhs(currency) ? 'en-IN' : 'en-US';
  return `${CURRENCY_SYMBOL[currency]}${rounded.toLocaleString(locale)}`;
}

/**
 * Price as the listing grids render it: in the listing's own currency unless a
 * display currency is chosen, and "Price Upon Request" when there is no figure.
 */
export function priceLabel(property: Property, display?: Currency | null): string {
  if (!property.price) return 'Price Upon Request';
  const target = display ?? property.currency;
  const amount = convert(property.price, property.currency, target);
  return `${formatMoney(amount, target)} ${target}`;
}

export function compactPrice(property: Property, display?: Currency | null): string {
  if (!property.price) return 'Upon Request';
  const target = display ?? property.currency;
  const amount = convert(property.price, property.currency, target);
  const symbol = CURRENCY_SYMBOL[target];
  if (groupsInLakhs(target)) {
    if (amount >= 1e7) return `${symbol}${(amount / 1e7).toFixed(amount >= 1e9 ? 0 : 1)} Cr`;
    if (amount >= 1e5) return `${symbol}${Math.round(amount / 1e5)} L`;
  }
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
