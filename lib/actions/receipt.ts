'use server';

import { generateText, Output } from 'ai';
import { requireUser } from '@/lib/supabase/user';
import { todayIn } from '@/lib/dates';
import { RECEIPT_MODEL, RECEIPT_PROMPT, RECEIPT_SCHEMA, cleanReceipt, validReceiptImage, type ReceiptData } from '@/lib/ai/receipt';

/** Lee importe, comercio y fecha de la foto de un ticket. La foto no se guarda. */
export async function readReceipt(base64: string): Promise<{ ok: true; data: ReceiptData } | { ok: false; error: string }> {
  if (!validReceiptImage(base64)) return { ok: false, error: 'La foto no es válida o es demasiado grande' };
  const { supabase, user } = await requireUser();
  const { data: settings } = await supabase.from('settings').select('timezone').eq('user_id', user.id).maybeSingle();
  const today = todayIn((settings?.timezone as string | undefined) || 'Europe/Madrid');

  try {
    const { output } = await generateText({
      model: RECEIPT_MODEL,
      output: Output.object({ schema: RECEIPT_SCHEMA }),
      messages: [{
        role: 'user',
        content: [
          { type: 'file', mediaType: 'image/jpeg', data: base64 },
          { type: 'text', text: RECEIPT_PROMPT },
        ],
      }],
    });
    const data = cleanReceipt(output, today);
    if (data.amount === null && data.merchant === null) return { ok: false, error: 'No se ha podido leer el ticket. Prueba con más luz y el ticket entero.' };
    return { ok: true, data };
  } catch (e) {
    console.error('Error leyendo ticket', e);
    return { ok: false, error: 'No se ha podido leer el ticket. Inténtalo de nuevo.' };
  }
}
