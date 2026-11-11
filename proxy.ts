import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Las imágenes públicas (Duro, iconos) se sirven sin sesión: la pantalla de entrada también las enseña.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|pwa-icon|apple-icon|api/cron|api/apple-pay|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
