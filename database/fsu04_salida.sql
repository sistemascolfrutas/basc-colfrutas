create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.reg_fsu04_salida (
  id uuid primary key default gen_random_uuid(),
  nombre_operacion text not null unique references public.operaciones_maestra(nombre_operacion) on delete cascade,
  fecha_hora_salida text not null,
  placa_numero_contenedor text not null,
  puertas_cerradas_sellos_instalados text not null check (puertas_cerradas_sellos_instalados in ('Si', 'No', 'No aplica')),
  observaciones text,
  foto_final_unidad_salida_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.reg_fsu04_salida
add column if not exists observaciones text;

drop trigger if exists reg_fsu04_salida_set_updated_at on public.reg_fsu04_salida;
create trigger reg_fsu04_salida_set_updated_at
before update on public.reg_fsu04_salida
for each row
execute function public.set_updated_at();
