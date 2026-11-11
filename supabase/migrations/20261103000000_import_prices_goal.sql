-- Acciones, precios de Yahoo, importación de extractos y objetivo de patrimonio

alter table public.holdings drop constraint if exists holdings_kind_check;
alter table public.holdings add constraint holdings_kind_check check (kind in ('cash','savings','fund','crypto','stock'));
-- Símbolo de Yahoo Finance (p. ej. ABEA.DE) para fondos y acciones con precio automático.
alter table public.holdings add column if not exists price_symbol text;

-- price_cache.coingecko_id es ya una clave genérica: id de CoinGecko o 'yf:<símbolo>' para Yahoo.
comment on column public.price_cache.coingecko_id is 'Clave de precio: id de CoinGecko o yf:<símbolo de Yahoo>';

alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in ('manual','recurring','apple_pay','import'));

-- Identificador del movimiento en el extracto de origen: reimportar el mismo fichero no duplica.
-- Índice no parcial (los NULL no chocan) para poder usarlo en ON CONFLICT desde PostgREST.
alter table public.transactions add column if not exists import_ref text;
alter table public.holding_events add column if not exists import_ref text;
create unique index if not exists transactions_import_ref_uniq on public.transactions (user_id, import_ref);
create unique index if not exists holding_events_import_ref_uniq on public.holding_events (user_id, import_ref);

alter table public.settings add column if not exists net_worth_target numeric(14,2)
  check (net_worth_target is null or net_worth_target > 0);
