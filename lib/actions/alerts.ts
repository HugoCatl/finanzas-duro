'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import type { ActionResult } from '@/lib/types';

export async function markAlertsRead(): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('alerts').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}
