# Quick Reference: Hardcoded Pricing

## Add to .env.local

```env
# CV Parsing Price (per CV)
CV_PARSING_PRICE=0.50

# Video Interview Price (per minute)
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
```

## Default Values (if not set)
- CV Parsing: `$0.50` per CV
- Video Interview: `$0.50` per minute

## How to Change

1. Edit `.env.local`
2. Update the values
3. Restart server: `npm run dev`

## Examples

### Current Setup ($0.50 each)
```
1 CV = $0.50
10 CVs = $5.00

1 min interview = $0.50
15 min interview = $7.50
30 min interview = $15.00
```

### Custom Setup ($0.75 CV, $0.60/min)
```env
CV_PARSING_PRICE=0.75
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.60
```

```
1 CV = $0.75
10 CVs = $7.50

1 min interview = $0.60
15 min interview = $9.00
30 min interview = $18.00
```

## Security Notes

🔒 **NEVER exposed to:**
- Database (only final cost stored)
- UI (only total amount shown)
- API responses (only calculated cost)
- Client-side code

✅ **Only visible in:**
- `.env.local` file (server-side only)
- Server console logs (internal only)

## Quick Test

1. Set pricing in `.env.local`
2. Restart server
3. Upload a CV or complete an interview
4. Check billing page: `/dashboard/settings/billing?tab=usage`
5. Verify correct cost is shown

---

**Remember**: Jo `.env.local` mein likhoge, wahi render hoga. Kahi aur show nahi hoga! 🎯
