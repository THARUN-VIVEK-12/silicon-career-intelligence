-- Silicon Career Intelligence schema
-- Run this whole file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('company_portal','greenhouse','lever','linkedin','naukri','whatsapp','rss','other')),
  source_url text not null,
  adapter text not null default 'external_link',
  external_key text,
  enabled boolean not null default false,
  collection_interval_minutes integer not null default 60,
  history_policy text not null default 'all' check (history_policy in ('all','future_only','manual_only')),
  created_at timestamptz not null default now(),
  unique(source_type, source_url)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_job_id text,
  title text not null,
  company text not null,
  location text,
  country text not null default 'India',
  category text,
  experience_level text,
  employment_type text,
  description text,
  application_url text not null,
  source_url text,
  source_name text,
  source_published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  missing_checks integer not null default 0,
  content_hash text,
  status text not null default 'active' check (status in ('active','stale','expired','removed','demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_source_external_unique unique (source_id, external_job_id)
);
create index if not exists jobs_status_last_seen_idx on public.jobs(status, last_seen_at desc);
create index if not exists jobs_company_title_idx on public.jobs(company, title);
create index if not exists jobs_country_category_idx on public.jobs(country, category);

create table if not exists public.job_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  country text default 'India',
  category text,
  experience_level text,
  employment_type text,
  description text,
  application_url text not null,
  source_url text,
  source_name text default 'Community submission',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_message text
);

alter table public.sources enable row level security;
alter table public.jobs enable row level security;
alter table public.job_submissions enable row level security;
alter table public.collection_runs enable row level security;

-- Public visitors can read active jobs and source registry. Writes are done by the server-side collector.
drop policy if exists "Anyone can read active jobs" on public.jobs;
create policy "Anyone can read active jobs" on public.jobs for select to anon, authenticated using (status = 'active');
drop policy if exists "Anyone can read sources" on public.sources;
create policy "Anyone can read sources" on public.sources for select to anon, authenticated using (true);
-- Visitors may submit a job for review but cannot publish directly.
drop policy if exists "Anyone can submit jobs for review" on public.job_submissions;
create policy "Anyone can submit jobs for review" on public.job_submissions for insert to anon, authenticated with check (status = 'pending');
-- Collection runs are private; do not add a public SELECT policy.

-- Register the two WhatsApp sources with different historical policies.
insert into public.sources (name, source_type, source_url, adapter, enabled, collection_interval_minutes, history_policy)
values
 ('WhatsApp Channel 1','whatsapp','https://whatsapp.com/channel/0029VazxTWj9sBIHUOz1xe0N','manual_import',false,60,'manual_only'),
 ('WhatsApp Channel 2','whatsapp','https://whatsapp.com/channel/0029Vb8Gem43GJP0iVuxMJ1e','manual_import',false,60,'future_only')
on conflict (source_type, source_url) do update set history_policy = excluded.history_policy;

-- Optional initial employer directory. These are links, not automatically connected feeds.
insert into public.sources (name, source_type, source_url, adapter, enabled, history_policy) values
 ('Qualcomm','company_portal','https://careers.qualcomm.com/','external_link',false,'all'),
 ('NVIDIA','company_portal','https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite','external_link',false,'all'),
 ('AMD','company_portal','https://careers.amd.com/','external_link',false,'all'),
 ('Intel','company_portal','https://jobs.intel.com/','external_link',false,'all'),
 ('Synopsys','company_portal','https://careers.synopsys.com/','external_link',false,'all'),
 ('Cadence','company_portal','https://www.cadence.com/en_US/home/company/careers.html','external_link',false,'all'),
 ('Texas Instruments','company_portal','https://careers.ti.com/','external_link',false,'all'),
 ('Micron','company_portal','https://micron.wd1.myworkdayjobs.com/External','external_link',false,'all'),
 ('Arm','company_portal','https://careers.arm.com/','external_link',false,'all'),
 ('Marvell','company_portal','https://careers.marvell.com/','external_link',false,'all'),
 ('Naukri.com','naukri','https://www.naukri.com/semiconductor-jobs','external_link',false,'all'),
 ('LinkedIn Jobs','linkedin','https://www.linkedin.com/jobs/search/?keywords=semiconductor','external_link',false,'all')
on conflict (source_type, source_url) do nothing;
