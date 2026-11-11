import { useSyncExternalStore } from 'react';

/**
 * El ánimo de Duro, compartido por toda la app: cualquier componente le hace reaccionar y la mascota
 * flotante (y la del chat) lo enseñan. Hay dos capas:
 * - el estado de fondo (`set`): reposo, pensando, hablando o durmiendo; dura hasta que se cambie;
 * - una reacción corta (`react`): celebrar, preocuparse o guiñar unos segundos, con bocadillo opcional;
 *   al acabar vuelve sola al estado de fondo.
 */
export type DuroMood = 'idle' | 'talking' | 'thinking' | 'sleeping' | 'celebrating' | 'worried' | 'wink';
export type DuroBase = Extract<DuroMood, 'idle' | 'talking' | 'thinking' | 'sleeping'>;
export interface DuroState { mood: DuroMood; base: DuroBase; message: string | null }

const INITIAL: DuroState = { mood: 'idle', base: 'idle', message: null };
let state = INITIAL;
let reaction: ReturnType<typeof setTimeout> | undefined;
let bubble: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(next: Partial<DuroState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const duro = {
  /** Cambia el estado de fondo. Corta cualquier reacción en curso (pensar o hablar mandan). */
  set(base: DuroBase) {
    clearTimeout(reaction);
    reaction = undefined;
    if (state.base !== base || state.mood !== base) emit({ base, mood: base });
  },
  /** Una reacción de unos segundos; con `message` sale un bocadillo encima de Duro. */
  react(mood: Exclude<DuroMood, DuroBase>, message?: string, ms = message ? 4500 : 1400) {
    clearTimeout(reaction);
    emit({ mood });
    reaction = setTimeout(() => { reaction = undefined; emit({ mood: state.base }); }, ms);
    if (message) duro.say(message, Math.max(ms, 4500));
  },
  /** Solo el bocadillo, sin cambiar de cara. */
  say(message: string, ms = 4500) {
    clearTimeout(bubble);
    emit({ message });
    bubble = setTimeout(() => emit({ message: null }), ms);
  },
  hush() {
    clearTimeout(bubble);
    if (state.message) emit({ message: null });
  },
  get: () => state,
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useDuro(): DuroState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}
