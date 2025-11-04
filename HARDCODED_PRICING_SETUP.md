# Hardcoded Pricing Configuration

## Overview
The system now uses **hardcoded pricing** from environment variables that is **NEVER exposed** in the database or UI. This ensures pricing remains completely internal and configurable only through `.env.local`.

## Environment Variables

Add these to your `.env.local` file:

```env
# Hardcoded Pricing (INTERNAL USE ONLY - Never shown in DB or UI)
CV_PARSING_PRICE=0.50
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
```

## How It Works

### CV Parsing
- **Price**: $0.50 per CV (configurable via `CV_PARSING_PRICE`)
- **Calculation**: Fixed price per CV, no additional charges
- **Database**: Stores only the final cost, not the pricing logic
- **UI**: Shows total cost only, never the per-unit price

### Video Interview
- **Price**: $0.50 per minute (configurable via `VIDEO_INTERVIEW_PRICE_PER_MINUTE`)
- **Calculation**: `duration_minutes × price_per_minute`
- **Database**: Stores only the final cost, not the pricing logic
- **UI**: Shows total cost only, never the per-minute rate

## Key Features

✅ **Environment-based**: Pricing configured only in `.env.local`
✅ **Never exposed**: Pricing rates NEVER appear in database or UI
✅ **Easy to change**: Update `.env.local` and restart server
✅ **No profit margin**: Direct pricing, no additional markup
✅ **Internal only**: Pricing logic stays server-side

## Implementation Details

### Config File (`lib/config.ts`)
```typescript
billing: {
  // Hardcoded pricing (NEVER shown in database or UI)
  cvParsingPrice: parseFloat(process.env.CV_PARSING_PRICE || '0.50'),
  videoInterviewPricePerMinute: parseFloat(process.env.VIDEO_INTERVIEW_PRICE_PER_MINUTE || '0.50'),
}
```

### Helper Functions
```typescript
// Get CV parsing price (INTERNAL USE ONLY)
export const getCVParsingPrice = () => {
  return config.billing.cvParsingPrice
}

// Get video interview price per minute (INTERNAL USE ONLY)
export const getVideoInterviewPricePerMinute = () => {
  return config.billing.videoInterviewPricePerMinute
}
```

### Database Methods
- `recordCVParsingUsage()`: Uses `getCVParsingPrice()` internally
- `recordVideoInterviewUsage()`: Uses `getVideoInterviewPricePerMinute()` internally

## Example Usage

### Set Pricing in .env.local
```env
# $0.50 per CV
CV_PARSING_PRICE=0.50

# $0.50 per minute of video interview
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
```

### Restart Server
```bash
npm run dev
```

### Billing Calculation
- **10 CVs**: 10 × $0.50 = **$5.00**
- **15 minute interview**: 15 × $0.50 = **$7.50**
- **Total**: **$12.50**

## Security

🔒 **Pricing rates are NEVER exposed to:**
- Database tables
- API responses
- UI components
- Client-side code
- Console logs (except internal server logs)

🔒 **Only the final calculated cost is stored/shown**

## Changing Pricing

1. Open `.env.local`
2. Update the values:
   ```env
   CV_PARSING_PRICE=0.75
   VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.60
   ```
3. Restart the development server
4. New pricing applies immediately to all new usage

## Console Logs

When billing is recorded, you'll see:
```
🎯 [CV PARSING] Starting billing calculation...
💰 [CV PARSING] Using hardcoded pricing from environment
💵 Price per CV: $0.50
🔒 [INTERNAL] Pricing configured in .env.local only
💾 [CV PARSING] Cost stored in database successfully
💰 Final Cost: $0.50
```

## Files Modified

- `lib/config.ts` - Added pricing configuration
- `lib/database.ts` - Updated `recordCVParsingUsage()` and `recordVideoInterviewUsage()`

## Result

✅ Pricing is completely internal and configurable
✅ No OpenAI API calls for pricing
✅ Simple, predictable billing
✅ Easy to adjust rates via environment variables
✅ Zero exposure of pricing logic to end users
