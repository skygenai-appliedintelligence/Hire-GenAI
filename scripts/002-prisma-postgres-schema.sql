-- Prisma-aligned PostgreSQL schema
-- Requires extension for UUID generation
create extension if not exists pgcrypto;

create table if not exists companies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  slug              text not null unique,
  email             text not null unique,
  logo_url          text,
  subscription_plan text not null default 'basic',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Ensure slug column exists for legacy tables
alter table companies add column if not exists slug text;
-- Backfill slug from name when missing
update companies
set slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
where (slug is null or slug = '') and name is not null;
-- Ensure uniqueness on slug
do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'uq_companies_slug') then
    create unique index uq_companies_slug on companies(slug);
  end if;
end $$;
alter table companies add column if not exists website text;
alter table companies add column if not exists domain text;
alter table companies add column if not exists hq_location text;
alter table companies add column if not exists industry text;
alter table companies add column if not exists size text;
alter table companies add column if not exists billing_contact text;
alter table companies add column if not exists billing_address text;
alter table companies add column if not exists tax_id text;

-- Users (company employees)
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email      text not null unique,
  name       text not null,
  role       text not null default 'user',
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_company_id on users(company_id);

-- Job descriptions
create table if not exists job_descriptions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  title            text not null,
  slug             text not null,
  description      text not null,
  requirements     text,
  location         text,
  salary_range     text,
  employment_type  text,
  status           text not null default 'open',
  posted_platforms text not null default '[]',
  platform_job_ids text not null default '{}',
  posting_results  text not null default '[]',
  interview_rounds integer not null default 3,
  created_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- Ensure slug column exists for legacy tables
alter table job_descriptions add column if not exists slug text;
-- Backfill JD slug from title when missing
update job_descriptions
set slug = lower(regexp_replace(title, '[^a-z0-9]+', '-', 'g'))
where (slug is null or slug = '') and title is not null;
create index if not exists idx_job_descriptions_company_id on job_descriptions(company_id);
create unique index if not exists uq_jd_company_slug on job_descriptions(company_id, slug);

-- Candidates
create table if not exists candidates (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references job_descriptions(id) on delete cascade,
  company_id           uuid,
  name                 text not null,
  email                text not null,
  phone                text,
  resume_url           text,
  linkedin_url         text,
  source_platform      text,
  current_stage        text not null default 'applied',
  qualification_status text not null default 'pending',
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_candidates_job_id on candidates(job_id);

-- Interview rounds
create table if not exists interview_rounds (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id       uuid not null references job_descriptions(id) on delete cascade,
  round_type   text not null,
  scheduled_at timestamptz,
  status       text not null default 'pending',
  result       text,
  feedback     text,
  meeting_link text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_interview_rounds_candidate_id on interview_rounds(candidate_id);

-- API integrations
create table if not exists api_integrations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  platform   text not null,
  api_key    text,
  api_secret text,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity logs
create table if not exists activity_logs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid references job_descriptions(id),
  candidate_id uuid references candidates(id),
  action       text not null,
  details      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_logs_company_id on activity_logs(company_id);

-- Messages
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid references job_descriptions(id),
  candidate_id uuid references candidates(id),
  sender_type  text not null,
  sender_id    uuid,
  content      text not null,
  meta         text not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists idx_messages_company_id on messages(company_id);
create index if not exists idx_messages_candidate_id on messages(candidate_id);

-- Email OTPs (DEV/Prod ready store)
create table if not exists email_otps (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code       text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_otps_email on email_otps(email);

-- Subscriptions & billing
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  plan text not null default 'base',
  addons text not null default '[]',
  period text not null default 'monthly',
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  jd_id uuid not null references job_descriptions(id) on delete cascade,
  answers_json text not null default '{}',
  cv_url text,
  screening_score integer,
  consent_flags text not null default '{}',
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_applications_jd_id on applications(jd_id);

-- Interviews
create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  agent_id text,
  invite_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  score integer,
  rubric_json text not null default '{}',
  transcript_url text,
  recording_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Postings (job distribution)
create table if not exists postings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  jd_id uuid not null references job_descriptions(id) on delete cascade,
  board text not null,
  external_job_id text,
  status text not null default 'queued',
  logs text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_postings_jd_id on postings(jd_id);

-- Sourcing jobs
create table if not exists sourcing_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  jd_id uuid not null references job_descriptions(id) on delete cascade,
  status text not null default 'queued',
  filters_json text not null default '{}',
  stats_json   text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prospects
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  sourcing_job_id uuid not null references sourcing_jobs(id) on delete cascade,
  person_id text,
  name text,
  email text,
  phone text,
  matched_score integer,
  consent_flags text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Outreach messages
create table if not exists outreach_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  prospect_id uuid references prospects(id),
  candidate_id uuid references candidates(id),
  channel text not null,
  template_id text,
  status text not null default 'queued',
  sent_at timestamptz,
  meta text not null default '{}',
  created_at timestamptz not null default now()
);

-- Webhooks per tenant
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  event_type text not null,
  target_url text not null,
  secret text,
  created_at timestamptz not null default now()
);

-- Suppression list per tenant
create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  channel text not null,
  value text not null,
  reason text,
  created_at timestamptz not null default now()
);


