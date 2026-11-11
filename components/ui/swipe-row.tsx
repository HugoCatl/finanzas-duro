'use client';

import { useRef } from 'react';

interface SwipeAction { label: string; className: string; onClick: () => void }

/** La fila abierta ahora mismo: al deslizar otra, esta se cierra (como en iOS). */
let openRow: HTMLDivElement | null = null;

/** Fila que al deslizar a la izquierda muestra acciones (scroll-snap, sin librerías). Tocarla abierta la cierra. */
export function SwipeRow({ onTap, actions, className, children }: {
  onTap: () => void; actions: SwipeAction[]; className: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function close() {
    ref.current?.scrollTo({ left: 0, behavior: 'smooth' });
    if (openRow === ref.current) openRow = null;
  }

  function onScroll() {
    const el = ref.current;
    if (!el || el.scrollLeft < 8 || openRow === el) return;
    openRow?.scrollTo({ left: 0, behavior: 'smooth' });
    openRow = el;
  }

  return (
    <div ref={ref} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
      <button type="button" onClick={() => (ref.current && ref.current.scrollLeft > 8 ? close() : onTap())}
        className={`flex w-full shrink-0 snap-start items-center gap-3.5 px-4 py-3.5 text-left ${className}`}>
        {children}
      </button>
      {actions.map((a) => (
        <button key={a.label} type="button" onClick={() => { close(); a.onClick(); }}
          className={`w-20 shrink-0 snap-end text-small font-medium ${a.className}`}>{a.label}</button>
      ))}
    </div>
  );
}
