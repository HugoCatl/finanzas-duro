import 'server-only';
import { cache } from 'react';
import { getProfile } from '@/lib/actions/profile';
import { levelOf, type Level } from '@/lib/level';

/** Nivel de la persona que tiene la sesión. Una sola lectura del perfil por petición. */
export const getLevel = cache(async (): Promise<Level> => levelOf(await getProfile()));
