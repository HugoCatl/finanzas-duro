# Puesta en marcha — Fase 1

Pasos que hay que hacer a mano (necesitan tus cuentas). Hazlos en este orden: la base de datos y el código
están pensados para activarse juntos, y si falta algo la app se queda bloqueada en vez de exponer datos.

## 1. Vercel y Supabase

```bash
npm i -g vercel
vercel login
vercel link
vercel integration add supabase
vercel env pull .env.local
```

## 2. Base de datos

Aplica las migraciones **en orden** (con `npx supabase link` + `npx supabase db push`, o pegándolas en el SQL Editor):

1. `supabase/migrations/20261029000000_init.sql`
2. `supabase/migrations/20261029000001_recurring_unique.sql`
3. `supabase/migrations/20261029000002_verified_sessions.sql`
4. `supabase/migrations/20261103000000_import_prices_goal.sql`

## 3. Tu cuenta y el login

1. Supabase → Authentication → Users → **Add user**: tu email y una contraseña fuerte y única.
2. Supabase → Authentication → Providers/Settings: **desactiva los registros** (sign-ups) y el acceso por enlace/código de email.
3. Supabase → Authentication → URL Configuration: Site URL = la URL de producción (cuando la tengas).

## 4. Variables de entorno

Rellénalas en `.env.local` **y** en Vercel (Production y Preview). Nunca las subas al repositorio.

| Variable | Cómo obtenerla |
|---|---|
| `LOGIN_PASSPHRASE_HASH` | `node scripts/hash-passphrase.mjs` y escribe tu frase de 10 palabras (formato `scrypt.…`, sin `$`) |
| `LOGIN_2FA_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:` + tu email |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio → Get API key (aistudio.google.com/apikey). En local y en Vercel |
| `GEMINI_MODEL` | Opcional; por defecto `gemini-3.8-flash` |
| `SUPABASE_TEST_*` | Opcional, para `tests/rls.test.ts` |

## 5. Comprobaciones

```bash
npm test
```

Con las variables `SUPABASE_TEST_*` puestas, los tests de RLS deben pasar (incluido que una sesión sin frase no ve nada).

```bash
npm run dev
```

Entra con email + contraseña → frase → recorre Inicio, Movimientos, Cuentas, Presupuesto, Análisis y Ajustes
en 393×852 (iPhone 15), 375×667 (iPhone SE) y 1440×900, en claro y oscuro.

## 6. Despliegue

```bash
vercel deploy --prod
```

Comprueba en Vercel → Crons que aparecen los tres (precios, fijos y nocturno).

## 7. iPhone

1. Abre la URL en **Safari** → Compartir → **Añadir a pantalla de inicio**.
2. Entra con email, contraseña y frase.
3. Ajustes → activa el interruptor de **Notificaciones**.
4. Apunta un gasto mayor que tu umbral: debe llegar el aviso de "Gasto alto".

## 8. Primera carga de datos

Ajustes → **Importar de Trade Republic** y sube el CSV de "Exportar transacciones". Puedes repetirlo cada mes: lo ya importado no se duplica.

## Pendiente para la fase 2

- Que los gastos e ingresos de una cuenta muevan su efectivo (ahora se cuadra con "Ajustar saldo").
- Captura de Apple Pay con Atajos de iOS.
