'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera } from 'lucide-react';
import { readReceipt } from '@/lib/actions/receipt';
import type { ReceiptData } from '@/lib/ai/receipt';

const MAX_SIDE = 1280;

/** Reduce la foto en el móvil antes de enviarla: sube rápido y la lectura cuesta menos. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
}

/** Botón de cámara: lee importe, comercio y fecha del ticket y rellena el formulario. */
export function ScanReceipt({ onRead, disabled }: { onRead: (data: ReceiptData) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const r = await readReceipt(await shrink(file));
        if (r.ok) onRead(r.data);
        else setError(r.error);
      } catch {
        setError('No se ha podido leer la foto');
      }
      if (input.current) input.current.value = '';
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => input.current?.click()} disabled={disabled || pending}
        className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-small font-medium disabled:opacity-50">
        <Camera size={16} className={pending ? 'animate-pulse' : ''} /> {pending ? 'Leyendo ticket…' : 'Leer ticket'}
      </button>
      {error && <p role="alert" className="text-center text-small text-loss">{error}</p>}
    </div>
  );
}
