-- Los usuarios nuevos ya no reciben cuentas de ejemplo: las crean en el asistente de bienvenida.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id);

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
