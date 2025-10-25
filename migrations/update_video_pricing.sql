-- Update video interview pricing to match OpenAI Realtime API costs
-- Realtime API: $0.06/min input + $0.24/min output = $0.30/min total

-- Update pricing_history table with new video pricing
UPDATE pricing_history
SET 
  video_price_per_min = 0.30,
  notes = 'Updated to OpenAI Realtime API pricing: $0.06 input + $0.24 output per minute'
WHERE effective_until IS NULL OR effective_until > NOW();

-- If no active pricing exists, insert default pricing
INSERT INTO pricing_history (
  cv_parse_price,
  question_price_per_1k_tokens,
  video_price_per_min,
  recharge_amount,
  effective_from,
  notes
)
SELECT 
  0.50,
  0.002,
  0.30,
  100.00,
  NOW(),
  'OpenAI Realtime API pricing: $0.30/min for video interviews'
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_history 
  WHERE effective_until IS NULL OR effective_until > NOW()
);

-- Verify the update
SELECT 
  cv_parse_price,
  question_price_per_1k_tokens,
  video_price_per_min,
  recharge_amount,
  effective_from,
  notes
FROM pricing_history
WHERE effective_until IS NULL OR effective_until > NOW()
ORDER BY effective_from DESC
LIMIT 1;
