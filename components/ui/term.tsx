'use client';

import { createContext, useContext, useState } from 'react';
import { GLOSSARY, type Level, type TermKey } from '@/lib/level';

const LevelContext = createContext<Level>('mid');

export function LevelProvider({ level, children }: { level: Level; children: React.ReactNode }) {
  return <LevelContext.Provider value={level}>{children}</LevelContext.Provider>;
}
export const useLevel = () => useContext(LevelContext);

/**
 * Un término que al principiante se le explica al tocarlo (subrayado de puntos). Para el resto es texto normal.
 * La explicación sale debajo, dentro del mismo bloque, y se cierra al volver a tocar.
 */
export function Term({ k, children }: { k: TermKey; children: React.ReactNode }) {
  const level = useLevel();
  const [open, setOpen] = useState(false);
  if (level !== 'beginner') return <>{children}</>;
  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} aria-expanded={open}
        className="cursor-help text-left underline decoration-dotted decoration-faint underline-offset-4">
        {children}
      </button>
      {open && (
        <span role="note" className="mt-1.5 block animate-fade-in rounded-control bg-surface-2 px-3 py-2 text-small font-normal text-muted">
          {GLOSSARY[k]}
        </span>
      )}
    </>
  );
}
