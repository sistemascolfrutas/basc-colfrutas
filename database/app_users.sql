create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text,
  role text not null check (role in ('admin', 'porteria', 'logistica')),
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

alter table public.app_users enable row level security;

drop policy if exists "app_users_select_self" on public.app_users;
create policy "app_users_select_self"
on public.app_users
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = email
);
