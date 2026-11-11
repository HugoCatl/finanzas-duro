import type { TransactionInput, TransferInput } from '@/lib/transactions/rows';

/** Movimientos apuntados sin conexión; se suben solos al volver la red. Vive en este dispositivo. */
export type PendingTransaction =
  | { ref: string; type?: 'transaction'; input: TransactionInput; savedAt: string }
  | { ref: string; type: 'transfer'; input: TransferInput; savedAt: string };

export const QUEUE_KEY = 'finanzas:pendientes';
export const QUEUE_EVENT = 'finanzas:pendientes';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Referencia estable de cada pendiente: si la subida se repite, el servidor no lo duplica. */
export const isOfflineRef = (ref: unknown): ref is string =>
  typeof ref === 'string' && ref.startsWith('offline:') && UUID.test(ref.slice(8));

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function readQueue(storage: Storage): PendingTransaction[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((p) => p && isOfflineRef(p.ref) && p.input) : [];
  } catch {
    return [];
  }
}

export function writeQueue(storage: Storage, items: PendingTransaction[]) {
  storage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueue(
  storage: Storage, item: { type?: 'transaction'; input: TransactionInput } | { type: 'transfer'; input: TransferInput },
  ref: string, now = new Date(),
): PendingTransaction[] {
  const items = [...readQueue(storage), { ...item, ref, savedAt: now.toISOString() } as PendingTransaction];
  writeQueue(storage, items);
  return items;
}

export function dequeue(storage: Storage, ref: string): PendingTransaction[] {
  const items = readQueue(storage).filter((p) => p.ref !== ref);
  writeQueue(storage, items);
  return items;
}
