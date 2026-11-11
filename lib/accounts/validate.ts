export interface AccountInput { name: string; color: string }

const COLOR = /^#[0-9a-f]{6}$/i;

/** Nombre de 1 a 40 caracteres, color en hex y sin repetir el nombre de otra cuenta (sin mayúsculas). */
export function validateAccount(input: AccountInput, otherNames: string[]): string | null {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) return 'Ponle un nombre';
  if (name.length > 40) return 'Nombre demasiado largo';
  if (typeof input.color !== 'string' || !COLOR.test(input.color)) return 'Color no válido';
  if (otherNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) return `Ya tienes una cuenta llamada ${name}`;
  return null;
}
