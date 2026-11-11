import type { Profile } from '@/lib/profile';

/**
 * Nivel con el que se enseña la app, según lo que la persona dijo de su experiencia invirtiendo:
 * al principiante se le explican los términos y se le pliega lo secundario; al avanzado se le dan más datos.
 * Sin respuesta, la app se ve como siempre (intermedio).
 */
export type Level = 'beginner' | 'mid' | 'advanced';

export function levelOf(profile: Pick<Profile, 'experience'>): Level {
  return profile.experience === 'none' ? 'beginner' : profile.experience === 'advanced' ? 'advanced' : 'mid';
}

/** Términos que se explican al principiante al tocarlos (componente Term). Una frase, sin jerga. */
export const GLOSSARY = {
  tae: 'TAE: lo que te da una cuenta en un año, en porcentaje. Con un 3 % TAE, 1.000 € te dan unos 30 € al año.',
  mercado: 'Mercado mundial: lo que habría ganado tu dinero en un fondo que compra un trocito de las mayores empresas del mundo.',
  inflacion: 'Inflación: lo que suben los precios. Si tu dinero crece menos que la inflación, cada año compras menos con él.',
  riesgo: 'Riesgo: cuánto puede subir y bajar el valor. Del 1 (casi no se mueve) al 7 (puede caer mucho en poco tiempo).',
  comision: 'Comisión al año: lo que se queda la gestora cada año, ya descontado del valor que ves. Cuanto más baja, mejor.',
  rentabilidad: 'Rentabilidad: lo que has ganado o perdido respecto a lo que pusiste, en porcentaje.',
} as const;
export type TermKey = keyof typeof GLOSSARY;

/** Cómo debe hablarle Duro según el nivel; va en sus instrucciones junto a los datos. */
export const LEVEL_TONE: Record<Level, string> = {
  beginner: 'Nivel: principiante. Explica cada término financiero la primera vez que lo uses, con un ejemplo en euros; frases cortas y un solo paso cada vez. No des nada por sabido.',
  mid: 'Nivel: intermedio. Usa los términos habituales sin explicarlos, salvo los poco comunes.',
  advanced: 'Nivel: avanzado. Ve al grano, sin explicar conceptos básicos; puedes usar términos técnicos y dar cifras y matices (TER, XIRR, correlación, fiscalidad).',
};
