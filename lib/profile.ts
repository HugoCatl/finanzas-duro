/** Lo que el usuario cuenta de sí mismo para que el asesor le hable de su caso. Se guarda en settings.profile. */

export const SITUATIONS = { student: 'Estudiando', employee: 'Por cuenta ajena', self_employed: 'Autónomo', unemployed: 'Sin trabajo ahora', retired: 'Jubilado' } as const;
export const HOUSING = { parents: 'Con mis padres', rent: 'De alquiler', mortgage: 'Con hipoteca', owned: 'Casa pagada' } as const;
export const GOALS = {
  emergency: 'Tener un colchón', house: 'Comprar casa', retirement: 'Jubilación', invest: 'Empezar a invertir',
  debt: 'Quitarme deudas', travel: 'Viajar', independence: 'Independizarme', freedom: 'Libertad financiera',
} as const;
export const RISK = { low: 'Prefiero no perder nada', medium: 'Acepto altibajos moderados', high: 'Aguanto caídas fuertes' } as const;
export const HORIZON = { short: 'Menos de 2 años', medium: 'De 2 a 10 años', long: 'Más de 10 años' } as const;
export const EXPERIENCE = { none: 'Nunca he invertido', some: 'Algo de experiencia', advanced: 'Bastante experiencia' } as const;

export interface Profile {
  age: number | null;
  situation: keyof typeof SITUATIONS | null;
  housing: keyof typeof HOUSING | null;
  dependents: number | null; // personas a tu cargo
  goals: (keyof typeof GOALS)[];
  risk: keyof typeof RISK | null;
  horizon: keyof typeof HORIZON | null;
  experience: keyof typeof EXPERIENCE | null;
  debts: boolean | null;
  notes: string;
}

export const EMPTY_PROFILE: Profile = {
  age: null, situation: null, housing: null, dependents: null, goals: [], risk: null, horizon: null, experience: null, debts: null, notes: '',
};

const oneOf = <T extends object>(map: T, v: unknown) => (typeof v === 'string' && v in map ? (v as keyof T) : null);

/** Normaliza lo que llega (formulario o base de datos); lo que no encaja queda vacío. Error solo si no es un objeto. */
export function parseProfile(raw: unknown): Profile | string {
  if (raw === null || raw === undefined) return { ...EMPTY_PROFILE };
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'Perfil no válido';
  const r = raw as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
  return {
    age: int(r.age, 14, 110),
    situation: oneOf(SITUATIONS, r.situation),
    housing: oneOf(HOUSING, r.housing),
    dependents: int(r.dependents, 0, 20),
    goals: Array.isArray(r.goals) ? [...new Set(r.goals.filter((g): g is keyof typeof GOALS => oneOf(GOALS, g) !== null))] : [],
    risk: oneOf(RISK, r.risk),
    horizon: oneOf(HORIZON, r.horizon),
    experience: oneOf(EXPERIENCE, r.experience),
    debts: typeof r.debts === 'boolean' ? r.debts : null,
    notes: typeof r.notes === 'string' ? r.notes.trim().slice(0, 300) : '',
  };
}

/** Con la edad y algo más ya se puede personalizar. */
export function hasProfile(p: Profile): boolean {
  return p.age !== null && (p.situation !== null || p.goals.length > 0 || p.risk !== null);
}

/** El perfil en palabras, para el asesor. */
export function describeProfile(p: Profile): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (p.age !== null) out.edad = p.age;
  if (p.situation) out.situacion = SITUATIONS[p.situation];
  if (p.housing) out.vivienda = HOUSING[p.housing];
  if (p.dependents !== null) out.personasACargo = p.dependents;
  if (p.goals.length) out.objetivos = p.goals.map((g) => GOALS[g]).join(', ');
  if (p.risk) out.toleranciaRiesgo = RISK[p.risk];
  if (p.horizon) out.plazo = HORIZON[p.horizon];
  if (p.experience) out.experienciaInvirtiendo = EXPERIENCE[p.experience];
  if (p.debts !== null) out.deudas = p.debts ? 'Sí, tiene deudas (préstamos o tarjetas)' : 'Sin deudas aparte de la hipoteca';
  if (p.notes) out.notasDelUsuario = p.notes;
  return out;
}
