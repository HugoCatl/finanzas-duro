import 'server-only';
import { cache } from 'react';
import { requireUser } from '@/lib/supabase/user';
import { loadUserData, type DataPart } from './load';

/** Qué lee cada pantalla: cuanto menos, antes pinta. Ajustes, cuentas y categorías van siempre. */
const VIEWS = {
  full: undefined,
  settings: [],
  movements: ['transactions'],
  budget: ['transactions', 'recurring', 'holdings'],
  portfolio: ['holdings', 'transactions'],
  analysis: ['holdings', 'transactions', 'snapshots'],
  investments: ['holdings', 'transactions', 'recurring', 'snapshots'],
} satisfies Record<string, readonly DataPart[] | undefined>;

export type DataView = keyof typeof VIEWS;

export const getAppData = cache(async (view: DataView = 'full') => {
  const { supabase, user } = await requireUser();
  return loadUserData(supabase, user.id, new Date(), { staleRefresh: 'background', parts: VIEWS[view] });
});
