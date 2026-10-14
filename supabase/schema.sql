create extension if not exists pgcrypto;
create table if not exists public.sampling_requests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 organization_name text not null,
 university text not null default '',
 contact_name text not null,
 email text not null,
 phone text not null default '',
 requested_shipping_date date,
 quantity_per_brand integer check(quantity_per_brand between 1 and 10000),
 notes text not null default '',
 sponsor text not null default 'Make-A-Wish Foundation',
 brands jsonb not null,
 status text not null default 'received',
 email_status text not null default 'not_configured'
);
alter table public.sampling_requests enable row level security;
create index if not exists sampling_requests_created_at_idx on public.sampling_requests(created_at desc);
