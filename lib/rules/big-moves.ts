import type { HoldingKind, Price } from '@/lib/types';
import type { PortfolioItem } from '@/lib/finance/holdings';
import { priceKey } from '@/lib/prices/keys';

/** Variación de un día (en %) a partir de la cual avisamos: la cripto se mueve mucho más que un fondo. */
const THRESHOLD: Partial<Record<HoldingKind, number>> = { fund: 3, stock: 5, crypto: 8 };

export interface BigMove { holdingId: string; name: string; changePct: number }

/** Pregunta que se le hace a Duro al abrir una inversión desde el aviso o desde su botón. */
export const newsQuestion = (name: string) => `¿Qué ha pasado con ${name}? ¿Hay alguna noticia que lo explique y me afecta?`;

/**
 * Inversiones que hoy se han movido mucho. En fin de semana la bolsa no cotiza y Yahoo sigue dando
 * la variación del viernes: solo se mira la cripto para no repetir el aviso.
 */
export function bigMoves(items: PortfolioItem[], prices: Record<string, Price>, today: string): BigMove[] {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const out: BigMove[] = [];
  for (const { holding, value } of items) {
    const limit = THRESHOLD[holding.kind];
    const key = priceKey(holding);
    const change = key ? prices[key]?.change24h : null;
    if (!limit || holding.archived || !(value.value > 0) || change == null) continue;
    if (weekend && holding.kind !== 'crypto') continue;
    if (Math.abs(change) >= limit) out.push({ holdingId: holding.id, name: holding.name, changePct: change });
  }
  return out;
}

export function bigMovePush(m: BigMove): { title: string; body: string; url: string } {
  const pct = Math.abs(m.changePct).toFixed(1).replace('.', ',');
  return {
    title: `${m.name} ${m.changePct < 0 ? 'cae' : 'sube'} un ${pct} % hoy`,
    body: 'Toca y Duro te cuenta por qué.',
    url: `/inversiones/${m.holdingId}?duro=1`,
  };
}
