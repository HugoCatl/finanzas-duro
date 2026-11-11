import type { PortfolioItem } from './holdings';
import { INVESTED_KINDS } from './compare';
import { eur, pct } from '@/lib/format';

export interface Advice { id: string; title: string; body: string }

/** Lo que importa de la ficha de cada inversión para los consejos. */
export interface ProfileHint { ter: number | null; indexed: boolean }

const INDEX_WORDS = ['index', 'msci', 's&p', 'ftse', 'stoxx', 'etf'];
/** Sin ficha, se adivina por el nombre si un fondo es indexado. */
export const looksIndexed = (name: string) => INDEX_WORDS.some((w) => name.toLowerCase().includes(w));

/**
 * Como mucho dos consejos tranquilos, por orden de importancia: colchón, cripto, concentración y comisiones.
 * `monthlySpend` es el gasto medio de los últimos meses cerrados (null si no hay datos).
 */
export function investmentAdvice({ items, profiles, monthlySpend }: {
  items: PortfolioItem[]; profiles: Record<string, ProfileHint>; monthlySpend: number | null;
}): Advice[] {
  const invested = items.filter((i) => INVESTED_KINDS.includes(i.holding.kind));
  const total = invested.reduce((s, i) => s + i.value.value, 0);
  if (total <= 0) return [];
  const out: Advice[] = [];

  const cushion = items.filter((i) => i.holding.kind === 'cash' || i.holding.kind === 'savings').reduce((s, i) => s + i.value.value, 0);
  if (monthlySpend && monthlySpend > 0 && cushion < 3 * monthlySpend) {
    out.push({
      id: 'cushion', title: 'Tu colchón es corto',
      body: `Tienes ${eur(cushion, { whole: true })} a mano y gastas unos ${eur(monthlySpend, { whole: true })} al mes. Lo sano es tener 3 meses (${eur(3 * monthlySpend, { whole: true })}) antes de invertir más, para no tener que vender en mal momento.`,
    });
  }

  const crypto = invested.filter((i) => i.holding.kind === 'crypto').reduce((s, i) => s + i.value.value, 0);
  if (crypto / total > 0.1) {
    out.push({
      id: 'crypto', title: 'Mucha cripto',
      body: `El ${pct(crypto / total)} de lo invertido es cripto. Puede caer más de un 50 % en meses; mucha gente la limita a un 5-10 %.`,
    });
  }

  const concentrated = invested.find((i) => {
    const share = i.value.value / total;
    if (i.holding.kind === 'stock') return share > 0.1;
    if (i.holding.kind === 'fund') return share > 0.4 && !(profiles[i.holding.id]?.indexed ?? looksIndexed(i.holding.name));
    return false;
  });
  if (concentrated) {
    out.push({
      id: 'concentration', title: 'Mucho en una sola cosa',
      body: `${concentrated.holding.name} es el ${pct(concentrated.value.value / total)} de lo invertido. Si le va mal, te arrastra; repartir en un fondo indexado amplio reduce ese riesgo.`,
    });
  }

  const expensive = invested.find((i) => (profiles[i.holding.id]?.ter ?? 0) > 0.01);
  if (expensive) {
    out.push({
      id: 'fees', title: 'Comisión alta',
      body: `${expensive.holding.name} cobra alrededor de un ${pct(profiles[expensive.holding.id].ter!)} al año. Un indexado suele cobrar menos del 0,3 %, y a 20 años esa diferencia son miles de euros.`,
    });
  }

  return out.slice(0, 2);
}
