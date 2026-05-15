create table if not exists public.responsables (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists responsables_nombre_unique
  on public.responsables (lower(nombre));

insert into public.responsables (nombre, is_active)
values
  ('Responsable porteria', true),
  ('Responsable inspeccion', true),
  ('Coordinador logistica', true)
on conflict ((lower(nombre))) do nothing;
