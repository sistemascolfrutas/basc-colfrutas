create table if not exists public.fsu03_participants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists fsu03_participants_nombre_unique
  on public.fsu03_participants (lower(nombre));

insert into public.fsu03_participants (nombre, is_active)
values
  ('Coordinador logistica', true),
  ('Supervisor BASC', true),
  ('Inspector calidad', true),
  ('Auxiliar bodega', true),
  ('Operador montacargas', true),
  ('Jefe despachos', true)
on conflict ((lower(nombre))) do nothing;
