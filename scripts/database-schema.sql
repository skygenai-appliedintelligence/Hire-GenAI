CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin','recruiter','hiring_manager','interviewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interview_mode AS ENUM ('async_ai','live_ai','human');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_application AS ENUM ('applied','in_progress','rejected','offer','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_round AS ENUM ('pending','awaiting_candidate','in_progress','completed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_interview AS ENUM ('awaiting','in_progress','success','failed','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rec_outcome AS ENUM ('next_round','mismatch','unqualified','on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Company metadata enums
DO $$ BEGIN
  CREATE TYPE company_type AS ENUM ('product','services','staffing','non_profit','government','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_size AS ENUM ('1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10000+');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NEW: Employment & Experience enums
DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM ('full_time','part_time','contract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM ('intern','junior','mid','senior','lead','principal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skill evaluation matrix enum (categorical levels)
DO $$ BEGIN
  CREATE TYPE skill_level AS ENUM ('no_skill','low_skill','some_skill','high_skill','expert_skill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- LOOKUP TABLES
-- =========================

-- Matrix scale lookup: categorical level ↔ numeric score (0-4)
 
CREATE TABLE IF NOT EXISTS skill_level_scale (
  level    skill_level PRIMARY KEY,
  score    int NOT NULL CHECK (score BETWEEN 0 AND 4),
  label    text NOT NULL
);

INSERT INTO skill_level_scale (level, score, label)
VALUES
  ('no_skill', 0, 'No Skill'),
  ('low_skill', 1, 'Low Skill'),
  ('some_skill', 2, 'Some Skill'),
  ('high_skill', 3, 'High Skill'),
  ('expert_skill', 4, 'Expert Skill')
ON CONFLICT (level) DO NOTHING;

-- =========================
-- FILES SYSTEM
-- =========================

CREATE TABLE IF NOT EXISTS files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid,
  storage_key   text NOT NULL,
  content_type  text,
  size_bytes    bigint,
  created_at    timestamptz NOT NULL DEFAULT now()
);


-- =========================
-- CORE: Companies/Users/Roles
-- =========================
CREATE TABLE IF NOT EXISTS companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  status          text NOT NULL DEFAULT 'active',
  description_md  text,
  website_url     text,
  careers_url     text,
  logo_file_id    uuid REFERENCES files(id) ON DELETE SET NULL,
  banner_file_id  uuid REFERENCES files(id) ON DELETE SET NULL,
  company_type    company_type,
  industry        text,
  size_band       company_size,
  founded_year    int,
  headquarters    text,
  socials         jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Ensure unique company names for API lookups
CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_name ON companies(name);


CREATE TABLE IF NOT EXISTS company_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain      citext NOT NULL,
  UNIQUE (company_id, domain)
);



CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       citext NOT NULL,
  full_name   text NOT NULL,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);



-- Optimize lookups by email (used by API: users/by-email)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


CREATE TABLE IF NOT EXISTS user_roles (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);


-- =========================
-- JOBS & CONFIGURATION
-- =========================

CREATE TABLE IF NOT EXISTS jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title             text NOT NULL,
  level             text,
  location          text,
  description_md    text,
  status            text NOT NULL DEFAULT 'open',
  is_public         boolean NOT NULL DEFAULT true,
  visible_from      timestamptz,
  visible_until     timestamptz,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  employment_type   employment_type NOT NULL DEFAULT 'full_time',
  experience_level  experience_level,
  responsibilities_md  text,
  benefits_md          text,
  salary_level         text
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_public_time ON jobs(is_public, status, visible_from, visible_until);

CREATE TABLE IF NOT EXISTS job_rounds (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seq       int  NOT NULL,
  name      text NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 30 CHECK (duration_minutes IN (15,30,60)),
  UNIQUE (job_id, seq)
);


CREATE TABLE IF NOT EXISTS round_agents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_round_id  uuid NOT NULL REFERENCES job_rounds(id) ON DELETE CASCADE,
  agent_type    text NOT NULL,
  skill_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- SKILLS & QUESTIONS
-- =========================
CREATE TABLE IF NOT EXISTS skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        citext UNIQUE NOT NULL,
  description text
);


CREATE TABLE IF NOT EXISTS questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES companies(id) ON DELETE SET NULL,
  text_md     text NOT NULL,
  difficulty  text,
  category    text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Question ↔ Skill mapping WITH weights + expected level

CREATE TABLE IF NOT EXISTS question_skills (
  question_id        uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  skill_id           uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  weight             numeric(4,3) NOT NULL DEFAULT 1.000,
  min_expected_level skill_level,
  PRIMARY KEY (question_id, skill_id)
);

-- Assign questions to agent (ordered)
CREATE TABLE IF NOT EXISTS agent_questions (
  round_agent_id uuid NOT NULL REFERENCES round_agents(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  seq            int  NOT NULL,
  PRIMARY KEY (round_agent_id, question_id),
  UNIQUE (round_agent_id, seq)
);

-- =========================
-- CANDIDATES & PROFILES
-- =========================
CREATE TABLE IF NOT EXISTS candidates (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                      citext NOT NULL UNIQUE,
  full_name                  text NOT NULL,
  phone                      text,
  resume_file_id             uuid REFERENCES files(id),
  is_active                  boolean NOT NULL DEFAULT true,
  headline                   text,
  location                   text,
  total_experience_years     numeric(4,1),
  resume_parsed              jsonb,
  portfolio_links            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                 timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS candidate_profiles (
  candidate_id     uuid PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  headline         text,
  location         text,
  experience_years numeric(4,1),
  skills           text[],
  links            jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Candidate declared skill → years/proficiency

CREATE TABLE IF NOT EXISTS candidate_skill_experience (
  candidate_id   uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id       uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  years_exp      numeric(4,1) NOT NULL DEFAULT 0,
  proficiency    int CHECK (proficiency BETWEEN 1 AND 5),
  evidence       text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS candidate_educations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  school_name    text NOT NULL,
  degree         text,
  field_of_study text,
  start_year     int,
  end_year       int,
  grade          text,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);



CREATE TABLE IF NOT EXISTS candidate_experiences (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id       uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_name       text NOT NULL,
  title              text NOT NULL,
  location           text,
  start_date         date,
  end_date           date,
  is_current         boolean NOT NULL DEFAULT false,
  responsibilities_md  text,
  achievements_md      text,
  skills_used        text[],
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_id        uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  doc_type       text NOT NULL,
  title          text,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, file_id)
);


CREATE TABLE IF NOT EXISTS candidate_saved_jobs (
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, job_id)
);
-- =========================
-- APPLICATION FLOW
-- =========================

CREATE TABLE IF NOT EXISTS applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source        text,
  status        status_application NOT NULL DEFAULT 'applied',
  current_seq   int DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_apps_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);

CREATE TABLE IF NOT EXISTS application_rounds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_round_id     uuid NOT NULL REFERENCES job_rounds(id) ON DELETE RESTRICT,
  seq              int  NOT NULL,
  status           status_round NOT NULL DEFAULT 'pending',
  recommendation   rec_outcome,
  summary          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, seq)
);


CREATE INDEX IF NOT EXISTS idx_app_rounds_app_seq ON application_rounds(application_id, seq);

-- =========================
-- INTERVIEWS & EVALUATIONS
-- =========================
CREATE TABLE IF NOT EXISTS interviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_round_id  uuid NOT NULL REFERENCES application_rounds(id) ON DELETE CASCADE,
  round_agent_id        uuid NOT NULL REFERENCES round_agents(id) ON DELETE RESTRICT,
  started_at            timestamptz,
  completed_at          timestamptz,
  mode                  interview_mode NOT NULL DEFAULT 'async_ai',
  status                status_interview NOT NULL DEFAULT 'awaiting',
  raw_transcript        text,
  questions_json        jsonb,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_interviews_round ON interviews(application_round_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);


CREATE TABLE IF NOT EXISTS evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id    uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  overall_score   numeric(5,2),
  skill_scores    jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation  rec_outcome,
  rubric_notes_md text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_interview ON evaluations(interview_id);

-- Per-skill categorical level + numeric result
CREATE TABLE IF NOT EXISTS evaluation_skill_ratings (
  evaluation_id  uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  skill_id       uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  level          skill_level NOT NULL,
  score          numeric(5,2) NOT NULL,
  weight_applied numeric(4,3) NOT NULL DEFAULT 1.000,
  PRIMARY KEY (evaluation_id, skill_id)
);

-- =========================
-- COMMUNICATION & LINKS
-- =========================
CREATE TABLE IF NOT EXISTS interview_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  token_hash    text NOT NULL,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_interview_links_hash ON interview_links(token_hash);

CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  format        text NOT NULL DEFAULT 'pdf',
  storage_key   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  token_hash    text NOT NULL,
  expires_at    timestamptz NOT NULL,
  opened_at     timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_report_shares_hash ON report_shares(token_hash);

CREATE TABLE IF NOT EXISTS outbound_emails (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  to_email      citext NOT NULL,
  template_key  text,
  subject       text NOT NULL,
  body_html     text NOT NULL,
  sent_at       timestamptz,
  status        text NOT NULL DEFAULT 'queued',
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_type  text,
  related_id    uuid
);


-- =========================
-- AUDIT & LOGGING
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            bigserial PRIMARY KEY,
  company_id    uuid,
  actor_user_id uuid,
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);
-- =========================
-- AUTHENTICATION SYSTEM
-- =========================
CREATE TABLE IF NOT EXISTS email_identities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type  text NOT NULL,
  principal_id    uuid NOT NULL,
  email           citext NOT NULL,
  is_verified     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (principal_type, principal_id, email)
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL,
  principal_type  text,
  principal_id    uuid,
  purpose         text NOT NULL,
  code_hash       text NOT NULL,
  tries_used      int  NOT NULL DEFAULT 0,
  max_tries       int  NOT NULL DEFAULT 5,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  consumed_at     timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_challenges(email, purpose, expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type       text NOT NULL,
  principal_id         uuid NOT NULL,
  refresh_token_hash   text NOT NULL,
  issued_at            timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL,
  last_seen_at         timestamptz,
  device_fingerprint   text,
  ip_last              inet
);

CREATE INDEX IF NOT EXISTS idx_sessions_principal ON sessions(principal_type, principal_id);
-- Bot-prevention audit
CREATE TABLE IF NOT EXISTS captcha_challenges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose             text NOT NULL,
  client_fingerprint  text,
  ip_addr             inet,
  provider            text NOT NULL,
  provider_token_hash text NOT NULL,
  passed              boolean,
  created_at          timestamptz NOT NULL DEFAULT now(),
  verified_at         timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- =========================
-- ROW LEVEL SECURITY
-- =========================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skill_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE captcha_challenges ENABLE ROW LEVEL SECURITY;

-- =========================
-- BASIC RLS POLICIES
-- =========================

-- Company-scoped access for users
CREATE POLICY company_users_policy ON users
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY company_jobs_policy ON jobs
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- Candidates can access their own data
CREATE POLICY candidate_self_policy ON candidates
  FOR ALL USING (id = (auth.jwt() ->> 'candidate_id')::uuid);

-- Public job listings for candidates
CREATE POLICY public_jobs_policy ON jobs
  FOR SELECT USING (is_public = true AND status = 'open');

-- Block direct client access to sensitive auth tables
CREATE POLICY no_client_access_otp ON otp_challenges
  FOR ALL USING (false);

CREATE POLICY no_client_access_sessions ON sessions
  FOR ALL USING (false);

CREATE POLICY no_client_access_captcha ON captcha_challenges
  FOR ALL USING (false);

-- =========================
-- SEED DATA
-- =========================

-- Insert essential skills
INSERT INTO skills (name, description) VALUES
  ('JavaScript', 'Programming language for web development'),
  ('Python', 'General-purpose programming language'),
  ('React', 'JavaScript library for building user interfaces'),
  ('Node.js', 'JavaScript runtime for server-side development'),
  ('SQL', 'Database query language'),
  ('Communication', 'Verbal and written communication skills'),
  ('Problem Solving', 'Analytical and critical thinking abilities'),
  ('Leadership', 'Team management and guidance skills')
ON CONFLICT (name) DO NOTHING;

-- Insert sample company
INSERT INTO companies (name, description_md, company_type, industry, size_band, verified) VALUES
  ('TechCorp Inc', 'Leading technology company specializing in AI solutions', 'product', 'Technology', '201-500', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;
