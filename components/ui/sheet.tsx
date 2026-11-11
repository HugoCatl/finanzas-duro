'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Hoja inferior en móvil y modal centrado en escritorio, sobre <dialog> nativo. */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-card border-t border-line bg-surface p-0 text-text lg:m-auto lg:max-w-md lg:rounded-card lg:border"
    >
      <div className="pb-safe px-5 pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-faint/50 lg:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-muted hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        <div className="pb-6">{children}</div>
      </div>
    </dialog>
  );
}
