-- Sampling For Good Distribution — proposed Supabase schema.
-- Review and apply to the intended Supabase project before enabling production writes.
create extension if not exists pgcrypto;
create table if not exists public.sfg_distribution_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_name text not null check(length(trim(organization_name)) between 2 and 180),
  university text,
  chapter text,
  contact_name text,
  email text,
  phone text,
  requested_ship_date date,
  quantity_per_brand integer check(quantity_per_brand between 1 and 10000),
  brands jsonb not null default '[]'::jsonb,
  charity_name text,
  notes text,
  status text not null default 'received' check(status in ('received','under_review','approved','declined','fulfilled')),
  acknowledgement_email_status text not null default 'pending',
  acknowledgement_sms_status text not null default 'deferred',
  constraint contact_required check(nullif(trim(coalesce(email,'')),'') is not null or nullif(trim(coalesce(phone,'')),'') is not null),
  constraint brands_array check(jsonb_typeof(brands) = 'array')
);
create index if not exists sfg_requests_created_idx on public.sfg_distribution_requests(created_at desc);
create index if not exists sfg_requests_status_idx on public.sfg_distribution_requests(status);
alter table public.sfg_distribution_requests enable row level security;
-- No anonymous policies: only the server using a protected service role should create/read requests.
comment on table public.sfg_distribution_requests is 'Distribution partner sample requests; insert only from trusted server, never direct browser client.';
