-- Finanzas · esquema inicial
create extension if not exists pgcrypto;

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  big_expense_threshold numeric(14,2) not null default 100,
  timezone text not null default 'Europe/Madrid'
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  institution text not null,
  color text not null default '#64748b',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references public.accounts on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash','savings','fund','crypto')),
  apy numeric(6,4),
  coingecko_id text,
  isin text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.holding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  holding_id uuid not null references public.holdings on delete cascade,
  date date not null,
  type text not null check (type in ('deposit','withdrawal','buy','sell','valuation','balance_adjust')),
  amount_eur numeric(14,2) not null default 0 check (amount_eur >= 0),
  quantity numeric(28,10),
  unit_price_eur numeric(18,8),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text not null default 'circle',
  kind text not null check (kind in ('expense','income')),
  is_fixed boolean not null default false,
  monthly_limit numeric(14,2) check (monthly_limit is null or monthly_limit >= 0),
  sort_order int not null default 0
);

create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount <> 0),
  category_id uuid references public.categories on delete set null,
  account_id uuid references public.accounts on delete set null,
  day_of_month int not null check (day_of_month between 1 and 31),
  active boolean not null default true
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  amount numeric(14,2) not null check (amount <> 0),
  merchant text,
  note text,
  category_id uuid references public.categories on delete set null,
  account_id uuid references public.accounts on delete set null,
  source text not null default 'manual' check (source in ('manual','recurring','apple_pay')),
  recurring_id uuid references public.recurring on delete set null,
  created_at timestamptz not null default now()
);
create index transactions_user_date on public.transactions (user_id, date desc);

create table public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null,
  savings_target numeric(14,2) not null default 0,
  investment_target numeric(14,2) not null default 0,
  unique (user_id, month)
);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  net_worth numeric(14,2) not null,
  by_account jsonb not null default '{}',
  by_kind jsonb not null default '{}',
  unique (user_id, date)
);

create table public.price_cache (
  coingecko_id text primary key,
  price_eur numeric(18,8) not null,
  change_24h numeric(8,4),
  updated_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null,
  kind text not null check (kind in ('category_threshold','total_threshold','pace','uncategorized','big_expense')),
  category_id uuid references public.categories on delete cascade,
  threshold int,
  ref text,
  title text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  constraint alerts_dedup unique nulls not distinct (user_id, month, kind, category_id, threshold, ref)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  device_label text,
  created_at timestamptz not null default now()
);

create table public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- RLS: cada usuario solo ve y modifica sus filas
do $$
declare t text;
begin
  foreach t in array array['settings','accounts','holdings','holding_events','categories','recurring',
    'transactions','monthly_goals','snapshots','alerts','push_subscriptions','ai_summaries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.price_cache enable row level security;
create policy "read prices" on public.price_cache for select to authenticated using (true);

-- Datos iniciales al crear un usuario
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id);

  insert into accounts (user_id, name, institution, color, sort_order) values
    (new.id, 'ING', 'ING', '#16a34a', 0),
    (new.id, 'MyInvestor', 'MyInvestor', '#0ea5e9', 1),
    (new.id, 'Trust Wallet', 'Trust Wallet', '#3b82f6', 2),
    (new.id, 'Trade Republic', 'Trade Republic', '#a1a1aa', 3);

  insert into categories (user_id, name, icon, kind, is_fixed, sort_order) values
    (new.id, 'Vivienda', 'home', 'expense', true, 0),
    (new.id, 'Supermercado', 'shopping-cart', 'expense', false, 1),
    (new.id, 'Comida fuera', 'utensils', 'expense', false, 2),
    (new.id, 'Transporte', 'car', 'expense', false, 3),
    (new.id, 'Ocio', 'party-popper', 'expense', false, 4),
    (new.id, 'Suscripciones', 'repeat', 'expense', true, 5),
    (new.id, 'Salud', 'heart-pulse', 'expense', false, 6),
    (new.id, 'Ropa', 'shirt', 'expense', false, 7),
    (new.id, 'Otros', 'circle', 'expense', false, 8),
    (new.id, 'Nómina', 'briefcase', 'income', true, 9),
    (new.id, 'Otros ingresos', 'plus-circle', 'income', false, 10);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
