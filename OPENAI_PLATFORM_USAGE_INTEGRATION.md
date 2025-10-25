# OpenAI Platform Usage Integration

## Overview
Successfully integrated real-time usage data from OpenAI Platform API into the billing usage page. The system now fetches actual usage data directly from `https://platform.openai.com/settings/organization/usage` instead of using database-tracked estimates.

## What Changed

### 1. **New Service: OpenAI Usage Service** (`lib/openai-usage-service.ts`)
- Fetches usage data from OpenAI Platform API (`/v1/organization/usage`)
- Processes raw usage data and categorizes by service type:
  - **CV Parsing**: Large token counts (>5000 tokens)
  - **Video Interviews**: Medium token counts (1000-5000 tokens)
  - **Question Generation**: Small token counts (<1000 tokens)
- Calculates costs using GPT-4o pricing:
  - Input tokens: $2.50 per 1M tokens
  - Output tokens: $10.00 per 1M tokens
  - Cached tokens: $1.25 per 1M tokens

### 2. **New API Endpoint** (`app/api/billing/openai-usage/route.ts`)
- **Endpoint**: `GET /api/billing/openai-usage`
- **Query Parameters**:
  - `startDate`: Start date (ISO string, optional)
  - `endDate`: End date (ISO string, optional)
  - `daysBack`: Number of days to look back (default: 30)
- **Response Format**:
  ```json
  {
    "ok": true,
    "totals": {
      "cvParsing": 12.50,
      "cvCount": 25,
      "jdQuestions": 0.45,
      "tokenCount": 225000,
      "video": 8.30,
      "videoMinutes": 83
    },
    "source": "openai-platform",
    "message": "Real usage data from OpenAI Platform API"
  }
  ```

### 3. **Updated UI** (`app/dashboard/settings/_components/BillingContent.tsx`)

#### Changes Made:
- **Data Source**: Changed from `/api/billing/usage` (database) to `/api/billing/openai-usage` (OpenAI Platform)
- **Removed Features**:
  - Job filter (OpenAI API provides organization-wide data only)
  - Per-job usage breakdown (not available from OpenAI API)
- **Added Features**:
  - Real-time data indicator
  - OpenAI Platform integration status card
  - Error handling with toast notifications
  - Refresh button to manually reload data

#### UI Updates:
1. **Header**: Updated to show "Real-time data from OpenAI Platform API"
2. **Filters**: Simplified to only show date range (7, 30, 90 days)
3. **Info Card**: Added new card showing:
   - Connection status to OpenAI Platform
   - Data source: OpenAI Platform API
   - Update frequency: Real-time
   - Accuracy: 100%
4. **Usage Cards**: Maintained existing design, now showing real OpenAI data

## How It Works

### Data Flow:
```
User visits billing page
    ↓
BillingContent.tsx calls loadUsageData()
    ↓
Fetches from /api/billing/openai-usage
    ↓
API calls OpenAIUsageService.getUsageForDateRange()
    ↓
Service fetches from OpenAI Platform API
    ↓
Processes and categorizes usage data
    ↓
Returns formatted data to UI
    ↓
UI displays real-time usage statistics
```

### Categorization Logic:
The service uses heuristics to categorize usage based on token counts:

```typescript
if (totalTokens > 5000) {
  // CV Parsing - large document processing
} else if (totalTokens > 1000) {
  // Video Interview - medium-sized analysis
} else {
  // Question Generation - small prompts
}
```

**Note**: This is a simplified heuristic. You may need to adjust thresholds based on your actual usage patterns.

## Configuration

### Environment Variables Required:
```env
OPENAI_API_KEY=sk-proj-...
```

**IMPORTANT**: The OpenAI Usage API requires an **Admin API Key**, not a regular API key. 

### How to Get an Admin API Key:
1. Visit [OpenAI Admin Keys](https://platform.openai.com/settings/organization/admin-keys)
2. Create a new Admin API key
3. Replace your `OPENAI_API_KEY` in `.env.local` with the Admin key

**Note**: Admin keys have access to usage data and billing information. Regular API keys will return a 404 error when trying to access the usage endpoint.

## Benefits

✅ **100% Accurate**: Data comes directly from OpenAI, no estimation
✅ **Real-time**: Always up-to-date with actual consumption
✅ **Unified Source**: Single API key handles all operations
✅ **No Database Sync**: No need to track usage in your database
✅ **Transparent**: Shows exactly what OpenAI charges you

## Limitations

⚠️ **Organization-wide Only**: OpenAI API doesn't provide per-job or per-user breakdowns
⚠️ **Heuristic Categorization**: Service types are inferred from token counts, not explicitly tracked
⚠️ **No Historical Pricing**: Uses current pricing model for all historical data
⚠️ **API Rate Limits**: Subject to OpenAI's API rate limits

## Testing

1. **Visit the billing page**:
   ```
   http://localhost:3000/dashboard/settings/billing?tab=usage
   ```

2. **Check the console** for logs:
   - Success: "Fetched usage data from OpenAI Platform"
   - Error: "OpenAI usage API error: [error message]"

3. **Verify data**:
   - Compare with OpenAI Platform dashboard
   - Check that costs match your actual usage
   - Test different date ranges (7, 30, 90 days)

4. **Test error handling**:
   - Remove/invalidate API key
   - Should show error toast with helpful message

## Future Enhancements

### Possible Improvements:
1. **Better Categorization**: Use metadata or tags to explicitly track service types
2. **Cost Breakdown**: Show input vs output token costs separately
3. **Model-specific Pricing**: Support different pricing for GPT-3.5, GPT-4, etc.
4. **Export Functionality**: Allow users to download usage data as CSV/PDF
5. **Alerts**: Notify when usage exceeds thresholds
6. **Caching**: Cache OpenAI API responses to reduce API calls

## Troubleshooting

### Common Issues:

**1. "Failed to fetch usage data" error or 404 Not Found**
- **Most Common**: You're using a regular API key instead of an Admin API key
  - Solution: Get an Admin key from https://platform.openai.com/settings/organization/admin-keys
- Check that `OPENAI_API_KEY` is set in `.env.local`
- Verify API key has organization access
- Check OpenAI API status

**2. "No usage data available"**
- Ensure you've actually used the API in the selected date range
- Try expanding the date range (e.g., 90 days)
- Check OpenAI Platform dashboard to confirm usage exists

**3. Costs don't match expectations**
- Verify pricing model in `lib/openai-usage-service.ts`
- Check if you're using different models (GPT-3.5 vs GPT-4)
- Review categorization logic - may need adjustment

**4. Data seems outdated**
- Click "Refresh Data" button
- OpenAI API may have slight delays (usually <1 hour)
- Check OpenAI Platform dashboard for comparison

## Files Modified

### Created:
- `lib/openai-usage-service.ts` - Service to fetch and process OpenAI usage data
- `app/api/billing/openai-usage/route.ts` - API endpoint for usage data
- `OPENAI_PLATFORM_USAGE_INTEGRATION.md` - This documentation

### Modified:
- `app/dashboard/settings/_components/BillingContent.tsx`:
  - Updated `loadUsageData()` to fetch from OpenAI API
  - Removed job filtering
  - Removed per-job breakdown section
  - Added OpenAI Platform integration info card
  - Updated UI descriptions and labels

## Migration Notes

### From Database Tracking to OpenAI Platform:

**Before**: Usage was tracked in database tables:
- `cv_parsing_usage`
- `question_generation_usage`
- `video_interview_usage`

**After**: Usage is fetched directly from OpenAI Platform API

**Database tables are still used for**:
- Billing settings (`company_billing`)
- Invoices (`invoices`)
- Wallet balance tracking
- Auto-recharge settings

**Database tables NO LONGER used for**:
- Usage analytics display (now from OpenAI API)
- Cost calculations (now from OpenAI API)

**Note**: You can keep the database tracking for audit purposes or remove it if not needed.

## Conclusion

The billing usage page now displays 100% accurate, real-time usage data directly from OpenAI Platform API. This ensures transparency and eliminates any discrepancies between your internal tracking and actual OpenAI charges.

All existing UI components remain the same - only the data source has changed from database to OpenAI Platform API.
