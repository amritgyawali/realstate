'use client';

import type { SearchQuery } from '@/lib/smart-search';

export const CHARACTERISTICS = [
  'Auction',
  'Bed and Breakfast',
  'Beachfront',
  'CoOp',
  'Corporate Retreat',
  'Country Club Comm',
  'Country Home',
  'Desert',
  'Equestrian',
  'Fly Fishing',
  'Golf Course',
  'Historic',
  'In-City',
  'Island',
  'Lake',
  'Mountain View',
  'New Construction',
  'Ocean',
  'Private Islands',
  'Private Res. Club',
  'River View',
  'Ski Property',
  'Skyline View',
  'Suburban Home',
  'Tropical',
  'Waterfront',
  'Water View',
  'Wine Country',
];

const PRICE_STEPS = [250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000];
const COUNT_STEPS = [1, 2, 3, 4, 5, 6, 7, 8];
const ACRE_STEPS = [0.25, 0.5, 1, 2, 5, 10, 25, 100];

const PROPERTY_TYPES = [
  'Single Family',
  'Townhouse',
  'Condominium',
  'Estate',
  'Villa',
  'Penthouse',
  'Farm & Ranch',
  'Lots & Land',
];

const LISTING_STATUSES = ['Active', 'Pending', 'Auction', 'New'];

interface FilterSidebarProps {
  query: SearchQuery;
  countries: string[];
  onChange: (next: Partial<SearchQuery>) => void;
  onSearch: () => void;
  onClear: () => void;
  onSave: () => void;
  /** Result count shown beside the Search button. */
  resultCount: number;
  /** The 3D/360 Tours page locks the tour requirement on. */
  lockTour?: boolean;
}

/**
 * Filter rail. Same component on Homes For Sale and 3D/360° Tours — the Tours
 * page just locks the tour checkbox, exactly as the reference screens do.
 */
export function FilterSidebar({
  query,
  countries,
  onChange,
  onSearch,
  onClear,
  onSave,
  resultCount,
  lockTour = false,
}: FilterSidebarProps) {
  const toggleTag = (tag: string) => {
    onChange({
      tags: query.tags.includes(tag)
        ? query.tags.filter((t) => t !== tag)
        : [...query.tags, tag],
    });
  };

  return (
    <aside className="w-full shrink-0 font-sans lg:w-[265px]" data-purpose="search-filters">
      {/* Keyword search */}
      <form
        className="mb-2 flex"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <div className="relative flex-grow">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
            <i className="fa-solid fa-magnifying-glass text-[11px]" aria-hidden="true" />
          </span>
          <input
            value={query.text}
            onChange={(event) => onChange({ text: event.target.value })}
            className="w-full rounded-l border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-[11px] placeholder-gray-400 focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
            placeholder="Location, Company, Keyword, etc."
            type="text"
            aria-label="Keyword search"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center rounded-r bg-[#3b4856] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#2c3641]"
        >
          Search
        </button>
      </form>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <i className="fa-regular fa-bookmark text-[10px] text-gray-500" aria-hidden="true" />
          Save Search
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <i className="fa-solid fa-rotate-left text-[10px] text-gray-500" aria-hidden="true" />
          Clear Search
        </button>
      </div>

      <p className="mb-4 rounded-sm border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[10.5px] text-gray-600">
        <span className="font-bold text-gray-900">{resultCount.toLocaleString('en-US')}</span>{' '}
        {resultCount === 1 ? 'listing matches' : 'listings match'} these filters
      </p>

      {/* Size & Price */}
      <Section title="Size & Price">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Field label="Price">
            <Select
              value={query.maxPrice ?? ''}
              onChange={(value) => onChange({ maxPrice: value ? Number(value) : undefined })}
            >
              <option value="">Any</option>
              {PRICE_STEPS.map((step) => (
                <option key={step} value={step}>
                  Up to ${(step / 1_000_000).toFixed(step < 1_000_000 ? 2 : 0)}M
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bedrooms">
            <Select
              value={query.beds ?? ''}
              onChange={(value) => onChange({ beds: value ? Number(value) : undefined })}
            >
              <option value="">Any</option>
              {COUNT_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}+
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Bathrooms">
            <Select
              value={query.baths ?? ''}
              onChange={(value) => onChange({ baths: value ? Number(value) : undefined })}
            >
              <option value="">Any</option>
              {COUNT_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}+
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Lot Size (Acres)">
            <Select
              value={query.minAcres ?? ''}
              onChange={(value) => onChange({ minAcres: value ? Number(value) : undefined })}
            >
              <option value="">Any</option>
              {ACRE_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}+
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location">
        <div className="space-y-2">
          <Field label="Country">
            <Select
              value={query.country ?? ''}
              onChange={(value) => onChange({ country: value || undefined })}
            >
              <option value="">Country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City">
            <input
              value={query.city ?? ''}
              onChange={(event) => onChange({ city: event.target.value || undefined })}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 placeholder-gray-400 focus:ring-1 focus:ring-slate-500"
              placeholder="City"
              type="text"
            />
          </Field>
        </div>
      </Section>

      {/* Listing */}
      <Section title="Listing">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Property Type">
            <Select
              value={query.type ?? ''}
              onChange={(value) => onChange({ type: value || undefined })}
            >
              <option value="">Any</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Listing Status">
            <Select
              value={query.status ?? ''}
              onChange={(value) => onChange({ status: value || undefined })}
            >
              <option value="">Any</option>
              {LISTING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      {/* Requirements */}
      <Section title="Requirements">
        <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-gray-700">
          <Check
            checked={query.requireRegents}
            onChange={(value) => onChange({ requireRegents: value })}
            label="Regent Listings"
          />
          <Check
            checked={query.requireVideo}
            onChange={(value) => onChange({ requireVideo: value })}
            label="Property Video"
          />
          <Check
            checked={query.requireTour}
            onChange={(value) => onChange({ requireTour: value })}
            label="3D/360° Tour"
            disabled={lockTour}
            emphasis={lockTour}
          />
          <Check
            checked={query.requireOpenHouse}
            onChange={(value) => onChange({ requireOpenHouse: value })}
            label="Open Houses"
          />
        </div>
      </Section>

      {/* Characteristics */}
      <Section title="Characteristics" className="mb-6">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10.5px] text-gray-600">
          {CHARACTERISTICS.map((tag) => (
            <label key={tag} className="flex items-center gap-1.5 truncate">
              <input
                type="checkbox"
                className="custom-checkbox h-3 w-3 border-gray-300 text-slate-800"
                checked={query.tags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
              <span className="truncate">{tag}</span>
            </label>
          ))}
        </div>
      </Section>
    </aside>
  );
}

function Section({
  title,
  children,
  className = 'mb-4',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 border-b border-gray-200 pb-1 text-[13px] font-bold text-gray-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="filter-label">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="custom-select w-full rounded border border-gray-300 bg-white py-1 pl-2 pr-5 text-[11px] text-gray-700"
    >
      {children}
    </select>
  );
}

function Check({
  checked,
  onChange,
  label,
  disabled = false,
  emphasis = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <label
      className={[
        'flex items-center gap-1.5',
        disabled ? 'cursor-default' : 'cursor-pointer',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="custom-checkbox h-3.5 w-3.5 border-gray-300 text-slate-800 focus:ring-0"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={emphasis ? 'font-medium text-slate-900' : undefined}>{label}</span>
    </label>
  );
}
