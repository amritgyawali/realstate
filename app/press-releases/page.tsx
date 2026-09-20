import type { Metadata } from 'next';
import { Photo } from '@/components/ui/Photo';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PressSearch } from '@/components/press/PressSearch';
import { pressReleases } from '@/lib/data/press';
import { blogPosts, weekInReview } from '@/lib/data/editorial';

export const metadata: Metadata = {
  title: 'Luxury Real Estate Press Releases',
  description:
    'Announcements, appointments and record sales from the Who’s Who in Luxury Real Estate member network.',
};

const ARCHIVE_YEARS = [
  [2026, 2025, 2024],
  [2023, 2022, 2021],
  [2020, 2019, 2018],
  [2017, 2016, 2015],
  [2014, 2013, 2012],
  [2011, 2010, 2009],
  [2008, 2007, 2006],
  [2005, 2004, 2003],
];

export default function PressReleasesPage() {
  return (
    <>
      <SiteHeader variant="compact" />

      <main
        id="main"
        className="mx-auto grid max-w-page grid-cols-1 gap-10 px-4 py-8 md:px-8 lg:grid-cols-[1fr_320px]"
      >
        <div>
          <h1 className="mb-6 font-serif-title text-2xl font-normal text-gray-900 md:text-[28px]">
            Luxury Real Estate Press Releases
          </h1>

          <div className="space-y-7">
            {pressReleases.map((release) => (
              <article
                key={release.slug}
                id={release.slug}
                className="scroll-mt-20 border-b border-gray-200 pb-7"
              >
                <h2 className="cursor-pointer text-[17px] font-semibold leading-snug text-[#185b96] transition-colors hover:text-[#0b3d6b]">
                  {release.title}
                </h2>
                <div className="mb-3 mt-1 flex items-center gap-1.5 text-[11.5px] text-gray-500">
                  <i className="fa-regular fa-clock text-gray-400" aria-hidden="true" />
                  <span>
                    {release.date}
                    {release.source ? ` — ` : ''}
                    {release.source && (
                      <span className="text-gray-600">{release.source}</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  {release.image && (
                    <div className="relative h-28 w-full shrink-0 border border-gray-200 sm:w-40">
                      <Photo
                        src={release.image}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-[13px] leading-relaxed text-gray-700">
                    {release.dateline && (
                      <span className="font-medium text-gray-900">{release.dateline} - </span>
                    )}
                    {release.body}
                  </p>
                </div>
                <div className="mt-3.5 flex justify-end">
                  <button
                    type="button"
                    className="rounded-[2px] border border-gray-300 px-3 py-1 text-[11px] text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Read More
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Search Press Releases
            </h2>
            <PressSearch />
          </div>

          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Archives
            </h2>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[11.5px]">
              {ARCHIVE_YEARS.flat().map((year) => (
                <button
                  key={year}
                  type="button"
                  className="text-left text-[#185b96] hover:underline"
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div id="blog" className="scroll-mt-20">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Blog Posts
            </h2>
            <ul className="space-y-3 text-[11.5px]">
              {blogPosts.map((post) => (
                <li key={post.slug}>
                  <p className="font-medium text-gray-800">{post.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-300">
                    <i className="fa-regular fa-clock" aria-hidden="true" /> {post.date}
                    {post.author ? ` — Posted By ${post.author}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Press Releases
            </h2>
            <ul className="space-y-3 text-[11.5px]">
              {pressReleases.slice(0, 5).map((release) => (
                <li key={`side-${release.slug}`}>
                  <Link
                    href={`#${release.slug}`}
                    className="font-medium text-[#185b96] hover:underline"
                  >
                    {release.title}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-300">
                    <i className="fa-regular fa-clock" aria-hidden="true" /> {release.date}
                    {release.source ? ` — ${release.source}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div id="week-in-review" className="scroll-mt-20">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Week In Review
            </h2>
            <ul className="space-y-2 text-[11.5px]">
              {weekInReview.map((week) => (
                <li key={week}>
                  <span className="text-gray-700">{week}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      <SiteFooter />
    </>
  );
}
