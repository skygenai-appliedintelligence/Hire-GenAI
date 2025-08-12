-- Prisma-aligned PostgreSQL schema
-- Requires extension for UUID generation
create extension if not exists pgcrypto;

-- Companies
create table if not exists companies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null unique,
  logo_url          text,
  subscription_plan text not null default 'basic',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Users (company employees)
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email      text not null unique,
  name       text not null,
  role       text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_company_id on users(company_id);

-- Job descriptions
create table if not exists job_descriptions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  title            text not null,
  description      text not null,
  requirements     text,
  location         text,
  salary_range     text,
  employment_type  text,
  status           text not null default 'draft',
  posted_platforms text not null default '[]',
  platform_job_ids text not null default '{}',
  posting_results  text not null default '[]',
  interview_rounds integer not null default 3,
  created_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_job_descriptions_company_id on job_descriptions(company_id);

-- Candidates
create table if not exists candidates (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references job_descriptions(id) on delete cascade,
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


