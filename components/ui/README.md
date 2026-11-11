# Piezas de la interfaz

Toda pantalla se monta con estas piezas. Diseño completo: `docs/superpowers/specs/2026-11-04-sistema-visual-design.md`.

## Reglas

- Siempre oscuro. Colores solo por token: `bg`, `surface`, `surface-2`, `line`, `text`, `muted`, `faint`, `accent`,
  `accent-ink`, `gain`, `loss`, `warn`, `duro`.
- El dorado (`accent`) una o dos veces por pantalla: botón principal, pestaña activa, línea del gráfico.
- Verde y rojo solo en cifras con signo. Rosa (`duro`) solo en lo de Duro.
- Cinco medidas de texto: `text-hero`, `text-title`, `text-heading`, `text-body` (por defecto), `text-small`.
- Esquinas: `rounded-card` (tarjetas, hojas), `rounded-control` (campos, botones), `rounded-full` (chips).
- Toda cifra lleva `.num` (ya lo hacen `Money`, `AnimatedMoney`, `ListRow` y `Hero`), así el modo privado la tapa.

## Card

```tsx
<Card>Contenido con relleno</Card>
<Card flush className="divide-y divide-line">{/* filas */}</Card>
```

## ListRow

```tsx
<ListRow href="/cuentas/1" leading={<Dot color={a.color} />} title="ING" subtitle="2 posiciones" value={eur(1200)} />
<ListRow onClick={edit} title="Netflix" subtitle="Día 5" value={eur(-13)} chevron={false} />
```

## Hero

```tsx
<Hero label="Tu patrimonio" value={pf.total} storageKey="inicio:patrimonio">
  <Delta label="Hoy" value={change.day} />
</Hero>
```

## Button y buttonClass

```tsx
<Button variant="primary" block>Guardar</Button>
<Button size="sm">Movimiento</Button>
<Link href="/movimientos" className={buttonClass('secondary', 'sm')}>Ver todo</Link>
```

## Segmented

```tsx
<Segmented label="Periodo" value={range} onChange={setRange} options={[{ value: '1M', label: '1M' }, { value: '1A', label: '1A' }]} />
```

## Sheet, PageHeader, EmptyState

```tsx
<PageHeader title="Cuentas" subtitle="3 cuentas" action={<AccountEditor />} />
<Sheet open={open} onClose={close} title="Nuevo gasto">…</Sheet>
<EmptyState title="Aún no hay nada" body="…" actions={[{ href: '/movimientos', label: 'Apuntar' }]} />
```

## Field, inputClass, PrimaryButton

```tsx
<Field label="Importe (€)"><input className={`${inputClass} num`} /></Field>
<PrimaryButton disabled={pending}>Guardar</PrimaryButton>
```

## Money y AnimatedMoney

```tsx
<Money value={-12.5} signed colored />
<AnimatedMoney value={total} storageKey="inversiones:total" />
```
