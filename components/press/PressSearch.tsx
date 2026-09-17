'use client';

import { useMemo, useState } from 'react';
import { pressReleases } from '@/lib/data/press';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Keyword + date filter for the press archive, scrolling to the first match. */
export function PressSearch() {
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const years = useMemo(
    () =>
      Array.from(new Set(pressReleases.map((release) => release.date.split(', ')[1]))).filter(
        Boolean,
      ),
    [],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const needle = keyword.trim().toLowerCase();
    const match = pressReleases.find((release) => {
      if (needle && !`${release.title} ${release.body}`.toLowerCase().includes(needle)) return false;
      if (year && !release.date.includes(year)) return false;
      if (month && !release.date.startsWith(month.slice(0, 3))) return false;
      return true;
    });

    if (!match) {
      setMessage('No press releases match those terms.');
      return;
    }
    setMessage(null);
    document.getElementById(match.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="w-full rounded-l border border-gray-300 px-2.5 py-1.5 text-[11.5px] placeholder-gray-400 focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
          placeholder="Keyword"
          aria-label="Keyword"
        />
        <button
          type="submit"
          className="rounded-r bg-[#185b96] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#0b3d6b]"
        >
          Submit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="custom-select rounded border border-gray-300 bg-white py-1.5 pl-2 pr-5 text-[11.5px] text-gray-700"
          aria-label="Year"
        >
          <option value="">Year</option>
          {years.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="custom-select rounded border border-gray-300 bg-white py-1.5 pl-2 pr-5 text-[11.5px] text-gray-700"
          aria-label="Month"
        >
          <option value="">Month</option>
          {MONTHS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      {message && <p className="text-[11px] text-rose-700">{message}</p>}
    </form>
  );
}
