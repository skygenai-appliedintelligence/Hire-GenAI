-- Optional seed fixture for local/dev
-- Creates a sample company with slug and an admin user

do $$
declare
  v_company_id uuid;
begin
  if not exists (select 1 from companies where slug = 'ai-consulting') then
    insert into companies (name, slug, email, logo_url, subscription_plan)
    values ('AI Consulting', 'ai-consulting', 'admin@ai-consulting.example', null, 'basic')
    returning id into v_company_id;

    insert into users (company_id, email, name, role)
    values (v_company_id, 'admin@ai-consulting.example', 'AI Consulting Admin', 'company_admin');

    insert into job_descriptions (
      company_id, title, description, requirements, location, salary_range, employment_type, status, posted_platforms, platform_job_ids, posting_results, interview_rounds
    ) values (
      v_company_id,
      'Senior AI Engineer',
      'Work on cutting-edge AI solutions.',
      '5+ years in ML/AI',
      'Remote',
      '$120k-$180k',
      'full-time',
      'open',
      '[]','{}','[]',3
    );
  end if;
end $$;

-- Seed dummy data while respecting foreign keys
with inserted_company as (
  insert into companies (name, email, logo_url, subscription_plan)
  values ('Acme Corp', 'admin@acme.example', null, 'pro')
  returning id
), inserted_users as (
  insert into users (company_id, email, name, role)
  select id, 'ceo@acme.example', 'Alice CEO', 'admin' from inserted_company
  union all
  select id, 'hr@acme.example', 'Bob HR', 'company_admin' from inserted_company
  returning id, company_id
), inserted_jobs as (
  insert into job_descriptions (company_id, title, description, requirements, location, salary_range, employment_type, status, posted_platforms, platform_job_ids, posting_results, interview_rounds, created_by)
  select u.company_id,
         'Senior Fullstack Engineer',
         'Build and scale our hiring platform using Next.js and PostgreSQL.',
         '5+ years experience; React/Next.js; Node.js; SQL; cloud.',
         'Remote',
         '$120k-$160k',
         'full-time',
         'active',
         '[]',
         '{}',
         '[]',
         3,
         u.id
  from inserted_users u
  limit 1
  returning id, company_id
), inserted_candidates as (
  insert into candidates (job_id, name, email, phone, resume_url, linkedin_url, source_platform, current_stage, qualification_status, notes)
  select j.id,
         'Charlie Candidate',
         'charlie@example.com',
         '+1-555-0000',
         null,
         'https://www.linkedin.com/in/charlie',
         'linkedin',
         'applied',
         'pending',
         'Strong background in React and Node'
  from inserted_jobs j
  returning id, job_id
), inserted_rounds as (
  insert into interview_rounds (candidate_id, job_id, round_type, scheduled_at, status)
  select c.id, c.job_id, 'screening', now() + interval '1 day', 'scheduled' from inserted_candidates c
  returning id, candidate_id
)
insert into activity_logs (company_id, job_id, candidate_id, action, details)
select j.company_id, j.id, c.id, 'seed', 'Initial seed data created'
from inserted_jobs j
cross join inserted_candidates c;

-- A couple extra candidates
insert into candidates (job_id, name, email, current_stage, qualification_status)
select id, 'Dana Dev', 'dana@example.com', 'applied', 'pending' from job_descriptions limit 1;

insert into candidates (job_id, name, email, current_stage, qualification_status)
select id, 'Evan Engineer', 'evan@example.com', 'screening', 'pending' from job_descriptions limit 1;


