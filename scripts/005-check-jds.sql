-- List candidate tables and columns for jds
SELECT 'tables_check' AS section, schemaname, tablename
FROM pg_tables
WHERE tablename IN ('jds','jd','job_descriptions')
ORDER BY 2,3;

SELECT 'jds_columns' AS section, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'jds'
ORDER BY ordinal_position;
