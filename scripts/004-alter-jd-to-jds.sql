-- Rename table jd -> jds if needed and add missing columns used by the app
-- Safe to run multiple times

DO $$
BEGIN
  -- If jd exists and jds does not, rename
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'jd'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'jds'
  ) THEN
    EXECUTE 'ALTER TABLE public.jd RENAME TO jds';
  END IF;
END $$;
LANGUAGE plpgsql;

-- Ensure table jds exists (create minimal if neither existed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'jds'
  ) THEN
    EXECUTE $$
      CREATE TABLE public.jds (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        location TEXT,
        salary_range TEXT,
        employment_type TEXT,
        experience_level TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        posted_platforms TEXT NOT NULL DEFAULT '[]',
        platform_job_ids TEXT NOT NULL DEFAULT '{}',
        posting_results TEXT NOT NULL DEFAULT '[]',
        interview_rounds INTEGER NOT NULL DEFAULT 3,
        interview_duration TEXT,
        created_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    $$;
  END IF;
END $$;

-- Add/align columns used by the app
ALTER TABLE public.jds
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '' ,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS salary_range TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS posted_platforms TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS platform_job_ids TEXT DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS posting_results TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS interview_rounds INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS interview_duration TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure essential NOT NULLs where appropriate
DO $$
BEGIN
  -- Make sure id, company_id, title, slug, description, status are NOT NULL
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN id SET NOT NULL'; EXCEPTION WHEN others THEN END;
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN company_id SET NOT NULL'; EXCEPTION WHEN others THEN END;
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN title SET NOT NULL'; EXCEPTION WHEN others THEN END;
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN slug SET NOT NULL'; EXCEPTION WHEN others THEN END;
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN description SET NOT NULL'; EXCEPTION WHEN others THEN END;
  BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN status SET NOT NULL'; EXCEPTION WHEN others THEN END;
END $$;

-- Helpful indexes/uniques
CREATE INDEX IF NOT EXISTS idx_jds_company_id ON public.jds(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jds_company_slug ON public.jds(company_id, slug);

-- Ensure array columns are non-null with defaults for Prisma compatibility
DO $$
BEGIN
  -- must_have_skills
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jds' AND column_name='must_have_skills'
  ) THEN
    EXECUTE 'UPDATE public.jds SET must_have_skills = ''{}'' WHERE must_have_skills IS NULL';
    BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN must_have_skills SET DEFAULT ''{}'''; EXCEPTION WHEN others THEN END;
    BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN must_have_skills SET NOT NULL'; EXCEPTION WHEN others THEN END;
  END IF;

  -- nice_to_have_skills
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jds' AND column_name='nice_to_have_skills'
  ) THEN
    EXECUTE 'UPDATE public.jds SET nice_to_have_skills = ''{}'' WHERE nice_to_have_skills IS NULL';
    BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN nice_to_have_skills SET DEFAULT ''{}'''; EXCEPTION WHEN others THEN END;
    BEGIN EXECUTE 'ALTER TABLE public.jds ALTER COLUMN nice_to_have_skills SET NOT NULL'; EXCEPTION WHEN others THEN END;
  END IF;
END $$;
