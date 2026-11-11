import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isDemo } from '@/lib/demo/mode';
import { demoClient } from '@/lib/demo/client';

/** Ignora RLS. Solo para cron y tareas de servidor: filtra SIEMPRE por user_id. */
export function createAdminClient() {
  if (isDemo()) return demoClient();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
