import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isDemo } from '@/lib/demo/mode';
import { demoClient } from '@/lib/demo/client';

export async function createClient() {
  if (isDemo()) return demoClient();
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
