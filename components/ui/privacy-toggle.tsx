'use client';

import { useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PRIVACY_KEY as KEY } from '@/lib/privacy';

const EVENT = 'finanzas:privado';

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const isPrivate = () => document.documentElement.dataset.private !== undefined;

/** Oculta todas las cifras (las difumina) para usar la app delante de otros. Se recuerda en este dispositivo. */
export function PrivacyToggle({ className = '' }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, isPrivate, () => false);

  function toggle() {
    const root = document.documentElement;
    if (on) delete root.dataset.private;
    else root.dataset.private = '';
    try { localStorage.setItem(KEY, on ? '0' : '1'); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" data-tour="privacy" onClick={toggle} aria-pressed={on} aria-label={on ? 'Mostrar cifras' : 'Ocultar cifras'}
      className={`grid size-9 place-items-center rounded-full bg-surface-2 text-muted ${className}`}>
      {on ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
