create table if not exists public.fsu03_participants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists fsu03_participants_nombre_unique
  on public.fsu03_participants (lower(nombre));

create index if not exists fsu03_participants_sort_order_idx
  on public.fsu03_participants (sort_order, nombre);

insert into public.fsu03_participants (nombre, is_active, sort_order)
values
  ('Coordinador logistica', true, 1),
  ('Supervisor BASC', true, 2),
  ('Inspector calidad', true, 3),
  ('Auxiliar bodega', true, 4),
  ('Operador montacargas', true, 5),
  ('Jefe despachos', true, 6)
on conflict ((lower(nombre))) do nothing;
