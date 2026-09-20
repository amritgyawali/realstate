import Link from 'next/link';
import { footerColumns, socialIcons } from '@/lib/data/navigation';
import { Crest } from '@/components/layout/Crest';

/** Footer ledger, identical on every reference page. */
export function SiteFooter() {
  return (
    <footer
      className="border-t border-gray-200 bg-white pb-8 pt-12 text-xs text-slate-600"
      data-purpose="page-footer"
    >
      <div className="mx-auto max-w-page px-4 md:px-8">
        <div className="grid grid-cols-2 gap-8 border-b border-gray-200 pb-10 md:grid-cols-4 lg:grid-cols-5">
          {footerColumns.map((stack, index) => (
            <div key={index}>
              {stack.map((column, columnIndex) => (
                <div key={column.heading} className={columnIndex > 0 ? 'mt-6' : undefined}>
                  <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-900">
                    {column.heading}
                  </h4>
                  <ul className="space-y-1.5 text-[11px]">
                    {column.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2 transition-colors hover:text-slate-900"
                        >
                          {socialIcons[item.label] && (
                            <i
                              className={`${socialIcons[item.label]} w-3 text-slate-400`}
                              aria-hidden="true"
                            />
                          )}
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between pt-6 text-[11px] text-ink-300 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Crest className="h-4 w-3.5" />
            </span>
            <span>
              <span className="block">© 1996 - 2026 John Brian Losh, Inc.</span>
              <span className="block">
                Who&rsquo;s Who in Luxury Real Estate, LuxuryRealEstate.com
              </span>
            </span>
          </div>
          <p className="mt-3 text-[10px] md:mt-0">
            Equal Housing Opportunity. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
