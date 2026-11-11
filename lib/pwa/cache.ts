/** Nombre de la caché del service worker. Mantener sincronizado con CACHE en public/sw.js. */
export const SW_CACHE = 'finanzas-v1';

/** Borra los datos cacheados (al llegar a /login, es decir, tras cerrar sesión). */
export function clearOfflineCache() {
  if (typeof window === 'undefined') return;
  if ('caches' in window) void caches.delete(SW_CACHE).catch(() => {});
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHE' });
}
