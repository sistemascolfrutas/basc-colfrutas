create table if not exists public.fsu03_participants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  numero_cedula text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.fsu03_participants
  add column if not exists numero_cedula text;

create unique index if not exists fsu03_participants_nombre_unique
  on public.fsu03_participants (lower(nombre));

create unique index if not exists fsu03_participants_numero_cedula_unique
  on public.fsu03_participants (numero_cedula)
  where numero_cedula is not null;

insert into public.fsu03_participants (nombre, numero_cedula, is_active)
values
  ('Coordinador logistica', null, true),
  ('Supervisor BASC', null, true),
  ('Inspector calidad', null, true),
  ('Auxiliar bodega', null, true),
  ('Operador montacargas', null, true),
  ('Jefe despachos', null, true)
on conflict ((lower(nombre))) do nothing;
