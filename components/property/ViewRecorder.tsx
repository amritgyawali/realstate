'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/store';

/** Records the visit so "recently viewed" survives navigation and reloads. */
export function ViewRecorder({ slug }: { slug: string }) {
  const recordView = useSession((state) => state.recordView);

  useEffect(() => {
    recordView(slug);
  }, [slug, recordView]);

  return null;
}
