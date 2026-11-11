import type { HoldingKind } from '@/lib/types';

export const KIND_LABELS: Record<HoldingKind, string> = {
  cash: 'Efectivo',
  savings: 'Remunerada',
  fund: 'Fondo / ETF',
  crypto: 'Cripto',
  stock: 'Acción',
};

export const KIND_COLORS: Record<HoldingKind, string> = {
  cash: 'var(--kind-cash)',
  savings: 'var(--kind-savings)',
  fund: 'var(--kind-fund)',
  crypto: 'var(--kind-crypto)',
  stock: 'var(--kind-stock)',
};
