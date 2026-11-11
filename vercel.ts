import type { VercelConfig } from '@vercel/config/v1';

// Horarios en UTC. El plan Hobby solo permite crons diarios.
export const config: VercelConfig = {
  framework: 'nextjs',
  // Funciones junto a la base de datos de Supabase (Frankfurt).
  regions: ['fra1'],
  crons: [
    { path: '/api/cron/recurring', schedule: '0 5 * * *' }, // ~06:00/07:00 Madrid
    { path: '/api/cron/prices', schedule: '0 6 * * *' },
    // 21:00-21:59 UTC es 23:00-23:59 CEST / 22:00-22:59 CET: siempre cae en el mismo día de Madrid.
    { path: '/api/cron/nightly', schedule: '30 21 * * *' },
  ],
};
