-- Resumen mensual: un aviso más, el último día de cada mes.
alter table public.alerts drop constraint alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check
  check (kind in ('category_threshold','total_threshold','pace','uncategorized','big_expense','monthly_summary'));
