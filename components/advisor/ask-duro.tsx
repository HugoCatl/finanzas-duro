'use client';

import { useEffect } from 'react';
import { Newspaper } from 'lucide-react';

export const DURO_ASK_EVENT = 'duro:ask';

/** Abre el chat de Duro y le manda la pregunta. */
export function askDuro(question: string) {
  window.dispatchEvent(new CustomEvent<string>(DURO_ASK_EVENT, { detail: question }));
}

/** Botón que le pregunta algo a Duro. Si la página llega con ?duro=1 (desde un aviso), pregunta solo al abrir. */
export function AskDuroButton({ question, label }: { question: string; label: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('duro')) return;
    url.searchParams.delete('duro');
    window.history.replaceState(null, '', url);
    // El chat vive en el layout y se monta después que la página.
    const t = setTimeout(() => askDuro(question), 400);
    return () => clearTimeout(t);
  }, [question]);

  return (
    <button type="button" onClick={() => askDuro(question)}
      className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-small font-medium active:scale-[0.98]">
      <Newspaper size={15} className="text-duro" /> {label}
    </button>
  );
}
