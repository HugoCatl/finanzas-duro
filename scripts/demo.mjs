// Arranca la app en local con datos inventados (lib/demo), sin Supabase ni login: `npm run demo`.
// Abre http://localhost:3001. Nada de lo que hagas aquí llega a tus datos reales.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['next', 'dev', '--port', '3001'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DEMO_DATA: '1', NEXT_PUBLIC_DEMO: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://demo.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo' },
});
child.on('exit', (code) => process.exit(code ?? 0));
