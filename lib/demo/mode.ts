/**
 * Modo demo: datos inventados en memoria en lugar de Supabase, para sacar capturas sin tocar datos reales.
 * Solo en local (`npm run demo`); en producción esta función siempre devuelve false.
 */
export function isDemo(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEMO_DATA === '1';
}
