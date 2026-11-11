'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { haptic } from '@/lib/haptics';

const THRESHOLD = 64;

/** Tirar hacia abajo desde arriba del todo recarga los datos de la página (la app instalada no lo trae). */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    let startY: number | null = null;
    let dist = 0;
    const down = (e: TouchEvent) => {
      startY = window.scrollY <= 0 && !document.querySelector('dialog[open]') ? e.touches[0].clientY : null;
      dist = 0;
    };
    const move = (e: TouchEvent) => {
      if (startY === null) return;
      if (window.scrollY > 0) { startY = null; setPull(0); return; }
      dist = Math.max(0, (e.touches[0].clientY - startY) * 0.5);
      setPull(Math.min(dist, THRESHOLD + 16));
    };
    const up = () => {
      if (startY !== null && dist >= THRESHOLD) {
        haptic();
        start(() => router.refresh());
      }
      startY = null;
      dist = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
    };
  }, [router]);

  if (!pull && !pending) return null;
  const offset = pending ? 0 : pull - 44;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-40 flex justify-center">
      <span className="rounded-full bg-surface p-2.5 shadow-lg" style={{ transform: `translateY(${offset}px)` }}>
        <RefreshCw size={18} className={pending ? 'animate-spin' : ''}
          style={pending ? undefined : { opacity: Math.min(1, pull / THRESHOLD), transform: `rotate(${pull * 4}deg)` }} />
      </span>
    </div>
  );
}
