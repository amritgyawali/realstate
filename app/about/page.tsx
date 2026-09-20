import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Crest, RegentsStar } from '@/components/layout/Crest';
import { milestones } from '@/lib/data/milestones';
import { pressReleases } from '@/lib/data/press';
import { blogPosts, weekInReview } from '@/lib/data/editorial';

export const metadata: Metadata = {
  title: 'About LRE®',
  description:
    'Who’s Who in Luxury Real Estate has been leading the industry since 1986 — a hand-selected network of more than 130,000 professionals across 42 countries.',
};

const CHAIRMAN_QUOTE = [
  'As I meet brokers around the world, I continue to be profoundly impressed by the quality and integrity of the people in our network. Each year we set high goals and work diligently to improve in every way. I am confident that doing business with any one of our members would be a delightful and rewarding experience. Each year I travel the world; the villages of New England, the resorts and cities of the East Coast, the great state of Texas and the Gulf, the deserts of the Southwest, the grandeur of the Rockies and America’s heartland, and to Europe, Asia and beyond. As a result of this effort, we have the most internationally diverse network available to real estate professionals.',
  'To be eligible for membership, firms and brokers must list and sell in the top 10 percent of their market and demonstrate expertise in the marketing and sale of luxury properties. With the guidance of the Board of Regents (Regents.com), the governing body of Luxury Real Estate, our network represents the best in the business.',
];

const OVERVIEW = [
  'Who’s Who in Luxury Real Estate (LRE®) has been leading the real estate industry since 1986. Founded by Chairman Emeritus John Brian Losh, this hand-selected group of more than 130,000 professionals with properties in more than 42 countries collectively sells over $300 billion of real estate annually, making it the most elite and comprehensive luxury real estate network in the world.',
  'Who’s Who in Luxury Real Estate’s global network is showcased on LuxuryRealEstate.com, the leading portal for luxury properties online, presenting more multi-million-dollar estates than any near-peer. Frequently distinguished as a leader in the industry, the company has been recognized by Forbes, the Inc. 5000 List and The Wall Street Journal. In addition, they have been honored multiple times by The Webby Awards, ADDY Awards and the Web Marketing Association.',
];

const SIDEBAR_LINKS = [
  { label: 'About LRE®', href: '/about' },
  { label: 'LRE® in the Media', href: '/about#media' },
  { label: 'Awards & Accolades', href: '/about#awards' },
  { label: 'Membership Information', href: '/about#membership' },
  { label: 'The Board of Regents', href: '/about#regents' },
  { label: 'LRE® Executive Committee', href: '/about#committee' },
  { label: 'Contact Us', href: '/about#contact' },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader variant="compact" />

      <main
        id="main"
        className="mx-auto grid max-w-page grid-cols-1 gap-10 px-4 py-8 md:px-8 lg:grid-cols-12"
      >
        <div className="lg:col-span-8">
          <h1 className="mb-6 font-serif-title text-2xl font-normal text-stone-900 md:text-[28px]">
            About LRE<sup className="text-sm">®</sup>
          </h1>

          {/* Brand film card */}
          <div className="relative mb-8 overflow-hidden rounded-sm bg-[#111315] px-6 py-12 text-center text-white">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "url('/panoramas/country_club-preview.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(4px)',
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
            <div className="relative flex flex-col items-center">
              <Crest className="mb-4 h-12 w-10 text-white" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                Who&rsquo;s Who In
              </p>
              <p className="font-serif-title text-2xl tracking-[0.14em] md:text-3xl">
                LUXURY REAL ESTATE<span className="text-sm">.COM</span>
              </p>
              <p className="mt-3 max-w-md text-[12.5px] italic text-white/70">
                A global community of real estate professionals representing exceptional luxury real
                estate.
              </p>
              <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                <i className="fa-solid fa-play text-sm text-white" aria-hidden="true" />
              </span>
            </div>
          </div>

          {/* Chairman letter */}
          <blockquote className="mb-8 border-l-2 border-[#c5a869] pl-5">
            {CHAIRMAN_QUOTE.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mb-3 text-[12.5px] leading-relaxed text-[#3a3a3a]">
                {paragraph}
              </p>
            ))}
            <footer className="text-[11.5px] font-semibold text-gray-700">
              — John Brian Losh, Chairman Emeritus
            </footer>
          </blockquote>

          {/* Overview */}
          <section className="mb-10">
            <h2 className="mb-4 font-serif-title text-[20px] font-normal text-stone-900">
              About Who&rsquo;s Who in Luxury Real Estate
            </h2>
            {OVERVIEW.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mb-3 text-[12.5px] leading-relaxed text-[#3a3a3a]">
                {paragraph}
              </p>
            ))}

            <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-gray-200 py-5 text-center sm:grid-cols-4">
              {[
                ['1986', 'Founded'],
                ['130,000+', 'Professionals'],
                ['42', 'Countries'],
                ['$300B+', 'Annual volume'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-serif-title text-xl text-stone-900">{value}</dt>
                  <dd className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Regents */}
          <section id="regents" className="mb-10 scroll-mt-20">
            <h2 className="mb-4 font-serif-title text-[20px] font-normal text-stone-900">
              The Board of Regents
            </h2>
            <div className="flex flex-col gap-5 rounded-sm border border-gray-200 p-5 sm:flex-row sm:items-center">
              <div className="flex shrink-0 items-center gap-2 text-gray-800">
                <RegentsStar className="h-10 w-10 text-[#b89535]" />
                <div>
                  <div className="font-serif-title text-[9px] uppercase tracking-widest text-gray-500">
                    Board of
                  </div>
                  <div className="-mt-1 font-serif-title text-lg font-bold tracking-widest text-gray-800">
                    REGENTS
                  </div>
                </div>
              </div>
              <p className="text-[12.5px] leading-relaxed text-[#3a3a3a]">
                The Board of Regents is the governing body of Who&rsquo;s Who in Luxury Real Estate.
                Regents are selected on demonstrated leadership, professional expertise and
                long-term success, and they set the standards that members are held to. Regents
                Showcase listings carry the crest across this site.
              </p>
            </div>
          </section>

          {/* Milestones */}
          <section id="milestones" className="mb-12 scroll-mt-20">
            <h2 className="mb-5 font-serif-title text-[20px] font-normal text-stone-900">
              Milestones
            </h2>
            {/* Forty entries read as one wall of text when the year is inline
                with the sentence, so the year takes its own gutter against a
                hairline rail and the eye can scan the decades. */}
            <ol className="border-l border-sand-300 text-[12px] leading-relaxed text-[#3a3a3a]">
              {milestones.map((milestone) => (
                <li
                  key={`${milestone.year}-${milestone.title}`}
                  className="relative py-2.5 pl-5 sm:grid sm:grid-cols-[56px_1fr] sm:gap-5 sm:pl-6"
                >
                  <span
                    className="absolute -left-[3px] top-[18px] h-[5px] w-[5px] rounded-full bg-gold-500"
                    aria-hidden="true"
                  />
                  <span className="font-serif-title text-[15px] leading-tight text-stone-900">
                    {milestone.year}
                  </span>
                  <span className="block">
                    {milestone.title && (
                      <strong className="block font-semibold text-stone-900">
                        {milestone.title}
                      </strong>
                    )}
                    {milestone.text}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section id="contact" className="scroll-mt-20 rounded-sm border border-gray-200 p-5">
            <h2 className="mb-2 font-serif-title text-[20px] font-normal text-stone-900">
              Contact Us
            </h2>
            <p className="text-[12.5px] leading-relaxed text-[#3a3a3a]">
              Membership enquiries, media requests and technical support all route through the LRE®
              head office. For a specific listing, contact the presenting agent from the listing
              page.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/professionals"
                className="rounded-sm bg-[#2c333a] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1f2429]"
              >
                Find a professional
              </Link>
              <Link
                href="/tours"
                className="rounded-sm border border-gray-300 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
              >
                Browse 3D/360° tours
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-9 lg:col-span-4 lg:sticky lg:top-16 lg:self-start lg:pl-4">
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              About Us
            </h2>
            <ul className="space-y-2 text-[11.5px]">
              {SIDEBAR_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[#185b96] hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div id="media" className="scroll-mt-20">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Blog Posts
            </h2>
            <ul className="space-y-3 text-[11.5px]">
              {blogPosts.map((post) => (
                <li key={post.slug}>
                  <Link href="/press-releases#blog" className="text-[#185b96] hover:underline">
                    {post.title}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-300">
                    <i className="fa-regular fa-clock" aria-hidden="true" /> {post.date}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div id="awards" className="scroll-mt-20">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Press Releases
            </h2>
            <ul className="space-y-3 text-[11.5px]">
              {pressReleases.slice(0, 4).map((release) => (
                <li key={release.slug}>
                  <Link
                    href={`/press-releases#${release.slug}`}
                    className="text-[#185b96] hover:underline"
                  >
                    {release.title}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-300">
                    <i className="fa-regular fa-clock" aria-hidden="true" /> {release.date}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div id="committee" className="scroll-mt-20">
            <h2 className="mb-3 border-b border-gray-200 pb-1.5 font-serif-title text-[17px] text-gray-900">
              Recent Week In Review
            </h2>
            <ul className="space-y-2 text-[11.5px]">
              {weekInReview.map((week) => (
                <li key={week}>
                  <Link href="/press-releases#week-in-review" className="text-[#185b96] hover:underline">
                    {week}
                  </Link>
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
