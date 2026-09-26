'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Currency } from '@/lib/types';
import { isCurrency } from '@/lib/format';

interface SavedSearch {
  id: string;
  label: string;
  href: string;
  savedAt: number;
}

interface SessionState {
  /** Display currency; `null` shows each listing in its own currency. */
  currency: Currency | null;
  favorites: string[];
  compare: string[];
  recentlyViewed: string[];
  savedSearches: SavedSearch[];
  /** Rooms the visitor has stood in, keyed `${propertySlug}:${nodeId}`. */
  visitedNodes: string[];
  reducedMotion: boolean;

  setCurrency: (currency: Currency | null) => void;
  toggleFavorite: (slug: string) => void;
  toggleCompare: (slug: string) => void;
  clearCompare: () => void;
  recordView: (slug: string) => void;
  saveSearch: (search: Omit<SavedSearch, 'savedAt'>) => void;
  removeSearch: (id: string) => void;
  markVisited: (propertySlug: string, nodeId: string) => void;
  setReducedMotion: (value: boolean) => void;
}

const MAX_RECENT = 12;

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      currency: null,
      favorites: [],
      compare: [],
      recentlyViewed: [],
      savedSearches: [],
      visitedNodes: [],
      reducedMotion: false,

      setCurrency: (currency) => set({ currency }),

      toggleFavorite: (slug) =>
        set((state) => ({
          favorites: state.favorites.includes(slug)
            ? state.favorites.filter((s) => s !== slug)
            : [...state.favorites, slug],
        })),

      toggleCompare: (slug) =>
        set((state) => {
          if (state.compare.includes(slug)) {
            return { compare: state.compare.filter((s) => s !== slug) };
          }
          // Four is the widest the compare tray can render legibly.
          return { compare: [...state.compare, slug].slice(-4) };
        }),

      clearCompare: () => set({ compare: [] }),

      recordView: (slug) =>
        set((state) => ({
          recentlyViewed: [slug, ...state.recentlyViewed.filter((s) => s !== slug)].slice(
            0,
            MAX_RECENT,
          ),
        })),

      saveSearch: (search) =>
        set((state) => ({
          savedSearches: [
            { ...search, savedAt: Date.now() },
            ...state.savedSearches.filter((s) => s.id !== search.id),
          ].slice(0, 20),
        })),

      removeSearch: (id) =>
        set((state) => ({ savedSearches: state.savedSearches.filter((s) => s.id !== id) })),

      markVisited: (propertySlug, nodeId) =>
        set((state) => {
          const key = `${propertySlug}:${nodeId}`;
          if (state.visitedNodes.includes(key)) return state;
          return { visitedNodes: [...state.visitedNodes, key] };
        }),

      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    {
      name: 'lre-session',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Version 1 defaulted to USD and offered currencies that no longer exist.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<SessionState>;
        if (version < 2 || !isCurrency(state.currency)) state.currency = null;
        return state as SessionState;
      },
    },
  ),
);
