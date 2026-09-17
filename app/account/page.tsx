import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Crest } from '@/components/layout/Crest';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to save listings, store searches and resume tours across devices.',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader variant="compact" />

      <main id="main" className="mx-auto max-w-page px-4 py-14 md:px-8">
        <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2">
          <div>
            <Crest className="mb-4 h-11 w-9 text-[#0f2b48]" />
            <h1 className="font-serif-title text-2xl text-gray-900 md:text-[28px]">
              Sign in to LRE<sup className="text-sm">®</sup>
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
              An account keeps your saved listings, saved searches and tour progress in sync across
              devices, and lets a member brokerage reach you directly about a property.
            </p>
            <ul className="mt-5 space-y-2 text-[12.5px] text-gray-600">
              {[
                ['fa-heart', 'Saved listings on every device'],
                ['fa-bookmark', 'Saved searches with new-listing alerts'],
                ['fa-person-walking', 'Resume a 360° walkover where you left it'],
                ['fa-scale-balanced', 'Shareable compare sets'],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <i className={`fa-solid ${icon} w-4 text-[#c5a869]`} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
              Accounts are not wired up in this build. Saving works today and is stored locally in
              your browser — see{' '}
              <Link href="/favorites" className="font-semibold underline">
                Your Board
              </Link>
              .
            </p>
          </div>

          <div className="rounded-sm border border-gray-200 p-6">
            <form className="space-y-4" aria-label="Sign in">
              <div>
                <label className="mb-1 block text-[11.5px] text-gray-600" htmlFor="account-email">
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-gray-600" htmlFor="account-password">
                  Password
                </label>
                <input
                  id="account-password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
                />
              </div>
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded bg-[#3e454f] py-2.5 text-[12px] font-semibold uppercase tracking-wider text-white opacity-60"
              >
                Sign In
              </button>
              <p className="text-center text-[11.5px] text-gray-500">
                New here?{' '}
                <span className="font-semibold text-[#185b96]">Create an account</span>
              </p>
            </form>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
