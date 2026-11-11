import { jsonSchema } from 'ai';

export { AI_MODEL as RECEIPT_MODEL } from '@/lib/ai/model';

export interface ReceiptData { amount: number | null; merchant: string | null; date: string | null }

export const RECEIPT_SCHEMA = jsonSchema<ReceiptData>({
  type: 'object',
  properties: {
    amount: { type: ['number', 'null'], description: 'Importe TOTAL pagado en euros, con decimales (p. ej. 23.45). null si no se lee.' },
    merchant: { type: ['string', 'null'], description: 'Nombre comercial de la tienda, corto (p. ej. "Mercadona"), sin dirección ni CIF.' },
    date: { type: ['string', 'null'], description: 'Fecha del ticket en formato YYYY-MM-DD. null si no aparece.' },
  },
  required: ['amount', 'merchant', 'date'],
  additionalProperties: false,
});

export const RECEIPT_PROMPT = [
  'Es la foto de un ticket o factura de compra en España.',
  'Devuelve el importe total pagado (no la base imponible ni el IVA ni el cambio), el nombre de la tienda y la fecha.',
  'Si algo no se lee con seguridad, devuélvelo como null en vez de adivinar.',
].join(' ');

/** Lo que devuelve el modelo no es de fiar del todo: importes razonables, fechas válidas y no futuras. */
export function cleanReceipt(raw: Partial<ReceiptData> | null | undefined, today: string): ReceiptData {
  const amount = typeof raw?.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0 && raw.amount < 100_000
    ? Math.round(raw.amount * 100) / 100 : null;
  const merchant = typeof raw?.merchant === 'string' && raw.merchant.trim() ? raw.merchant.trim().slice(0, 60) : null;
  const date = typeof raw?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) && !Number.isNaN(Date.parse(raw.date))
    && raw.date <= today && raw.date >= '2000-01-01' ? raw.date : null;
  return { amount, merchant, date };
}

/** Foto ya reducida en el móvil: JPEG en base64, como mucho ~1 MB. */
export function validReceiptImage(base64: unknown): base64 is string {
  return typeof base64 === 'string' && base64.length > 100 && base64.length < 1_400_000 && /^[A-Za-z0-9+/=]+$/.test(base64);
}
