-- Ensure array columns are NOT NULL with default empty array for Prisma String[] compatibility
UPDATE public.jds SET must_have_skills = '{}' WHERE must_have_skills IS NULL;
ALTER TABLE public.jds ALTER COLUMN must_have_skills SET DEFAULT '{}';
ALTER TABLE public.jds ALTER COLUMN must_have_skills SET NOT NULL;

UPDATE public.jds SET nice_to_have_skills = '{}' WHERE nice_to_have_skills IS NULL;
ALTER TABLE public.jds ALTER COLUMN nice_to_have_skills SET DEFAULT '{}';
ALTER TABLE public.jds ALTER COLUMN nice_to_have_skills SET NOT NULL;
