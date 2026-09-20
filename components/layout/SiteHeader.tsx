'use client';

import Link from 'next/link';
import { Photo } from '@/components/ui/Photo';
import { useEffect, useRef, useState } from 'react';
import { primaryNav } from '@/lib/data/navigation';
import { Crest } from '@/components/layout/Crest';
import { CurrencySwitcher } from '@/components/ui/CurrencySwitcher';

interface SiteHeaderProps {
  /**
   * `banner` is the tall centred lockup used on the homepage and destinations
   * hero; `compact` is the slim charcoal bar every interior page uses.
   */
  variant?: 'banner' | 'compact';
  /** Optional background photo, as on the 3D/360 Tours screen. */
  backdrop?: string;
  sticky?: boolean;
}

export function SiteHeader({
  variant = 'banner',
  backdrop,
  sticky = true,
}: SiteHeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A short grace period keeps the menu open while the pointer crosses the gap
  // between the trigger and the panel.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const compact = variant === 'compact';

  return (
    <header
      className={[
        'relative z-50 border-b text-white',
        sticky ? 'sticky top-0' : '',
        backdrop ? 'border-white/20 bg-cover bg-center' : 'border-neutral-800 bg-[#16181b]/95 backdrop-blur-sm',
      ].join(' ')}
      style={
        backdrop
          ? {
              backgroundImage: `linear-gradient(rgba(10, 25, 20, 0.72), rgba(10, 25, 20, 0.72)), url('${backdrop}')`,
            }
          : undefined
      }
      data-purpose="top-navigation"
    >
      <div
        className={[
          'mx-auto flex max-w-wide items-center justify-between gap-2 px-3 sm:px-6 lg:px-8',
          compact ? 'h-12' : 'h-16 sm:h-20',
        ].join(' ')}
      >
        {/* Primary menus */}
        <nav
          className={[
            'hidden items-center lg:flex',
            compact
              ? 'space-x-6 text-[12px] font-medium tracking-wide text-gray-200'
              : 'space-x-6 text-[13px] font-medium uppercase tracking-wider text-gray-300',
          ].join(' ')}
          aria-label="Primary"
          onMouseLeave={scheduleClose}
        >
          {primaryNav.map((group) => (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => {
                cancelClose();
                setOpenMenu(group.label);
              }}
            >
              <Link
                href={group.href}
                className="flex items-center gap-1.5 py-2 transition-colors hover:text-white"
                aria-expanded={openMenu === group.label}
                aria-haspopup="true"
                onFocus={() => setOpenMenu(group.label)}
              >
                <span>{group.label}</span>
                <i className="fa-solid fa-chevron-down text-[9px] opacity-70" aria-hidden="true" />
              </Link>

              {openMenu === group.label && (
                <div
                  className="absolute left-0 top-full z-50 flex animate-fade-in gap-8 rounded-sm border border-neutral-200 bg-white p-6 text-neutral-800 shadow-menu"
                  style={{ minWidth: group.feature ? 620 : 380 }}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {group.columns.map((column) => (
                    <div key={column.heading} className="min-w-[170px]">
                      <p className="mb-3 border-b border-gray-200 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        {column.heading}
                      </p>
                      <ul className="space-y-2 text-[12px] normal-case tracking-normal">
                        {column.items.map((item) => (
                          <li key={item.label}>
                            <Link
                              href={item.href}
                              className="block text-gray-700 transition-colors hover:text-[#0f2b48]"
                              onClick={() => setOpenMenu(null)}
                            >
                              {item.label}
                              {item.blurb && (
                                <span className="block text-[10px] text-ink-300">{item.blurb}</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {group.feature && (
                    <Link
                      href={group.feature.href}
                      onClick={() => setOpenMenu(null)}
                      className="group/feature w-[230px] overflow-hidden rounded-sm border border-gray-200"
                    >
                      <div className="relative h-28 overflow-hidden bg-gray-100">
                        <Photo
                          src={group.feature.image}
                          alt=""
                          fill
                          sizes="230px"
                          className="object-cover transition-transform duration-500 group-hover/feature:scale-105"
                        />
                        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                          360°
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-[12px] font-bold normal-case tracking-normal text-gray-900">
                          {group.feature.title}
                        </p>
                        <p className="mt-1 text-[11px] normal-case leading-snug tracking-normal text-gray-500">
                          {group.feature.blurb}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="p-2 text-gray-200 lg:hidden"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'} text-base`} aria-hidden="true" />
        </button>

        {/* Brand lockup */}
        <Link
          href="/"
          className={[
            'flex min-w-0 items-center text-center',
            compact ? 'space-x-2 py-1' : 'space-x-2 py-2 sm:space-x-3',
          ].join(' ')}
          data-purpose="brand-logo"
        >
          <Crest
            className={compact ? 'h-7 w-6 text-white' : 'h-8 w-7 text-white sm:h-11 sm:w-9'}
          />
          <span className="flex min-w-0 flex-col text-left leading-tight tracking-widest">
            <span
              className={[
                'font-medium uppercase tracking-[0.25em] text-gray-400',
                compact ? 'text-[7px]' : 'text-[7px] sm:text-[9px]',
              ].join(' ')}
            >
              Who&rsquo;s Who In
            </span>
            <span
              className={[
                'font-serif-title whitespace-nowrap font-semibold text-white',
                compact
                  ? 'text-[13px] tracking-[0.12em]'
                  : 'text-[13px] tracking-[0.1em] sm:text-[21px] sm:tracking-[0.14em]',
              ].join(' ')}
            >
              LUXURY REAL ESTATE
            </span>
          </span>
        </Link>

        {/* Utilities */}
        <div
          className={[
            'flex shrink-0 items-center font-medium text-gray-300',
            compact
              ? 'space-x-3 text-[11px]'
              : 'space-x-2 text-[12px] uppercase tracking-wider sm:space-x-5',
          ].join(' ')}
          data-purpose="header-utilities"
        >
          <button
            type="button"
            className="hidden items-center gap-2 transition-colors hover:text-white sm:flex"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('lre:open-command-palette'))
            }
            title="Search everything (Ctrl/Cmd + K)"
          >
            <i className="fa-solid fa-magnifying-glass text-xs" aria-hidden="true" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded border border-white/25 px-1 py-px text-[9px] font-normal tracking-normal text-white/60 lg:inline">
              ⌘K
            </kbd>
          </button>
          <div className="hidden h-3.5 w-px bg-neutral-700 sm:block" />
          <Link
            href="/account"
            className="hidden items-center gap-2 transition-colors hover:text-white sm:flex"
          >
            <i className="fa-regular fa-user text-xs" aria-hidden="true" />
            <span className="hidden sm:inline">Sign In / Sign Up</span>
            <span className="sr-only">Sign in or sign up</span>
          </Link>
          <div className="hidden h-3.5 w-px bg-neutral-700 sm:block" />
          <CurrencySwitcher />
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-white/10 bg-[#16181b] px-5 pb-6 pt-4 lg:hidden">
          {primaryNav.map((group) => (
            <div key={group.label} className="border-b border-white/10 py-3 last:border-0">
              <Link
                href={group.href}
                className="block text-[13px] font-semibold uppercase tracking-wider text-white"
                onClick={() => setMobileOpen(false)}
              >
                {group.label}
              </Link>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {group.columns.flatMap((column) => column.items).map((item) => (
                  <li key={`${group.label}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="block text-[12px] text-gray-400 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
