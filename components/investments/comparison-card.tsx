import type { Comparison } from '@/lib/finance/compare';
import { pct } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Term } from '@/components/ui/term';
import type { TermKey } from '@/lib/level';

/** Tu rentabilidad frente al mercado mundial, la inflación y una cuenta al 2 %, con tus mismos flujos. */
export function ComparisonCard({ own, world, inflation, savings, title = 'Cómo vas comparado' }: {
  own: number | null; world: Comparison | null; inflation: Comparison | null; savings: Comparison | null; title?: string;
}) {
  if (own === null) return null;
  const rows: { label: string; term?: TermKey; ref: Comparison | null; verdict: (diff: number) => string }[] = [
    { label: 'Mercado mundial', term: 'mercado', ref: world, verdict: (d) => (d >= 0 ? 'Vas por delante' : 'Vas por detrás') },
    { label: 'Inflación', term: 'inflacion', ref: inflation, verdict: (d) => (d >= 0 ? 'Le ganas' : 'Pierdes poder de compra') },
    { label: 'Cuenta al 2 %', ref: savings, verdict: (d) => (d >= 0 ? 'Te compensa el riesgo' : 'Rinde menos que una cuenta') },
  ];
  return (
    <Card flush>
      <div className="px-4 pt-4">
        <h2 className="text-heading">{title}</h2>
        <p className="text-small text-muted">Tú: <span className="num font-medium text-text">{pct(own, { signed: true })}</span> con el mismo dinero y las mismas fechas que:</p>
      </div>
      <ul className="mt-2 divide-y divide-line border-t border-line">
        {rows.map(({ label, term, ref, verdict }) => (
          <li key={label} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{term ? <Term k={term}>{label}</Term> : label}{ref?.estimated && <span className="text-small font-normal text-faint"> (estimado)</span>}</span>
              <span className="block text-small text-muted">{ref ? verdict(own - ref.pct) : 'Sin datos ahora mismo'}</span>
            </span>
            <span className="num shrink-0 text-small text-muted">{ref ? pct(ref.pct, { signed: true }) : '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
