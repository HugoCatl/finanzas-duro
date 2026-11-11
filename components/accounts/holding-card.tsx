import type { Price } from '@/lib/types';
import type { PortfolioItem } from '@/lib/finance/holdings';
import { eur, pct } from '@/lib/format';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KIND_LABELS } from '@/lib/labels';
import { Money } from '@/components/ui/money';
import { HoldingActions } from './holding-actions';
import { AnimatedMoney } from '@/components/ui/animated-money';

export function HoldingCard({ item, price, lastValuation, today, extra }: {
  item: PortfolioItem; price: Price | undefined; lastValuation: string | null; today: string;
  /** Solo en nivel avanzado: peso en lo invertido y rentabilidad anual (null si aún es pronto). */
  extra?: { weight: number; annual: number | null };
}) {
  const { holding: h, value: v } = item;
  // Server component: se evalúa una vez por petición; la edad del precio es solo informativa.
  // eslint-disable-next-line react-hooks/purity
  const priceAgeMin = price ? Math.round((Date.now() - new Date(price.updatedAt).getTime()) / 60_000) : null;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{h.name}</p>
          <p className="text-small text-muted">
            {KIND_LABELS[h.kind]}
            {h.kind === 'savings' && h.apy !== null && ` · TAE ${pct(h.apy)}`}
            {h.kind === 'fund' && !h.priceSymbol && (lastValuation ? ` · valor del ${lastValuation.slice(8)}/${lastValuation.slice(5, 7)}` : ' · sin valorar')}
          </p>
        </div>
        <HoldingActions holding={h} today={today} />
      </div>

      <p className="mt-4 text-title font-light"><AnimatedMoney value={v.value} storageKey={`posicion:${h.id}`} /></p>

      {h.kind !== 'cash' && (
        <p className="mt-1 text-small">
          <Money value={v.profit} signed colored /> <span className="text-muted">({pct(v.profitPct, { signed: true })}) · aportado <span className="num">{eur(v.contributed)}</span></span>
        </p>
      )}

      {v.quantity !== null && (
        <p className="mt-1 text-small text-muted">
          {v.quantity.toLocaleString('es-ES', { maximumFractionDigits: 8 })} {h.kind === 'crypto' ? h.coingeckoId : 'part.'}
          {price && <> · <span className="num">{eur(price.priceEur)}</span></>}
          {price?.change24h != null && <> · <span className={price.change24h >= 0 ? 'text-gain' : 'text-loss'}>{pct(price.change24h / 100, { signed: true })} 24h</span></>}
          {priceAgeMin !== null && priceAgeMin > 15 && ` · actualizado hace ${priceAgeMin < 120 ? `${priceAgeMin} min` : `${Math.round(priceAgeMin / 60)} h`}`}
          {v.stale && <span className="ml-1 rounded bg-warn/15 px-1.5 py-0.5 text-warn">precio no disponible</span>}
        </p>
      )}

      {extra && (
        <p className="mt-1 text-small text-muted">
          Pesa el <span className="num">{pct(extra.weight)}</span> de lo invertido
          {extra.annual !== null && <> · <span className="num">≈ {pct(extra.annual, { signed: true })}</span> al año</>}
        </p>
      )}

      {(h.kind === 'fund' || h.kind === 'stock' || h.kind === 'crypto') && (
        <Link href={`/inversiones/${h.id}`} className="-mx-4 -mb-4 mt-4 flex items-center justify-between border-t border-line px-4 py-3 text-small text-accent">
          Evolución, comparación y ficha <ChevronRight size={16} />
        </Link>
      )}
    </Card>
  );
}
