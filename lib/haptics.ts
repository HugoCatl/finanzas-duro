/** Vibración corta de confirmación. Solo Android: Safari en iOS no deja vibrar desde una web. */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // sin vibración disponible
  }
}
