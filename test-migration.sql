-- =====================================================
-- TEST: Check if Migration Ran Successfully
-- =====================================================

-- Test 1: Check if new columns exist
SELECT 
  'Test 1: Column Existence' as test_name,
  COUNT(*) as columns_found,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - All columns exist'
    ELSE '❌ FAIL - Migration not run'
  END as result
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent');

-- Test 2: Check column data types
SELECT 
  'Test 2: Column Details' as test_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'openai_base_cost' AND data_type = 'numeric' THEN '✅'
    WHEN column_name = 'pricing_source' AND data_type = 'character varying' THEN '✅'
    WHEN column_name = 'tokens_used' AND data_type = 'integer' THEN '✅'
    WHEN column_name = 'profit_margin_percent' AND data_type = 'numeric' THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent')
ORDER BY column_name;

-- Test 3: Check if view was created
SELECT 
  'Test 3: Analytics View' as test_name,
  COUNT(*) as view_exists,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS - View created'
    ELSE '❌ FAIL - View not created'
  END as result
FROM information_schema.views 
WHERE table_name = 'v_usage_analytics';

-- Test 4: Check existing data
SELECT 
  'Test 4: Data Check' as test_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN pricing_source IS NOT NULL THEN 1 ELSE 0 END) as has_pricing_source,
  SUM(CASE WHEN pricing_source = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
  SUM(CASE WHEN pricing_source = 'openai-api' THEN 1 ELSE 0 END) as openai_api_count,
  CASE 
    WHEN COUNT(*) = SUM(CASE WHEN pricing_source IS NOT NULL THEN 1 ELSE 0 END) 
    THEN '✅ All records have pricing_source'
    ELSE '⚠️ Some records missing pricing_source'
  END as result
FROM cv_parsing_usage;

-- Test 5: Check latest record
SELECT 
  'Test 5: Latest Record' as test_name,
  openai_base_cost,
  cost,
  pricing_source,
  tokens_used,
  profit_margin_percent,
  created_at,
  CASE 
    WHEN pricing_source = 'openai-api' THEN '✅ Using real OpenAI costs'
    WHEN pricing_source = 'fallback' THEN '⚠️ Using fallback pricing'
    ELSE '❌ No pricing source'
  END as status
FROM cv_parsing_usage 
ORDER BY created_at DESC 
LIMIT 1;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
  '=== MIGRATION STATUS SUMMARY ===' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'cv_parsing_usage' 
          AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent')) = 4
    THEN '✅ Migration Ran Successfully'
    ELSE '❌ Migration NOT Run - Please run migrations/fix_cv_parsing_usage_real_costs.sql'
  END as migration_status;
