import Link from 'next/link';

interface SectionHeadingProps {
  title: string;
  action?: { label: string; href: string };
}

/** Serif section rule used across every homepage block. */
export function SectionHeading({ title, action }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-2">
      <h2 className="font-serif-title text-xl font-medium tracking-wide text-slate-900 md:text-2xl">
        {title}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          {action.label} ›
        </Link>
      )}
    </div>
  );
}
