-- =========================
-- BILLING & USAGE TRACKING SYSTEM
-- =========================

-- Billing status enum
DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('trial','active','past_due','suspended','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment provider enum
DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('stripe','paypal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoice status enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ledger entry type enum
DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM ('TRIAL_CREDIT','CV_PARSE','JD_QUESTIONS','VIDEO_MINUTES','AUTO_RECHARGE','MANUAL_RECHARGE','REFUND','ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- COMPANY BILLING SETTINGS
-- =========================
CREATE TABLE IF NOT EXISTS company_billing (
  company_id              uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  billing_status          billing_status NOT NULL DEFAULT 'trial',
  wallet_balance          decimal(10,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  auto_recharge_enabled   boolean NOT NULL DEFAULT true,
  monthly_spend_cap       decimal(10,2),  -- NULL means no cap
  
  -- Trial tracking
  trial_jd_id             uuid,  -- The one JD allowed in trial
  trial_interview_count   int NOT NULL DEFAULT 0,  -- Count of interviews in trial
  trial_ended_at          timestamptz,
  
  -- Payment method
  payment_provider        payment_provider,
  payment_method_id       text,  -- Stripe payment method ID or PayPal billing agreement ID
  payment_method_last4    text,
  payment_method_brand    text,  -- visa, mastercard, etc.
  payment_method_exp      text,  -- MM/YY format
  
  -- Spending metrics
  total_spent             decimal(10,2) NOT NULL DEFAULT 0.00,
  current_month_spent     decimal(10,2) NOT NULL DEFAULT 0.00,
  current_month_start     timestamptz,
  
  -- Retry/dunning
  failed_charge_count     int NOT NULL DEFAULT 0,
  next_retry_at           timestamptz,
  
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Index for finding companies needing retry
CREATE INDEX IF NOT EXISTS idx_company_billing_retry ON company_billing(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- =========================
-- JOB USAGE TRACKING
-- =========================
CREATE TABLE IF NOT EXISTS job_usage (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Usage counters
  cv_parsing_count      int NOT NULL DEFAULT 0,
  jd_question_tokens_in int NOT NULL DEFAULT 0,  -- Input tokens
  jd_question_tokens_out int NOT NULL DEFAULT 0, -- Output tokens
  video_minutes         decimal(10,2) NOT NULL DEFAULT 0.00,
  
  -- Costs (calculated from usage * unit price)
  cv_parsing_cost       decimal(10,2) NOT NULL DEFAULT 0.00,
  jd_questions_cost     decimal(10,2) NOT NULL DEFAULT 0.00,
  video_cost            decimal(10,2) NOT NULL DEFAULT 0.00,
  total_cost            decimal(10,2) NOT NULL DEFAULT 0.00,
  
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_usage_company ON job_usage(company_id);

-- =========================
-- USAGE LEDGER (Audit Trail)
-- =========================
CREATE TABLE IF NOT EXISTS usage_ledger (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id            uuid REFERENCES jobs(id) ON DELETE SET NULL,
  
  entry_type        ledger_entry_type NOT NULL,
  description       text NOT NULL,
  
  -- Usage details
  quantity          decimal(10,4),  -- Number of units (CVs, tokens, minutes)
  unit_price        decimal(10,6),  -- Price per unit at time of charge
  amount            decimal(10,2) NOT NULL,  -- Total amount (positive for charges, negative for credits)
  
  -- Wallet impact
  balance_before    decimal(10,2) NOT NULL,
  balance_after     decimal(10,2) NOT NULL,
  
  -- Related records
  invoice_id        uuid,  -- References invoices table
  metadata          jsonb,  -- Additional data (e.g., token counts, video session ID)
  
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_company ON usage_ledger(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_job ON usage_ledger(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_ledger_type ON usage_ledger(entry_type);

-- =========================
-- INVOICES
-- =========================
CREATE TABLE IF NOT EXISTS invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  invoice_number        text NOT NULL UNIQUE,  -- INV-YYYYMM-XXXXX format
  status                invoice_status NOT NULL DEFAULT 'pending',
  
  -- Amounts
  subtotal              decimal(10,2) NOT NULL,
  tax_rate              decimal(5,4),  -- e.g., 0.0825 for 8.25%
  tax_amount            decimal(10,2),
  total                 decimal(10,2) NOT NULL,
  
  -- Payment
  payment_provider      payment_provider,
  payment_intent_id     text,  -- Stripe PaymentIntent ID or PayPal transaction ID
  payment_method_last4  text,
  paid_at               timestamptz,
  
  -- PDF generation
  pdf_url               text,  -- URL to generated PDF invoice
  
  -- Billing details (snapshot at time of invoice)
  billing_name          text,
  billing_email         text,
  billing_address       jsonb,
  tax_id                text,
  
  -- Metadata
  description           text,
  line_items            jsonb,  -- Array of line items for detailed breakdown
  
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- =========================
-- PRICING CONFIGURATION (for audit trail)
-- =========================
CREATE TABLE IF NOT EXISTS pricing_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cv_parse_price        decimal(10,6) NOT NULL,
  question_price_per_1k_tokens decimal(10,6) NOT NULL,
  video_price_per_min   decimal(10,6) NOT NULL,
  recharge_amount       decimal(10,2) NOT NULL DEFAULT 100.00,
  
  effective_from        timestamptz NOT NULL DEFAULT now(),
  effective_until       timestamptz,
  
  notes                 text
);

-- Insert current pricing as baseline
INSERT INTO pricing_history (
  cv_parse_price,
  question_price_per_1k_tokens,
  video_price_per_min,
  recharge_amount,
  effective_from,
  notes
)
VALUES (
  0.05,    -- $0.05 per CV parse
  0.002,   -- $0.002 per 1K tokens
  0.03,    -- $0.03 per minute
  100.00,  -- $100 recharge amount
  now(),
  'Initial pricing structure'
) ON CONFLICT DO NOTHING;

-- =========================
-- WEBHOOK EVENTS LOG
-- =========================
CREATE TABLE IF NOT EXISTS webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          payment_provider NOT NULL,
  event_type        text NOT NULL,
  event_id          text NOT NULL UNIQUE,  -- Provider's event ID
  
  payload           jsonb NOT NULL,
  processed         boolean NOT NULL DEFAULT false,
  error_message     text,
  
  company_id        uuid REFERENCES companies(id) ON DELETE SET NULL,
  invoice_id        uuid REFERENCES invoices(id) ON DELETE SET NULL,
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Function to initialize billing for a new company
CREATE OR REPLACE FUNCTION initialize_company_billing(p_company_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO company_billing (company_id, billing_status, wallet_balance, auto_recharge_enabled)
  VALUES (p_company_id, 'trial', 0.00, true)
  ON CONFLICT (company_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-initialize billing when a company is created
CREATE OR REPLACE FUNCTION auto_init_company_billing()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_company_billing(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_init_billing ON companies;
CREATE TRIGGER trigger_auto_init_billing
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_company_billing();

-- Function to update monthly spend tracking
CREATE OR REPLACE FUNCTION update_monthly_spend()
RETURNS void AS $$
BEGIN
  UPDATE company_billing
  SET 
    current_month_spent = 0,
    current_month_start = date_trunc('month', now())
  WHERE 
    current_month_start IS NULL 
    OR current_month_start < date_trunc('month', now());
END;
$$ LANGUAGE plpgsql;

-- Initialize existing companies with billing records
DO $$
BEGIN
  INSERT INTO company_billing (company_id, billing_status, wallet_balance, auto_recharge_enabled)
  SELECT id, 'trial', 0.00, true
  FROM companies
  ON CONFLICT (company_id) DO NOTHING;
END $$;
