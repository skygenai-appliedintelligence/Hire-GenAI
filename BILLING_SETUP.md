# Billing System Setup Guide

## Environment Variables

Add these to your `.env.local` file:

```env
# Billing & Usage Pricing Configuration
CV_PARSE_PRICE=0.05                    # $0.05 per CV parse
QUESTION_PRICE_PER_1K_TOKENS=0.002     # $0.002 per 1K tokens
VIDEO_PRICE_PER_MIN=0.03               # $0.03 per minute of video
RECHARGE_AMOUNT=100.00                 # Default auto-recharge amount ($100)

# Payment Gateway Configuration
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (Optional)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

# Billing Features
ENABLE_AUTO_RECHARGE=true              # Enable auto-recharge by default
DEFAULT_MONTHLY_CAP=                   # Leave empty for no cap, or set amount like 1000.00
```

## Database Setup

Run the billing schema migration:

```bash
psql $DATABASE_URL -f scripts/billing-schema.sql
```

## Free Trial Rules

### Trial Scope
- New companies start in `trial` billing status
- Can create **exactly 1 JD** (trial JD)
- Can run **exactly 1 interview** for that JD
- All usage tied to trial JD and first interview is FREE

### Trial End Triggers
Trial ends when company attempts to:
1. Create a 2nd JD, OR
2. Schedule a 2nd interview

When trial ends:
- Billing setup required (payment method)
- Initial $100 charge and wallet top-up
- Company moved to `active` billing status

## Billing Flow

### 1. Usage Recording
When usage occurs (CV parse, question generation, video interview):
- Check if in trial and usage qualifies for free credit
- If trial: Record ledger entry with `TRIAL_CREDIT` type, cost = $0
- If not trial: Calculate cost and proceed to charging

### 2. Atomic Charging
Before recording billable usage:
1. Check wallet balance
2. If `balance < cost`:
   - If `auto_recharge_enabled`: Charge $100 (or configured amount)
   - If not enabled: Block usage, return error
3. Deduct cost from wallet
4. Record ledger entry
5. Update job_usage counters

### 3. Auto-Recharge
- Charges $100 (configurable) when wallet insufficient
- Creates invoice record
- Calls Stripe/PayPal API
- Updates wallet on success
- Implements retry logic on failure

### 4. Monthly Spend Cap
- If set, prevents charges when `current_month_spent >= monthly_spend_cap`
- Admin can raise cap or disable
- Resets monthly on first of each month

## Access Control

### Admin Role
- View all billing settings
- Update payment methods
- Change auto-recharge settings
- Set/modify spend caps
- Download invoices
- View complete usage breakdown

### Recruiter Role
- View usage for JDs they own
- Cannot modify payment settings
- Cannot change caps or auto-recharge
- Read-only access to their job usage

## Invoice Generation

Invoices are created for:
- Auto-recharge transactions
- Manual top-ups
- Monthly statements (optional)

Each invoice includes:
- Unique invoice number: `INV-YYYYMM-XXXXX`
- Line items with detailed breakdown
- Tax calculation (if tax_id provided)
- PDF generation for download
- Email delivery

## Webhooks

### Stripe Webhooks
Handle events:
- `payment_intent.succeeded`: Mark invoice paid, update wallet
- `payment_intent.payment_failed`: Record failure, start retry
- `payment_method.attached`: Update payment method details
- `payment_method.detached`: Clear payment method

### PayPal Webhooks
Handle events:
- `PAYMENT.SALE.COMPLETED`: Mark invoice paid
- `PAYMENT.SALE.DENIED`: Record failure
- `BILLING.SUBSCRIPTION.CANCELLED`: Handle cancellation

## Retry & Dunning Logic

On payment failure:
1. **First retry**: 1 hour later
2. **Second retry**: 24 hours later
3. **Third retry**: 72 hours later

If all retries fail:
- Set `billing_status = 'past_due'`
- Block new usage
- Show banner notifications
- Send email alerts

## Usage Page Features

The `/dashboard/settings/billing` page shows:

### Overview Cards
- Current wallet balance
- Current month spend
- Auto-recharge status
- Payment method on file

### Usage Breakdown
- Filter by JD (job description)
- Filter by usage type (CV Parse, Questions, Video)
- Date range selector
- Export to CSV

### Per-JD Detail View
Shows for each JD:
- CV parsing count & cost
- Question token usage & cost
- Video minutes & cost
- Total cost for that JD

### Invoice List
- All past invoices
- Status (paid, pending, failed)
- Download PDF
- Resend email

## Testing

### Test Free Trial
1. Create new company
2. Create first JD → Should be free
3. Run first interview → Should be free (TRIAL_CREDIT entries)
4. Attempt to create 2nd JD → Should require billing setup

### Test Auto-Recharge
1. Set wallet balance to $1
2. Record usage costing $5
3. Should trigger auto-recharge of $100
4. Should create invoice
5. Should deduct $5 from new balance

### Test Spend Cap
1. Set monthly cap to $50
2. Spend $45
3. Attempt $10 usage → Should block with error
4. Admin raises cap to $100 → Should allow

## Migration Checklist

- [ ] Run `billing-schema.sql`
- [ ] Set environment variables
- [ ] Configure Stripe/PayPal accounts
- [ ] Set up webhook endpoints
- [ ] Test trial flow
- [ ] Test payment flow
- [ ] Test retry logic
- [ ] Configure email templates
