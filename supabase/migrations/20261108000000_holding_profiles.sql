-- Ficha de cada inversión que escribe Duro: qué es, riesgo, comisión y en qué invierte. Una por posición.
create table public.holding_profiles (
  holding_id uuid primary key references public.holdings on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  summary text not null,
  invests_in text not null,
  risk smallint not null check (risk between 1 and 7),
  ter numeric(5,4) check (ter is null or (ter >= 0 and ter < 0.1)),
  indexed boolean not null default false,
  generated_at timestamptz not null default now()
);
create index holding_profiles_user_idx on public.holding_profiles (user_id);
alter table public.holding_profiles enable row level security;
create policy "own rows" on public.holding_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
