'use client';

import { useEffect, useRef, useState } from 'react';
import { CURRENCIES } from '@/lib/format';
import { useSession } from '@/lib/store';
import type { Currency } from '@/lib/types';

/** `null` keeps each price in the currency the listing was published in. */
const OPTIONS: { code: Currency | null; label: string }[] = [
  { code: null, label: 'Local' },
  ...CURRENCIES.map((code) => ({ code, label: code })),
];

/** Globe control in the header; changes every price on the page at once. */
export function CurrencySwitcher() {
  const [open, setOpen] = useState(false);
  const currency = useSession((state) => state.currency);
  const setCurrency = useSession((state) => state.setCurrency);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-full px-3 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Currency: ${currency ?? 'listing currency'}`}
      >
        <i className="fa-solid fa-globe text-sm" aria-hidden="true" />
        <span className="hidden text-[11px] font-semibold tracking-[0.08em] sm:inline">
          {currency ?? 'Local'}
        </span>
        <i className="fa-solid fa-chevron-down text-[9px] opacity-70" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-36 animate-fade-down overflow-hidden rounded-xs border-t-2 border-gold-500 bg-white py-1 text-ink-800 shadow-menu"
        >
          {OPTIONS.map(({ code, label }) => (
            <li key={label}>
              <button
                type="button"
                role="option"
                aria-selected={code === currency}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={[
                  'flex w-full items-center justify-between px-4 py-2 text-left text-[12px] normal-case tracking-normal transition-colors hover:bg-sand-50',
                  code === currency ? 'font-semibold text-gold-700' : 'text-ink-500',
                ].join(' ')}
              >
                {label}
                {code === currency && (
                  <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
