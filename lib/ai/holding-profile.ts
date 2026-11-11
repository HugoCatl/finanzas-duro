import type { Holding, HoldingKind } from '@/lib/types';

/** Ficha de una inversión en lenguaje sencillo. `generic` si es la explicación general de su tipo. */
export interface HoldingProfile {
  summary: string;
  investsIn: string;
  risk: number; // 1-7, como el indicador de riesgo europeo
  ter: number | null; // comisión anual: 0.0012 = 0,12 %
  indexed: boolean;
  generic?: boolean;
}

export const PROFILE_SYSTEM = `Eres Duro, el asesor de la app Finanzas. Escribes la ficha de una inversión para alguien que empieza a invertir.
Responde SOLO con un objeto JSON, sin texto alrededor, con estas claves:
- "summary": qué es, en 2 frases cortas y sencillas, en español de España y tuteando. Nada de jerga sin explicar.
- "invests_in": en qué invierte, en una frase (p. ej. "Unas 1.400 empresas grandes de 23 países ricos, sobre todo de EE. UU.").
- "risk": número entero del 1 al 7 según el indicador de riesgo europeo (SRRI/SRI) típico de este producto.
- "ter": comisión anual aproximada como fracción (0.0012 = 0,12 %), o null si no aplica o no lo sabes con razonable seguridad.
- "indexed": true si es un fondo o ETF que copia un índice; si no, false.
Si no reconoces el producto, describe lo que se pueda deducir del nombre y el tipo, sin inventar cifras: pon "ter": null.`;

export function profilePrompt(h: Pick<Holding, 'name' | 'kind' | 'isin' | 'priceSymbol' | 'coingeckoId'>): string {
  const kind = { fund: 'fondo o ETF', stock: 'acción', crypto: 'criptomoneda', cash: 'efectivo', savings: 'cuenta remunerada' }[h.kind];
  return [`Nombre: ${h.name}`, `Tipo: ${kind}`, h.isin && `ISIN: ${h.isin}`, h.priceSymbol && `Símbolo: ${h.priceSymbol}`,
    h.coingeckoId && `Id CoinGecko: ${h.coingeckoId}`].filter(Boolean).join('\n');
}

/** Lee el JSON del modelo (aunque venga entre ```); null si no tiene la forma esperada. */
export function parseProfile(text: string): HoldingProfile | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(match[0]); } catch { return null; }
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  const investsIn = typeof raw.invests_in === 'string' ? raw.invests_in.trim() : '';
  const risk = Number(raw.risk);
  if (!summary || !investsIn || !Number.isInteger(risk) || risk < 1 || risk > 7) return null;
  const ter = typeof raw.ter === 'number' && raw.ter >= 0 && raw.ter < 0.1 ? raw.ter : null;
  return { summary: summary.slice(0, 600), investsIn: investsIn.slice(0, 300), risk, ter, indexed: raw.indexed === true };
}

const GENERIC: Partial<Record<HoldingKind, HoldingProfile>> = {
  fund: {
    summary: 'Un fondo junta el dinero de mucha gente para comprar muchas empresas o bonos a la vez, así no dependes de una sola. Si es indexado, copia un índice y suele cobrar muy poco.',
    investsIn: 'Depende del fondo: en su ficha oficial (KID) verás el índice o la región.', risk: 4, ter: null, indexed: false, generic: true,
  },
  stock: {
    summary: 'Una acción es un trocito de una empresa: si a la empresa le va bien, sube; si le va mal, puede caer mucho. Tener pocas acciones sueltas es más arriesgado que un fondo.',
    investsIn: 'Una sola empresa.', risk: 6, ter: null, indexed: false, generic: true,
  },
  crypto: {
    summary: 'Una criptomoneda es dinero digital sin banco central detrás. Su precio sube y baja muchísimo: puede perder la mitad en semanas.',
    investsIn: 'La propia moneda digital; no hay empresas ni beneficios detrás.', risk: 7, ter: null, indexed: false, generic: true,
  },
};

/** Explicación general según el tipo, para cuando Duro no puede escribir la ficha. */
export function genericProfile(kind: HoldingKind): HoldingProfile | null {
  return GENERIC[kind] ?? null;
}

export function toProfile(row: Record<string, unknown>): HoldingProfile {
  return {
    summary: String(row.summary), investsIn: String(row.invests_in), risk: Number(row.risk),
    ter: row.ter === null || row.ter === undefined ? null : Number(row.ter), indexed: row.indexed === true,
  };
}
