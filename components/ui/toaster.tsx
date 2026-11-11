'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { haptic } from '@/lib/haptics';

const EVENT = 'finanzas:toast';

interface ToastAction { label: string; run: () => void }
interface ToastDetail { message: string; action?: ToastAction }

/** Confirma una acción con un aviso breve sobre la barra inferior; con `action` (p. ej. Deshacer) dura más. */
export function toast(message: string, action?: ToastAction) {
  haptic();
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail: { message, action } }));
}

export function Toaster() {
  const [current, setCurrent] = useState<(ToastDetail & { id: number }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event) => {
      clearTimeout(timer);
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setCurrent({ id: Date.now(), ...detail });
      timer = setTimeout(() => setCurrent(null), detail.action ? 6000 : 2200);
    };
    window.addEventListener(EVENT, onToast);
    return () => { window.removeEventListener(EVENT, onToast); clearTimeout(timer); };
  }, []);

  return (
    <div role="status" aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-50 flex justify-center px-4 lg:bottom-8">
      {current && (
        <p key={current.id}
          className="flex animate-rise items-center gap-2 rounded-full border border-line bg-surface-2 py-2.5 pl-4 pr-2 text-small font-medium shadow-lg">
          <Check size={16} className="text-gain" /> {current.message}
          {current.action ? (
            <button onClick={() => { current.action!.run(); setCurrent(null); }}
              className="pointer-events-auto ml-1 rounded-full px-3 py-1 font-semibold text-accent">
              {current.action.label}
            </button>
          ) : <span className="w-2" />}
        </p>
      )}
    </div>
  );
}
