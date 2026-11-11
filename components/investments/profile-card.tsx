'use client';

import { useEffect, useState } from 'react';
import type { HoldingKind } from '@/lib/types';
import { genericProfile, type HoldingProfile } from '@/lib/ai/holding-profile';
import { ensureHoldingProfile } from '@/lib/actions/holding-profile';
import { tae } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Mascot } from '@/components/advisor/mascot';
import { Term } from '@/components/ui/term';

const RISK_WORDS = ['', 'muy bajo', 'bajo', 'bajo', 'medio', 'alto', 'alto', 'muy alto'];

/** Ficha de la inversión: la de Duro si la hay; si no, la pide al abrir y mientras tanto enseña la general. */
export function ProfileCard({ holdingId, kind, initial }: { holdingId: string; kind: HoldingKind; initial: HoldingProfile | null }) {
  const [profile, setProfile] = useState<HoldingProfile | null>(initial ?? genericProfile(kind));
  const [writing, setWriting] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    ensureHoldingProfile(holdingId)
      .then((p) => { if (alive && p) setProfile(p); })
      .catch(() => {})
      .finally(() => { if (alive) setWriting(false); });
    return () => { alive = false; };
  }, [holdingId, initial]);

  if (!profile) return null;
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2.5">
        <Mascot size={28} thinking={writing} />
        <h2 className="text-heading">Qué es</h2>
        {profile.generic && <span className="ml-auto text-small text-faint">{writing ? 'Duro está escribiendo…' : 'Ficha general'}</span>}
      </div>
      <p>{profile.summary}</p>
      <dl className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
        <div>
          <dt className="text-small text-muted"><Term k="riesgo">Riesgo</Term></dt>
          <dd className="mt-1.5 flex items-center gap-3">
            <span className="flex flex-1 gap-1" aria-label={`Riesgo ${profile.risk} de 7`}>
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < profile.risk ? 'bg-accent' : 'bg-surface-2'}`} />
              ))}
            </span>
            <span className="shrink-0 text-small"><span className="num">{profile.risk}</span>/7 · {RISK_WORDS[profile.risk]}</span>
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-small text-muted"><Term k="comision">Comisión al año</Term></dt>
          <dd className="num text-small">{profile.ter === null ? '—' : `≈ ${tae(profile.ter)}`}</dd>
        </div>
        <div>
          <dt className="text-small text-muted">En qué invierte</dt>
          <dd className="text-small">{profile.investsIn}</dd>
        </div>
      </dl>
    </Card>
  );
}
