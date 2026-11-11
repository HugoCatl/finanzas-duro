'use client';

import { useEffect, useRef, useState } from 'react';
import { eur } from '@/lib/format';

const DURATION = 1400;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function lastSeen(key: string | undefined): number | null {
  if (!key) return null;
  try { const v = Number(localStorage.getItem(`finanzas:visto:${key}`)); return Number.isFinite(v) && v !== 0 ? v : null; } catch { return null; }
}
function remember(key: string | undefined, value: number) {
  if (!key) return;
  try { localStorage.setItem(`finanzas:visto:${key}`, String(value)); } catch {}
}

/**
 * Importe que sube o baja poco a poco hasta su valor, como en la app del banco. Con `storageKey` arranca desde lo
 * que viste la última vez, así al entrar ves cómo se ha movido. Al subir brilla en verde y al bajar en rojo.
 */
export function AnimatedMoney({ value, signed, colored, storageKey, className = '' }: {
  value: number; signed?: boolean; colored?: boolean; storageKey?: string; className?: string;
}) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const from = useRef<number | null>(null);

  useEffect(() => {
    const start = from.current ?? lastSeen(storageKey) ?? value;
    from.current = value;
    remember(storageKey, value);
    const diff = value - start;
    if (Math.abs(diff) < 0.005 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    setFlash(diff > 0 ? 'up' : 'down');
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      setShown(start + diff * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const off = setTimeout(() => setFlash(null), DURATION + 600);
    return () => { cancelAnimationFrame(raf); clearTimeout(off); };
  }, [value, storageKey]);

  const tone = flash === 'up' ? 'text-gain' : flash === 'down' ? 'text-loss'
    : colored ? (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : '') : '';
  return <span className={`num transition-colors duration-700 ${tone} ${className}`}>{eur(shown, { signed })}</span>;
}
