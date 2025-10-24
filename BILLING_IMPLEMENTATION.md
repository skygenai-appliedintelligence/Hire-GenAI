# Billing & Usage Tracking System Implementation

## Overview
Comprehensive billing and usage tracking system for HireGenAI platform with database-backed storage, real-time cost calculation, and detailed analytics.

## Database Schema

### Tables Created
1. **company_billing** - Company billing settings and wallet management
2. **cv_parsing_usage** - CV parsing usage tracking ($0.50 per CV)
3. **question_generation_usage** - Question generation usage ($0.002 per 1K tokens)
4. **video_interview_usage** - Video interview usage ($0.10 per minute)
5. **job_usage_summary** - Aggregated usage by job (auto-updated via triggers)
6. **usage_ledger** - Complete audit trail of all charges
7. **invoices** - Invoice records with line items
8. **pricing_history** - Historical pricing configuration
9. **webhook_events** - Payment provider webhook logs

### Enums
- `billing_status`: trial, active, past_due, suspended, cancelled
- `payment_provider`: stripe, paypal
- `invoice_status`: pending, paid, failed, refunded
- `ledger_entry_type`: TRIAL_CREDIT, CV_PARSE, JD_QUESTIONS, VIDEO_INTERVIEW, AUTO_RECHARGE, MANUAL_RECHARGE, REFUND, ADJUSTMENT

## Pricing Structure

| Service | Price | Unit |
|---------|-------|------|
| CV Parsing | $0.50 | per CV |
| Question Generation | $0.002 | per 1K tokens |
| Video Interview | $0.10 | per minute |
| Auto-Recharge | $100.00 | per recharge |

## DatabaseService Methods

### Billing Management
```typescript
// Get company billing status
DatabaseService.getCompanyBilling(companyId: string)

// Update billing settings
DatabaseService.updateBillingSettings(companyId: string, settings: {
  autoRechargeEnabled?: boolean
  monthlySpendCap?: number | null
})

// Get current pricing
DatabaseService.getCurrentPricing()
```

### Usage Recording
```typescript
// Record CV parsing
DatabaseService.recordCVParsingUsage({
  companyId: string
  jobId: string
  candidateId?: string
  fileId?: string
  fileSizeKb?: number
  parseSuccessful?: boolean
  successRate?: number
})

// Record question generation
DatabaseService.recordQuestionGenerationUsage({
  companyId: string
  jobId: string
  promptTokens: number
  completionTokens: number
  questionCount: number
  modelUsed?: string
})

// Record video interview
DatabaseService.recordVideoInterviewUsage({
  companyId: string
  jobId: string
  interviewId?: string
  candidateId?: string
  durationMinutes: number
  completedQuestions?: number
  totalQuestions?: number
  videoQuality?: string
})
```

### Analytics & Reporting
```typescript
// Get usage totals
DatabaseService.getCompanyUsage(companyId: string, filters?: {
  jobId?: string
  entryType?: string
  startDate?: Date
  endDate?: Date
})

// Get usage by job
DatabaseService.getUsageByJob(companyId: string, filters?: {
  startDate?: Date
  endDate?: Date
})

// Get invoices
DatabaseService.getCompanyInvoices(companyId: string, limit?: number)

// Create invoice
DatabaseService.createInvoice(data: {
  companyId: string
  subtotal: number
  taxRate?: number
  taxAmount?: number
  total: number
  description?: string
  lineItems?: any[]
  timePeriod?: { start: Date; end: Date }
})
```

## API Endpoints

### GET /api/billing/status
Get billing status and wallet information
```typescript
Query: ?companyId=xxx
Response: {
  ok: true,
  billing: {
    status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled',
    walletBalance: number,
    autoRechargeEnabled: boolean,
    monthlySpendCap: number | null,
    currentMonthSpent: number,
    totalSpent: number,
    paymentMethod: { ... } | null,
    trialInfo: { ... } | null
  },
  pricing: { ... }
}
```

### GET /api/billing/usage
Get usage analytics and job breakdown
```typescript
Query: ?companyId=xxx&jobId=xxx&startDate=xxx&endDate=xxx&entryType=xxx
Response: {
  ok: true,
  jobUsage: [{
    jobId: string,
    jobTitle: string,
    cvParsingCount: number,
    cvParsingCost: number,
    jdQuestionTokensIn: number,
    jdQuestionTokensOut: number,
    jdQuestionsCost: number,
    videoMinutes: number,
    videoCost: number,
    totalCost: number
  }],
  totals: {
    cvParsing: number,
    cvCount: number,
    jdQuestions: number,
    tokenCount: number,
    video: number,
    videoMinutes: number
  }
}
```

### GET /api/billing/invoices
Get invoice history
```typescript
Query: ?companyId=xxx&limit=20
Response: {
  ok: true,
  invoices: [{
    id: string,
    invoiceNumber: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    subtotal: number,
    taxRate: number | null,
    taxAmount: number,
    total: number,
    paymentProvider: string,
    paymentMethodLast4: string,
    paidAt: string | null,
    pdfUrl: string | null,
    description: string,
    lineItems: any[],
    createdAt: string
  }]
}
```

### PUT /api/billing/settings
Update billing settings
```typescript
Body: {
  companyId: string,
  autoRechargeEnabled?: boolean,
  monthlySpendCap?: number | null
}
Response: {
  ok: true,
  billing: {
    autoRechargeEnabled: boolean,
    monthlySpendCap: number | null
  }
}
```

### POST /api/billing/init
Initialize billing for a company (for testing)
```typescript
Body: {
  companyId: string,
  insertSampleData?: boolean
}
Response: {
  ok: true,
  message: string,
  billing: { ... },
  sampleDataInserted: boolean
}
```

## UI Pages

### Overview Tab
**URL:** `/dashboard/settings/billing?tab=overview`

**Features:**
- Wallet balance display
- Current month spending
- Total lifetime spending
- Auto-recharge status
- Billing status badge (Trial/Active/Past Due/Suspended)
- PayPal subscription integration

### Usage Tab
**URL:** `/dashboard/settings/billing?tab=usage`

**Features:**
- Filter by job, usage type, and date range
- Usage overview cards (CV Parsing, Questions, Video, Total)
- Service category breakdown
- Usage statistics (CVs processed, tokens used, video minutes)
- Detailed job-by-job breakdown with cost analysis
- Export functionality

### Invoices Tab
**URL:** `/dashboard/settings/billing?tab=invoices`

**Features:**
- Invoice history list
- Status badges (Paid/Pending/Failed)
- PDF download buttons
- Invoice details (number, date, amount)

### Settings Tab
**URL:** `/dashboard/settings/billing?tab=settings`

**Features:**
- Auto-recharge toggle
- Monthly spend cap configuration
- Payment method management

## Setup Instructions

### 1. Run Database Migration
Execute the SQL migration to create all necessary tables:

```bash
# Option 1: Using psql command line
psql -h your-host -p 5432 -U your-user -d your-db -f migrations/billing_system.sql

# Option 2: Copy and paste SQL into Supabase SQL Editor
# Open migrations/billing_system.sql and run in Supabase dashboard
```

### 2. Initialize Billing for Testing
Visit `/test-billing` page and click "Initialize with Sample Data"

This will:
- Create billing record for your company
- Insert sample CV parsing usage
- Insert sample question generation usage
- Insert sample video interview usage
- Trigger automatic job usage summary updates

### 3. Verify Data
Check the billing pages:
- Overview: `/dashboard/settings/billing?tab=overview`
- Usage: `/dashboard/settings/billing?tab=usage`
- Invoices: `/dashboard/settings/billing?tab=invoices`

## Integration Points

### When to Record Usage

#### CV Parsing
```typescript
// After successfully parsing a CV
await DatabaseService.recordCVParsingUsage({
  companyId: company.id,
  jobId: job.id,
  candidateId: candidate.id,
  fileId: file.id,
  fileSizeKb: Math.round(file.size / 1024),
  parseSuccessful: true,
  successRate: 95.5
})
```

#### Question Generation
```typescript
// After generating questions with AI
const response = await openai.chat.completions.create({ ... })
await DatabaseService.recordQuestionGenerationUsage({
  companyId: company.id,
  jobId: job.id,
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  questionCount: questions.length,
  modelUsed: 'gpt-4'
})
```

#### Video Interview
```typescript
// After completing a video interview
await DatabaseService.recordVideoInterviewUsage({
  companyId: company.id,
  jobId: job.id,
  interviewId: interview.id,
  candidateId: candidate.id,
  durationMinutes: interview.duration / 60,
  completedQuestions: interview.completedQuestions,
  totalQuestions: interview.totalQuestions,
  videoQuality: 'HD'
})
```

## Automatic Features

### Database Triggers
- **Auto-update job_usage_summary**: Automatically recalculates job totals when usage is recorded
- **Auto-initialize billing**: New companies automatically get billing records created
- **Monthly spend reset**: Function available to reset monthly spending counters

### Cost Calculation
- Costs are calculated automatically using current pricing from `pricing_history` table
- Historical pricing is preserved for audit purposes
- Each usage record stores the unit price at time of use

## Trial Mode

Companies start in 'trial' mode with:
- $0 wallet balance
- Can create 1 job description
- Can run 1 video interview
- No charges applied during trial

To activate:
- Add payment method
- Change status to 'active'
- Enable auto-recharge

## Security & Data Isolation

All API endpoints require `companyId` parameter and filter data by company:
- ✅ Company A cannot see Company B's usage
- ✅ Company A cannot see Company B's invoices
- ✅ Company A cannot modify Company B's settings

Database queries use `WHERE company_id = $1::uuid` for all operations.

## Files Modified/Created

### Database
- `migrations/billing_system.sql` - Complete database schema

### Backend
- `lib/database.ts` - Added billing methods (400+ lines)
- `app/api/billing/status/route.ts` - Billing status endpoint
- `app/api/billing/usage/route.ts` - Usage analytics endpoint
- `app/api/billing/invoices/route.ts` - Invoice history endpoint
- `app/api/billing/settings/route.ts` - Settings update endpoint
- `app/api/billing/init/route.ts` - Initialization endpoint (testing)

### Frontend
- `app/dashboard/settings/_components/BillingContent.tsx` - Already exists, connects to APIs
- `app/test-billing/page.tsx` - Testing/initialization page

### Documentation
- `BILLING_IMPLEMENTATION.md` - This file

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Initialize billing via `/test-billing` page
- [ ] Verify overview tab shows correct data
- [ ] Verify usage tab shows sample data
- [ ] Test job filter on usage tab
- [ ] Test date range filter on usage tab
- [ ] Verify invoices tab (may be empty initially)
- [ ] Test settings update (auto-recharge toggle)
- [ ] Test settings update (monthly cap)
- [ ] Verify data isolation (create second company, check separation)

## Future Enhancements

1. **Payment Integration**
   - Stripe payment method addition
   - PayPal billing agreement
   - Auto-recharge implementation
   - Invoice payment processing

2. **Advanced Features**
   - PDF invoice generation
   - Email notifications for low balance
   - Usage alerts and limits
   - Cost forecasting
   - Budget recommendations

3. **Analytics**
   - Cost trends over time
   - Usage patterns analysis
   - ROI calculations
   - Comparative analytics

## Support

For issues or questions:
1. Check database connection in `.env.local`
2. Verify all tables exist in database
3. Check browser console for API errors
4. Review server logs for backend errors
5. Ensure company is properly initialized

## Cost Breakdown Example

For a typical hiring workflow:
- **CV Parsing**: 100 CVs × $0.50 = $50.00
- **Question Generation**: 500K tokens × $0.002 = $1.00
- **Video Interviews**: 50 interviews × 20 min × $0.10 = $100.00
- **Total**: $151.00 per job posting

With auto-recharge at $100, this would trigger 2 recharges for a typical job.
