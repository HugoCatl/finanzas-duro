import { describe, it, expect } from 'vitest';
import { buildInsertRow, buildTransferRow, buildUpdatePatch, validateInput, validateTransfer, toDeletedRow, validateDeletedRow, type TransactionInput } from './rows';

const base: TransactionInput = { amount: 12.5, kind: 'expense', categoryId: 'c1', date: '2026-10-29' };

describe('validateInput', () => {
  it('acepta una entrada válida', () => expect(validateInput(base)).toBeNull());
  it('rechaza kind desconocido', () => {
    expect(validateInput({ ...base, kind: 'transfer' as never })).toBe('Tipo no válido');
  });
  it('rechaza importe y fecha no válidos', () => {
    expect(validateInput({ ...base, amount: 0 })).toBe('Importe no válido');
    expect(validateInput({ ...base, date: '29/10/2026' })).toBe('Fecha no válida');
  });
});

describe('buildUpdatePatch', () => {
  it('no toca note, merchant ni account_id si no se envían', () => {
    const p = buildUpdatePatch(base);
    expect(p).toEqual({ amount: -12.5, category_id: 'c1', date: '2026-10-29' });
    expect('note' in p).toBe(false);
  });
  it('incluye los campos enviados, también null para vaciarlos', () => {
    expect(buildUpdatePatch({ ...base, kind: 'income', merchant: ' Bar ', note: null, accountId: null })).toMatchObject({
      amount: 12.5, merchant: 'Bar', note: null, account_id: null,
    });
  });
});

describe('buildInsertRow', () => {
  it('rellena con null lo no enviado', () => {
    expect(buildInsertRow(base)).toMatchObject({ merchant: null, note: null, account_id: null });
  });
});

describe('traspasos', () => {
  const ok = { fromAccountId: 'a', toAccountId: 'b', amount: 700, date: '2026-11-28' };
  it('valida cuentas distintas, importe y fecha', () => {
    expect(validateTransfer(ok)).toBeNull();
    expect(validateTransfer({ ...ok, toAccountId: 'a' })).not.toBeNull();
    expect(validateTransfer({ ...ok, fromAccountId: '' })).not.toBeNull();
    expect(validateTransfer({ ...ok, amount: 0 })).not.toBeNull();
    expect(validateTransfer({ ...ok, date: '28/11' })).not.toBeNull();
  });
  it('se guarda como salida de la cuenta de origen, sin categoría', () => {
    expect(buildTransferRow({ ...ok, note: ' MSCI ' })).toEqual({
      amount: -700, date: '2026-11-28', account_id: 'a', transfer_account_id: 'b', category_id: null, merchant: 'MSCI',
    });
  });
});

describe('validateDeletedRow', () => {
  const row = toDeletedRow({
    id: '0b6f6c1e-2c1d-4f7a-9a43-1f2a3b4c5d6e', date: '2026-11-03', amount: '-12.50', merchant: 'Mercadona', note: null,
    category_id: null, account_id: '1b6f6c1e-2c1d-4f7a-9a43-1f2a3b4c5d6e', transfer_account_id: null, recurring_id: null,
    source: 'manual', import_ref: null, created_at: '2026-11-03T10:00:00+00:00', user_id: 'otro',
  });
  it('acepta lo que devuelve la base de datos, sin columnas de más', () => {
    expect(validateDeletedRow(row)).toBe(true);
    expect(row).not.toHaveProperty('user_id');
    expect(row.amount).toBe(-12.5);
  });
  it('rechaza ids, importes u orígenes manipulados', () => {
    expect(validateDeletedRow({ ...row, id: 'x' })).toBe(false);
    expect(validateDeletedRow({ ...row, account_id: "1' or 1=1" })).toBe(false);
    expect(validateDeletedRow({ ...row, amount: 0 })).toBe(false);
    expect(validateDeletedRow({ ...row, source: 'admin' })).toBe(false);
    expect(validateDeletedRow(null)).toBe(false);
  });
});
