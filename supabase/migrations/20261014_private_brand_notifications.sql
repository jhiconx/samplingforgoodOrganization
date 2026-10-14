-- Private brand routing directory. Contacts must be added by authorized staff.
-- No browser-accessible read policies are created.
create table if not exists public.sfg_brand_contacts (
 brand_id text primary key,
 brand_name text not null,
 notification_email text,
 notification_phone text,
 email_enabled boolean not null default false,
 sms_enabled boolean not null default false,
 approved_for_outreach boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.sfg_brand_notifications (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.sfg_distribution_requests(id) on delete cascade,
 brand_id text not null,
 brand_name text not null,
 channel text not null check (channel in ('email','sms')),
 state text not null default 'pending' check (state in ('pending','sent','failed','skipped')),
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique (request_id,brand_id,channel)
);
alter table public.sfg_brand_contacts enable row level security;
alter table public.sfg_brand_notifications enable row level security;
