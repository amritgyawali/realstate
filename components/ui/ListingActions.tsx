'use client';

import { useSession } from '@/lib/store';

interface ListingActionsProps {
  slug: string;
  title: string;
  /** `card` floats over listing media; `bar` sits inline on the detail page. */
  variant?: 'card' | 'bar';
}

/** Favourite and compare toggles, shared by the grids and the detail header. */
export function ListingActions({ slug, title, variant = 'card' }: ListingActionsProps) {
  const favorites = useSession((state) => state.favorites);
  const compare = useSession((state) => state.compare);
  const toggleFavorite = useSession((state) => state.toggleFavorite);
  const toggleCompare = useSession((state) => state.toggleCompare);

  const saved = favorites.includes(slug);
  const comparing = compare.includes(slug);

  if (variant === 'bar') {
    return (
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <button
          type="button"
          onClick={() => toggleFavorite(slug)}
          className="flex items-center gap-1 transition-colors hover:text-black"
          aria-pressed={saved}
        >
          <i
            className={`${saved ? 'fa-solid text-rose-500' : 'fa-regular text-sky-600'} fa-heart text-[13px]`}
            aria-hidden="true"
          />
          <span className="text-sky-700">{saved ? 'Saved' : 'Favorite'}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleCompare(slug)}
          className="flex items-center gap-1 transition-colors hover:text-black"
          aria-pressed={comparing}
        >
          <i
            className={`fa-solid fa-scale-balanced text-[13px] ${comparing ? 'text-[#b89d62]' : 'text-sky-600'}`}
            aria-hidden="true"
          />
          <span className="text-sky-700">{comparing ? 'In compare' : 'Compare'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          toggleFavorite(slug);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
      >
        <i
          className={`${saved ? 'fa-solid text-rose-400' : 'fa-regular'} fa-heart text-[11px]`}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          toggleCompare(slug);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-pressed={comparing}
        aria-label={comparing ? `Remove ${title} from compare` : `Add ${title} to compare`}
      >
        <i
          className={`fa-solid fa-scale-balanced text-[11px] ${comparing ? 'text-[#e0c98f]' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
