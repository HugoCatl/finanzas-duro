'use client';

import { useState } from 'react';
import { Segmented } from '@/components/ui/segmented';
import { AllocationDonut } from './allocation-donut';

type Slice = { name: string; value: number; color: string };

/** Reparto de la cartera, por tipo o por entidad. */
export function AllocationTabs({ byKind, byAccount }: { byKind: Slice[]; byAccount: Slice[] }) {
  const [tab, setTab] = useState<'kind' | 'account'>('kind');
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-heading">Tu cartera</h2>
        <Segmented label="Reparto" value={tab} onChange={setTab} options={[{ value: 'kind', label: 'Tipo' }, { value: 'account', label: 'Entidad' }]} />
      </div>
      <AllocationDonut key={tab} items={tab === 'kind' ? byKind : byAccount} />
    </>
  );
}
