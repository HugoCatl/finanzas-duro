'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload } from 'lucide-react';
import type { TransactionInput, TransferInput } from '@/lib/transactions/rows';
import { createTransaction, createTransfer } from '@/lib/actions/transactions';
import { dequeue, enqueue, QUEUE_EVENT, QUEUE_KEY, readQueue } from '@/lib/offline/queue';
import { useOnline } from '@/lib/hooks/use-online';
import { toast } from '@/components/ui/toaster';

const store = () => { try { return window.localStorage; } catch { return null; } };
const changed = () => window.dispatchEvent(new Event(QUEUE_EVENT));

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === QUEUE_KEY) cb(); };
  window.addEventListener(QUEUE_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => { window.removeEventListener(QUEUE_EVENT, cb); window.removeEventListener('storage', onStorage); };
}
const pendingCount = () => { const s = store(); return s ? readQueue(s).length : 0; };

/** Guarda un movimiento o traspaso en el móvil hasta que haya red. */
export function saveOffline(item: { type?: 'transaction'; input: TransactionInput } | { type: 'transfer'; input: TransferInput }) {
  const s = store();
  if (!s) return;
  enqueue(s, item, `offline:${crypto.randomUUID()}`);
  changed();
}

/** Sube los pendientes en cuanto hay conexión y muestra cuántos quedan. */
export function PendingSync() {
  const online = useOnline();
  const router = useRouter();
  const count = useSyncExternalStore(subscribe, pendingCount, () => 0);
  const [failed, setFailed] = useState<string | null>(null);
  const syncing = useRef(false);

  const flush = useCallback(async () => {
    const s = store();
    if (!s || syncing.current || !navigator.onLine) return;
    const items = readQueue(s);
    if (items.length === 0) return;
    syncing.current = true;
    let sent = 0;
    for (const p of items) {
      try {
        const r = p.type === 'transfer' ? await createTransfer(p.input, p.ref) : await createTransaction(p.input, p.ref);
        if (r.ok) { dequeue(s, p.ref); sent++; }
        else { setFailed(r.error); break; } // p. ej. la cuenta ya no existe: se queda para revisarlo
      } catch {
        break; // la red ha vuelto a caer: se reintenta luego
      }
    }
    syncing.current = false;
    if (sent > 0) {
      changed(); // solo si algo cambió: si no, este aviso volvería a lanzar la subida en bucle
      toast(sent === 1 ? 'Subido 1 movimiento pendiente' : `Subidos ${sent} movimientos pendientes`);
      router.refresh();
    }
  }, [router]);

  // Al volver la red, y cada vez que se guarda uno nuevo (por si ya la había).
  useEffect(() => {
    if (!online) return;
    const t = setTimeout(() => void flush(), 0);
    window.addEventListener(QUEUE_EVENT, flush);
    return () => { clearTimeout(t); window.removeEventListener(QUEUE_EVENT, flush); };
  }, [online, flush]);

  function discard() {
    const s = store();
    if (!s || !confirm('¿Descartar los movimientos pendientes que no se pudieron subir?')) return;
    s.removeItem(QUEUE_KEY);
    setFailed(null);
    changed();
  }

  if (count === 0) return null;
  return (
    <div className="mb-3 mt-3 flex flex-wrap items-center justify-center gap-2 rounded-card bg-surface px-4 py-2 text-small text-muted">
      <CloudUpload size={16} />
      {count === 1 ? '1 movimiento pendiente de subir' : `${count} movimientos pendientes de subir`}
      {failed && online && (
        <>
          <span className="text-loss">· {failed}</span>
          <button onClick={() => { setFailed(null); void flush(); }} className="font-medium text-text">Reintentar</button>
          <button onClick={discard} className="font-medium text-loss">Descartar</button>
        </>
      )}
    </div>
  );
}
