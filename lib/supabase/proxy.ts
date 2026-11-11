import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { FAILURES_COOKIE, SECOND_FACTOR_COOKIE } from '@/lib/auth/second-factor';
import { hasValidSecondFactor } from '@/lib/auth/session';
import { isDemo } from '@/lib/demo/mode';

export async function updateSession(request: NextRequest) {
  if (isDemo()) return request.nextUrl.pathname.startsWith('/login') ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next({ request });
  let response = NextResponse.next({ request });
  let cacheHeaders: Record<string, string> = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // Cache-Control/Expires/Pragma: evitan que una CDN cachee los tokens de sesión.
          cacheHeaders = { ...cacheHeaders, ...(headers ?? {}) };
          Object.entries(cacheHeaders).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Las redirecciones deben conservar las cookies de sesión refrescadas/borradas y las cabeceras de caché.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    Object.entries(cacheHeaders).forEach(([k, v]) => redirect.headers.set(k, v));
    return redirect;
  };

  const path = request.nextUrl.pathname;
  const goTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return redirectTo(url);
  };

  if (!user) {
    // Sin sesión no debe quedar un segundo factor antiguo (ni su contador) en el navegador.
    const target = path === '/login' ? response : goTo('/login');
    target.cookies.delete(SECOND_FACTOR_COOKIE);
    target.cookies.delete(FAILURES_COOKIE);
    return target;
  }

  // Segundo factor (frase de acceso): proxy corre en Node, así que usa node:crypto. Falla cerrado sin secreto.
  const secondFactorOk = await hasValidSecondFactor(supabase, user.id, request.cookies.get(SECOND_FACTOR_COOKIE)?.value);
  const isLogin = path.startsWith('/login');
  if (!secondFactorOk) return path === '/login/frase' ? response : goTo('/login/frase');
  if (isLogin) return goTo('/');
  return response;
}
