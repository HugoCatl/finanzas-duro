# Finanzas 🐷

Tu dinero en una sola app: cuentas, inversiones, gastos y presupuesto. Con **Duro**, un cerdito banquero que conoce tus números y te asesora.

La hice porque tenía el dinero repartido entre varios bancos, un bróker y cripto. Siempre acababa con tres apps abiertas sin saber cuánto tenía en total. Es una app web que se instala en el móvil (PWA) y que cada persona despliega con su propia base de datos.

## Qué hace

- **Patrimonio total** de todas tus cuentas, con cuánto ha cambiado hoy, este mes y este año.
- **Inversiones** (fondos, acciones y cripto) con precios automáticos. Las compara con el mercado mundial, con la inflación y con dejar el dinero en una cuenta.
- **Gastos y presupuesto** por categorías, con avisos cuando vas a pasarte.
- **Automático:** la nómina, los recibos, los traspasos entre cuentas y las aportaciones mensuales a fondos se apuntan solos. Los intereses de las cuentas remuneradas también.
- **Duro, el asesor con IA (Gemini):**
  - Le preguntas si puedes permitirte algo o cómo afectan las noticias a tus inversiones, y responde con tus datos.
  - Cada mes te hace un chequeo con nota.
  - Se adapta a si eres principiante o tienes experiencia.
- **Importación** de movimientos (Trade Republic) y gastos desde **Apple Pay** con un atajo del iPhone.
- **Notificaciones** en el móvil y **modo privado** para tapar las cifras.

## Tecnología

Next.js 16 (App Router), Supabase (Postgres con RLS y Auth), Vercel (despliegue y crons), Gemini con el AI SDK, Tailwind CSS y Vitest.

## Probarla en local sin configurar nada

```bash
npm install
npm run demo
```

Abre http://localhost:3001: la app arranca con tres años de datos inventados en memoria. No hace falta Supabase ni iniciar sesión. Duro solo contesta si pones `GOOGLE_GENERATIVE_AI_API_KEY` en `.env.local`.

## Montar la tuya

Necesitas un proyecto de Supabase, una cuenta de Vercel y una clave de Google AI Studio. Los pasos, las variables de entorno y las migraciones están en [docs/PUESTA-EN-MARCHA.md](docs/PUESTA-EN-MARCHA.md). Copia `.env.example` a `.env.local` y rellénalo.

```bash
npm test        # pruebas
npm run build   # compilar
```

## Aviso

Duro informa y explica; **no es asesoramiento financiero**. Las decisiones con tu dinero son tuyas.

## Licencia

[MIT](LICENSE)
