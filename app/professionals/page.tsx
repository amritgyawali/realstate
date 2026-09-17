import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProfessionalsBrowser } from '@/components/professionals/ProfessionalsBrowser';
import { agents } from '@/lib/data/agents';

export const metadata: Metadata = {
  title: 'Luxury Professionals',
  description:
    'Browse the vetted network of luxury real estate professionals behind Who’s Who in Luxury Real Estate — filter by location, language and membership.',
};

export default function ProfessionalsPage() {
  return (
    <>
      <SiteHeader variant="compact" />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProfessionalsBrowser agents={agents} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
