import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function NotFound() {
  return (
    <>
      <SiteHeader variant="compact" />
      <main id="main" className="mx-auto max-w-page px-4 py-24 text-center md:px-8">
        <p className="font-crest text-[10px] uppercase tracking-[0.3em] text-[#c5a869]">404</p>
        <h1 className="mt-2 font-serif-title text-3xl text-gray-900">That page has been withdrawn</h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-gray-600">
          The listing or page you were looking for is no longer available. Search the global
          portfolio, or step inside one of the 360° walkover tours.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/homes-for-sale"
            className="rounded-sm bg-[#2c333a] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
          >
            Search listings
          </Link>
          <Link
            href="/tours"
            className="rounded-sm border border-gray-300 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
          >
            Browse 3D/360° tours
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
