import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryKind } from '@/lib/types';

/**
 * Las FK no pasan por RLS: comprueba con el cliente RLS del usuario que el id referenciado es suyo
 * (y, para categorías, que su tipo coincide con `kind`). Devuelve el mensaje de error o null.
 */
export async function ownedError(
  supabase: SupabaseClient, table: 'categories' | 'accounts' | 'holdings' | 'recurring', id: string | null | undefined, message: string, kind?: CategoryKind,
): Promise<string | null> {
  if (id === null || id === undefined) return null;
  let q = supabase.from(table).select('id').eq('id', id);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.error(`Error comprobando ${table}`, error);
    return 'No se pudo comprobar los datos';
  }
  return data ? null : message;
}
