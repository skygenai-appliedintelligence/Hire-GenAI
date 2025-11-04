-- =====================================================
-- FIX CV PARSING USAGE TABLE FOR REAL OPENAI COSTS
-- =====================================================
-- Problem: unit_price column stores fixed $0.50, not real OpenAI costs
-- Solution: Add columns to track real OpenAI costs and pricing source

-- Add new columns to track real OpenAI costs
ALTER TABLE cv_parsing_usage 
ADD COLUMN IF NOT EXISTS openai_base_cost decimal(10,6),  -- Real cost from OpenAI API
ADD COLUMN IF NOT EXISTS pricing_source varchar(20) DEFAULT 'fallback',  -- 'openai-api' or 'fallback'
ADD COLUMN IF NOT EXISTS tokens_used integer,  -- Tokens consumed (if available)
ADD COLUMN IF NOT EXISTS profit_margin_percent decimal(5,2) DEFAULT 25.00;  -- Profit margin applied

-- Add comment explaining the columns
COMMENT ON COLUMN cv_parsing_usage.unit_price IS 'Deprecated: Use openai_base_cost instead. Kept for backward compatibility.';
COMMENT ON COLUMN cv_parsing_usage.openai_base_cost IS 'Real cost from OpenAI Platform API (base cost before margin)';
COMMENT ON COLUMN cv_parsing_usage.cost IS 'Final cost charged to customer (openai_base_cost + profit margin)';
COMMENT ON COLUMN cv_parsing_usage.pricing_source IS 'Source of pricing: openai-api (real) or fallback (estimated)';
COMMENT ON COLUMN cv_parsing_usage.tokens_used IS 'Number of tokens consumed by OpenAI API';
COMMENT ON COLUMN cv_parsing_usage.profit_margin_percent IS 'Profit margin percentage applied to base cost';

-- Update existing records to set openai_base_cost from unit_price (for backward compatibility)
UPDATE cv_parsing_usage 
SET openai_base_cost = unit_price,
    pricing_source = 'fallback'
WHERE openai_base_cost IS NULL;

-- Create index for filtering by pricing source
CREATE INDEX IF NOT EXISTS idx_cv_parsing_pricing_source ON cv_parsing_usage(pricing_source);

-- =====================================================
-- FIX QUESTION GENERATION USAGE TABLE
-- =====================================================

ALTER TABLE question_generation_usage 
ADD COLUMN IF NOT EXISTS openai_base_cost decimal(10,6),  -- Real cost from OpenAI API
ADD COLUMN IF NOT EXISTS pricing_source varchar(20) DEFAULT 'fallback',  -- 'openai-api' or 'fallback'
ADD COLUMN IF NOT EXISTS profit_margin_percent decimal(5,2) DEFAULT 25.00;

COMMENT ON COLUMN question_generation_usage.openai_base_cost IS 'Real cost from OpenAI Platform API (base cost before margin)';
COMMENT ON COLUMN question_generation_usage.cost IS 'Final cost charged to customer (openai_base_cost + profit margin)';
COMMENT ON COLUMN question_generation_usage.pricing_source IS 'Source of pricing: openai-api (real) or fallback (estimated)';

UPDATE question_generation_usage 
SET openai_base_cost = cost / 1.25,  -- Reverse calculate base cost (assuming 25% margin)
    pricing_source = 'fallback'
WHERE openai_base_cost IS NULL;

CREATE INDEX IF NOT EXISTS idx_question_gen_pricing_source ON question_generation_usage(pricing_source);

-- =====================================================
-- FIX VIDEO INTERVIEW USAGE TABLE
-- =====================================================

ALTER TABLE video_interview_usage 
ADD COLUMN IF NOT EXISTS openai_base_cost decimal(10,6),  -- Real cost from OpenAI API
ADD COLUMN IF NOT EXISTS pricing_source varchar(20) DEFAULT 'fallback',  -- 'openai-api' or 'fallback'
ADD COLUMN IF NOT EXISTS tokens_used integer,  -- Tokens consumed (if available)
ADD COLUMN IF NOT EXISTS profit_margin_percent decimal(5,2) DEFAULT 25.00;

COMMENT ON COLUMN video_interview_usage.minute_price IS 'Deprecated: Use openai_base_cost instead. Kept for backward compatibility.';
COMMENT ON COLUMN video_interview_usage.openai_base_cost IS 'Real cost from OpenAI Platform API (base cost before margin)';
COMMENT ON COLUMN video_interview_usage.cost IS 'Final cost charged to customer (openai_base_cost + profit margin)';
COMMENT ON COLUMN video_interview_usage.pricing_source IS 'Source of pricing: openai-api (real) or fallback (estimated)';

UPDATE video_interview_usage 
SET openai_base_cost = cost / 1.25,  -- Reverse calculate base cost (assuming 25% margin)
    pricing_source = 'fallback'
WHERE openai_base_cost IS NULL;

CREATE INDEX IF NOT EXISTS idx_video_interview_pricing_source ON video_interview_usage(pricing_source);

-- =====================================================
-- CREATE VIEW FOR REAL-TIME USAGE ANALYTICS
-- =====================================================

CREATE OR REPLACE VIEW v_usage_analytics AS
SELECT 
  company_id,
  job_id,
  'cv_parsing' as usage_type,
  COUNT(*) as usage_count,
  SUM(openai_base_cost) as total_base_cost,
  SUM(cost) as total_final_cost,
  SUM(CASE WHEN pricing_source = 'openai-api' THEN 1 ELSE 0 END) as real_api_count,
  SUM(CASE WHEN pricing_source = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
  AVG(profit_margin_percent) as avg_margin_percent,
  MIN(created_at) as first_usage,
  MAX(created_at) as last_usage
FROM cv_parsing_usage
GROUP BY company_id, job_id

UNION ALL

SELECT 
  company_id,
  job_id,
  'question_generation' as usage_type,
  COUNT(*) as usage_count,
  SUM(openai_base_cost) as total_base_cost,
  SUM(cost) as total_final_cost,
  SUM(CASE WHEN pricing_source = 'openai-api' THEN 1 ELSE 0 END) as real_api_count,
  SUM(CASE WHEN pricing_source = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
  AVG(profit_margin_percent) as avg_margin_percent,
  MIN(created_at) as first_usage,
  MAX(created_at) as last_usage
FROM question_generation_usage
GROUP BY company_id, job_id

UNION ALL

SELECT 
  company_id,
  job_id,
  'video_interview' as usage_type,
  COUNT(*) as usage_count,
  SUM(openai_base_cost) as total_base_cost,
  SUM(cost) as total_final_cost,
  SUM(CASE WHEN pricing_source = 'openai-api' THEN 1 ELSE 0 END) as real_api_count,
  SUM(CASE WHEN pricing_source = 'fallback' THEN 1 ELSE 0 END) as fallback_count,
  AVG(profit_margin_percent) as avg_margin_percent,
  MIN(created_at) as first_usage,
  MAX(created_at) as last_usage
FROM video_interview_usage
GROUP BY company_id, job_id;

COMMENT ON VIEW v_usage_analytics IS 'Real-time usage analytics showing real OpenAI costs vs fallback estimates';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check CV parsing usage with real costs
-- SELECT 
--   company_id,
--   COUNT(*) as total_cvs,
--   SUM(CASE WHEN pricing_source = 'openai-api' THEN 1 ELSE 0 END) as real_api_cvs,
--   SUM(CASE WHEN pricing_source = 'fallback' THEN 1 ELSE 0 END) as fallback_cvs,
--   ROUND(AVG(openai_base_cost)::numeric, 4) as avg_base_cost,
--   ROUND(AVG(cost)::numeric, 2) as avg_final_cost
-- FROM cv_parsing_usage
-- GROUP BY company_id;

-- Check usage analytics view
-- SELECT * FROM v_usage_analytics 
-- WHERE company_id = 'your-company-id'
-- ORDER BY usage_type, last_usage DESC;
