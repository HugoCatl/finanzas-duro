'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { pct } from '@/lib/format';

/** "≈ +6,1 % al año"; al tocarlo explica qué significa. */
export function AnnualReturn({ rate, tooEarly }: { rate: number | null; tooEarly: boolean }) {
  const [open, setOpen] = useState(false);
  if (tooEarly || rate === null) return <p className="text-small text-faint">Aún es pronto para calcular cuánto da al año.</p>;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1.5 text-small text-muted">
        <span className="num">≈ {pct(rate, { signed: true })} al año</span> <Info size={13} />
      </button>
      {open && (
        <p className="mt-1 animate-fade-in text-small text-faint">
          Es lo que te habría dado cada año, de media, teniendo en cuenta cuándo metiste cada euro: el dinero que lleva poco tiempo dentro cuenta menos.
        </p>
      )}
    </div>
  );
}
