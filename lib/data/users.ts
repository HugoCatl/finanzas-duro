import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Todos los usuarios con datos (cada usuario tiene una fila en settings desde el registro). */
export async function listUserIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.from('settings').select('user_id');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.user_id));
}
