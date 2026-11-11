-- Cuentas remuneradas: TAE del efectivo de una cuenta con historial, intereses mensuales y aviso de plan sin saldo

-- Cada fila es una TAE vigente desde `from_date` hasta la siguiente. Cambiarla no reescribe los intereses pasados.
create table public.account_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references public.accounts on delete cascade,
  rate numeric(7,5) not null check (rate >= 0 and rate < 1),
  from_date date not null,
  created_at timestamptz not null default now(),
  constraint account_rates_day unique (account_id, from_date)
);
create index account_rates_user_idx on public.account_rates (user_id);
alter table public.account_rates enable row level security;
create policy "own rows" on public.account_rates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Intereses que paga la cuenta: ingreso apuntado por el cron, uno por cuenta y mes.
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check
  check (source in ('manual','recurring','apple_pay','import','interest'));
create unique index if not exists transactions_interest_uniq on public.transactions (account_id, date) where source = 'interest';

-- Aviso cuando un plan de inversión no se compra por falta de saldo.
alter table public.alerts drop constraint alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check
  check (kind in ('category_threshold','total_threshold','pace','uncategorized','big_expense','monthly_summary','plan_no_cash'));
