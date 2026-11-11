import { describe, it, expect } from 'vitest';
import type { Holding, Price } from '@/lib/types';
import type { PortfolioItem } from '@/lib/finance/holdings';
import { bigMovePush, bigMoves } from './big-moves';

const item = (id: string, kind: Holding['kind'], extra: Partial<Holding> = {}, value = 100): PortfolioItem => ({
  holding: { id, accountId: 'a', name: id, kind, apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false, ...extra } as Holding,
  value: { value } as PortfolioItem['value'],
});
const price = (key: string, change24h: number | null): [string, Price] => [key, { coingeckoId: key, priceEur: 1, change24h, updatedAt: '' }];

const items = [
  item('Nvidia', 'stock', { priceSymbol: 'NVD.DE' }),
  item('MSCI', 'fund', { priceSymbol: 'F.F' }),
  item('Bitcoin', 'crypto', { coingeckoId: 'bitcoin' }),
  item('Vendida', 'stock', { priceSymbol: 'X.DE' }, 0),
  item('Efectivo', 'cash'),
];
const prices = Object.fromEntries([price('yf:NVD.DE', -10.2), price('yf:F.F', 2.9), price('bitcoin', 8), price('yf:X.DE', -30)]);

describe('bigMoves', () => {
  it('avisa según el tipo y solo de lo que tienes', () => {
    expect(bigMoves(items, prices, '2026-11-10').map((m) => m.name)).toEqual(['Nvidia', 'Bitcoin']);
  });
  it('en fin de semana solo la cripto', () => {
    expect(bigMoves(items, prices, '2026-11-14').map((m) => m.name)).toEqual(['Bitcoin']);
  });
  it('escribe el aviso y abre la inversión con Duro', () => {
    expect(bigMovePush({ holdingId: 'h1', name: 'Nvidia', changePct: -10.2 })).toEqual({
      title: 'Nvidia cae un 10,2 % hoy', body: 'Toca y Duro te cuenta por qué.', url: '/inversiones/h1?duro=1',
    });
  });
});
