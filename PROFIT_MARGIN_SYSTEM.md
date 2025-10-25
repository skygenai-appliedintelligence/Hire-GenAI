# Profit Margin System - Complete Implementation

## Overview
Successfully implemented a configurable profit margin system that adds a percentage markup on top of OpenAI base costs. The final cost (base + markup) is calculated and displayed on the billing UI.

---

## Configuration

### Environment Variable

Add to your `.env.local` file:

```bash
# Profit margin percentage (e.g., 20 = 20% markup on OpenAI costs)
PROFIT_MARGIN_PERCENTAGE=20
```

**Default:** 20% if not specified

**Examples:**
- `PROFIT_MARGIN_PERCENTAGE=10` → 10% markup
- `PROFIT_MARGIN_PERCENTAGE=25` → 25% markup
- `PROFIT_MARGIN_PERCENTAGE=50` → 50% markup

---

## How It Works

### 1. **Cost Calculation Formula**

```typescript
baseCost = OpenAI cost (from API)
markup = baseCost × (profitMargin / 100)
finalCost = baseCost + markup
```

**Example with 20% profit margin:**
- Base OpenAI cost: $10.00
- Markup (20%): $2.00
- **Final cost charged:** $12.00

---

### 2. **Applied to All Services**

#### **Question Generation**
```typescript
// Real OpenAI token cost
baseCost = (totalTokens / 1000) × $0.002

// With 20% profit margin
finalCost = baseCost × 1.20
```

**Example:**
- 1,500 tokens used
- Base cost: (1,500 / 1,000) × $0.002 = $0.003
- Markup (20%): $0.0006
- **Final cost: $0.0036**

#### **CV Parsing**
```typescript
// Fixed base cost
baseCost = $0.50 per CV

// With 20% profit margin
finalCost = $0.50 × 1.20 = $0.60
```

#### **Video Interviews**
```typescript
// Duration-based cost
baseCost = durationMinutes × $0.10

// With 20% profit margin
finalCost = baseCost × 1.20
```

**Example:**
- 15 minutes interview
- Base cost: 15 × $0.10 = $1.50
- Markup (20%): $0.30
- **Final cost: $1.80**

---

## Implementation Details

### Files Modified

#### 1. **`lib/config.ts`**
Added billing configuration and helper functions:

```typescript
billing: {
  profitMarginPercentage: parseFloat(process.env.PROFIT_MARGIN_PERCENTAGE || '20'),
}

// Helper to calculate cost with profit margin
export const applyProfitMargin = (baseCost: number) => {
  const profitMargin = config.billing.profitMarginPercentage
  const markup = (baseCost * profitMargin) / 100
  const finalCost = baseCost + markup
  
  return {
    baseCost: parseFloat(baseCost.toFixed(4)),
    markup: parseFloat(markup.toFixed(4)),
    finalCost: parseFloat(finalCost.toFixed(4))
  }
}
```

#### 2. **`lib/database.ts`**
Updated all usage recording methods to apply profit margin:

**Question Generation:**
```typescript
const baseCost = (totalTokens / 1000) * pricing.question_price_per_1k_tokens
const { finalCost } = applyProfitMargin(baseCost)
// Store finalCost in database
```

**CV Parsing:**
```typescript
const baseCost = pricing.cv_parse_price
const { finalCost } = applyProfitMargin(baseCost)
// Store finalCost in database
```

**Video Interviews:**
```typescript
const baseCost = data.durationMinutes * pricing.video_price_per_min
const { finalCost } = applyProfitMargin(baseCost)
// Store finalCost in database
```

#### 3. **`app/api/billing/profit-margin/route.ts`** (NEW)
API endpoint to fetch current profit margin:

```typescript
GET /api/billing/profit-margin

Response:
{
  "profitMarginPercentage": 20,
  "description": "20% markup added to base OpenAI costs"
}
```

#### 4. **`app/dashboard/settings/_components/BillingContent.tsx`**
Updated UI to display cost breakdown:

- Fetches profit margin on page load
- Shows base cost + markup for each service
- Displays breakdown in small text under each cost

**UI Display Example:**
```
CV Parsing                    $6.00
Base: $5.00 + 20% markup ($1.00)
```

---

## UI Display

### Billing Usage Tab

The billing page now shows detailed cost breakdown for each service:

#### **Service Categories Section**

**CV Parsing:**
```
💼 CV Parsing                 $6.00
   Base: $5.00 + 20% markup ($1.00)
```

**JD Questions:**
```
📈 JD Questions               $0.12
   Base: $0.10 + 20% markup ($0.02)
```

**Video Interviews:**
```
📅 Video Interviews           $18.00
   Base: $15.00 + 20% markup ($3.00)
```

### Breakdown Format

```
[Service Name]                [Final Cost]
Base: [OpenAI Cost] + [X]% markup ([Markup Amount])
```

**Visual Design:**
- Main cost displayed prominently in badge
- Breakdown shown in smaller text below
- Color-coded by service (blue, green, purple)
- Only shows when profit margin > 0 and cost > 0

---

## Testing

### 1. **Set Profit Margin**

Create/update `.env.local`:
```bash
PROFIT_MARGIN_PERCENTAGE=25
```

Restart your development server.

### 2. **Generate Some Usage**

**Test Question Generation:**
1. Create a new job
2. Generate interview questions
3. Check console logs for cost calculation

**Test CV Parsing:**
1. Upload a resume
2. Check billing page

**Test Video Interview:**
1. Complete a video interview
2. Check billing page

### 3. **Verify UI Display**

Go to: `/dashboard/settings/billing?tab=usage`

**Expected Display:**
```
CV Parsing                    $0.62
Base: $0.50 + 25% markup ($0.12)
```

### 4. **Verify Database**

Check the `cost` column in usage tables:
- `cv_parsing_usage`
- `question_generation_usage`
- `video_interview_usage`

All costs should reflect the profit margin.

---

## Examples

### Example 1: 20% Profit Margin

**Scenario:** Company uses all services

| Service | Base Cost | Markup (20%) | Final Cost |
|---------|-----------|--------------|------------|
| 10 CVs | $5.00 | $1.00 | **$6.00** |
| 5K tokens | $0.01 | $0.002 | **$0.012** |
| 30 min video | $3.00 | $0.60 | **$3.60** |
| **Total** | **$8.01** | **$1.602** | **$9.612** |

### Example 2: 50% Profit Margin

**Scenario:** Same usage, higher margin

| Service | Base Cost | Markup (50%) | Final Cost |
|---------|-----------|--------------|------------|
| 10 CVs | $5.00 | $2.50 | **$7.50** |
| 5K tokens | $0.01 | $0.005 | **$0.015** |
| 30 min video | $3.00 | $1.50 | **$4.50** |
| **Total** | **$8.01** | **$4.005** | **$12.015** |

### Example 3: 10% Profit Margin

**Scenario:** Lower margin for competitive pricing

| Service | Base Cost | Markup (10%) | Final Cost |
|---------|-----------|--------------|------------|
| 10 CVs | $5.00 | $0.50 | **$5.50** |
| 5K tokens | $0.01 | $0.001 | **$0.011** |
| 30 min video | $3.00 | $0.30 | **$3.30** |
| **Total** | **$8.01** | **$0.801** | **$8.811** |

---

## Benefits

### ✅ **Transparent Pricing**
- Customers see exact breakdown
- Base OpenAI cost visible
- Markup percentage clear

### ✅ **Flexible Configuration**
- Change margin anytime via `.env.local`
- No code changes needed
- Instant effect on new usage

### ✅ **Profit Control**
- Set your desired profit margin
- Adjust based on market conditions
- Different margins for different deployments

### ✅ **Accurate Billing**
- Real OpenAI costs (not estimates)
- Consistent markup application
- Proper cost tracking

---

## Advanced Configuration

### Different Margins per Environment

**Development (.env.local):**
```bash
PROFIT_MARGIN_PERCENTAGE=10
```

**Staging (.env.staging):**
```bash
PROFIT_MARGIN_PERCENTAGE=15
```

**Production (.env.production):**
```bash
PROFIT_MARGIN_PERCENTAGE=25
```

### Dynamic Pricing Strategy

You can modify `lib/config.ts` to implement dynamic pricing:

```typescript
// Example: Higher margin for premium customers
const getCustomerProfitMargin = (customerId: string) => {
  const premiumCustomers = ['customer1', 'customer2']
  return premiumCustomers.includes(customerId) ? 15 : 25
}
```

---

## Troubleshooting

### Issue: Profit margin not applied

**Check:**
1. `.env.local` file exists and has `PROFIT_MARGIN_PERCENTAGE`
2. Server restarted after adding env variable
3. No typos in variable name

### Issue: UI not showing breakdown

**Check:**
1. `profitMargin > 0` (must be greater than zero)
2. `usageData.totals.[service] > 0` (must have usage)
3. Browser console for errors

### Issue: Wrong calculations

**Verify:**
1. Profit margin percentage is correct
2. Base costs are accurate
3. Formula: `finalCost = baseCost × (1 + margin/100)`

---

## API Reference

### GET /api/billing/profit-margin

Fetches the current profit margin percentage.

**Response:**
```json
{
  "profitMarginPercentage": 20,
  "description": "20% markup added to base OpenAI costs"
}
```

**Usage in Frontend:**
```typescript
const res = await fetch('/api/billing/profit-margin')
const data = await res.json()
console.log(data.profitMarginPercentage) // 20
```

---

## Summary

**What Changed:**
- ✅ Added `PROFIT_MARGIN_PERCENTAGE` environment variable
- ✅ Updated all billing calculations to apply profit margin
- ✅ Created UI to show base cost + markup breakdown
- ✅ Added API endpoint to fetch profit margin

**Result:**
- 🎯 Configurable profit margin on all services
- 💰 Transparent cost breakdown on UI
- 📊 Accurate billing with real OpenAI costs + markup
- ⚙️ Easy to adjust via environment variable

**Example:**
```
Set PROFIT_MARGIN_PERCENTAGE=20

OpenAI charges you: $10.00
You charge customer: $12.00
Your profit: $2.00 (20%)
```

**Perfect for SaaS pricing! 🚀**
