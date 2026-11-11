'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { refreshMyPrices } from '@/lib/actions/prices';

const EVERY_MIN = 30;
const STALE_MIN = 15;

function ago(iso: string | null, now: number): string {
  if (!iso) return 'sin precios aún';
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

/**
 * Mantiene los precios al día mientras la pantalla está abierta: al entrar si son viejos, cada 30 minutos y al
 * volver a la app. Trae precios nuevos y repinta, y los importes animados se mueven solos hasta el valor nuevo.
 */
export function LivePrices({ updatedAt }: { updatedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(0);

  const refresh = useCallback(() => {
    last.current = Date.now();
    start(async () => {
      await refreshMyPrices();
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    const age = updatedAt ? (Date.now() - new Date(updatedAt).getTime()) / 60_000 : Infinity;
    if (age > STALE_MIN) refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, EVERY_MIN * 60_000);
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last.current > STALE_MIN * 60_000) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); clearInterval(clock); document.removeEventListener('visibilitychange', onVisible); };
    // Solo al montar: el resto lo llevan los temporizadores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button type="button" onClick={refresh} disabled={pending}
      className="inline-flex items-center gap-1.5 text-small text-muted disabled:opacity-70" aria-label="Actualizar precios">
      <RefreshCw size={12} className={pending ? 'animate-spin' : ''} />
      {pending ? 'Actualizando precios…' : `Precios ${ago(updatedAt, now)} · se actualizan cada ${EVERY_MIN} min`}
    </button>
  );
}
