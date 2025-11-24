# ✅ Verification Snapshot - Testing Checklist

## Pre-Test Setup
- [ ] Restart dev server (to load new code)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Open browser DevTools (F12)
- [ ] Open server terminal to see logs

---

## Test Flow

### 1. Start Interview
- [ ] Go to: `http://localhost:3000/interview/78aab16f-2379-4158-a3b4-8ee117a0ec5f/`
- [ ] Click "I Understand, Let's Start"
- [ ] Wait for agent to connect

### 2. First Question
- [ ] Agent asks greeting/setup question
- [ ] ❌ Modal should NOT appear
- [ ] ✅ Interview continues normally

### 3. Second Question Detected
- [ ] Agent asks second question
- [ ] ✅ Modal SHOULD appear with "Security Verification"
- [ ] ✅ Background is LIGHT (30% opacity, not blurred)
- [ ] ✅ Screen is CLEAR and VISIBLE
- [ ] ✅ Modal is CENTERED on screen

### 4. User Interaction
- [ ] Read message: "For security purposes, we are capturing a verification snapshot..."
- [ ] Click "OK, I'm Ready" button
- [ ] ✅ Modal closes
- [ ] ✅ 5-second countdown appears

### 5. Countdown Timer
- [ ] Timer shows: 5 → 4 → 3 → 2 → 1 → 0
- [ ] Each number updates every 1 second
- [ ] Button is disabled during countdown

### 6. Screenshot Capture
- [ ] After countdown reaches 0
- [ ] ✅ No error in browser console
- [ ] ✅ Browser console shows: "✅ [SNAPSHOT] Screenshot saved successfully"
- [ ] ✅ Server console shows: "✅ [SNAPSHOT API] Verification snapshot saved for interview: [uuid]"

### 7. Interview Continues
- [ ] Videos are visible again
- [ ] Agent asks next question
- [ ] Interview proceeds normally
- [ ] No more snapshots captured (only once)

---

## Console Logs to Check

### Browser Console (F12)
```
✅ Should see:
[04:36:23 PM] 🎥 [SNAPSHOT] Second question detected (count: 2)
[04:36:34 PM] 📸 [SNAPSHOT] Capturing full-screen screenshot...
[04:36:35 PM] ✅ [SNAPSHOT] Screenshot saved successfully

❌ Should NOT see:
SecurityError: Failed to execute 'toDataURL'
ERROR: operator does not exist: uuid = text
POST http://localhost:3000/api/interviews/save-snapshot 500
```

### Server Console
```
✅ Should see:
📸 [SNAPSHOT API] Received request
📋 Application ID: 78aab16f-2379-4158-a3b4-8ee117a0ec5f
📊 Snapshot data size: 45234 bytes
✅ [SNAPSHOT API] Buffer created, size: 34123 bytes
🔍 [SNAPSHOT API] Querying for interview...
✅ [SNAPSHOT API] Found interview: 9453a30f-75f1-46d2-a4e4-8007415f61f8
💾 [SNAPSHOT API] Saving snapshot to database...
✅ [SNAPSHOT API] Verification snapshot saved for interview: 9453a30f-75f1-46d2-a4e4-8007415f61f8

❌ Should NOT see:
❌ [SNAPSHOT API] Missing parameters
❌ [SNAPSHOT API] Interview not found
❌ [SNAPSHOT API] Buffer conversion error
```

---

## Database Verification

### Check if Snapshot Saved
```sql
SELECT id, verification_snapshot IS NOT NULL as has_snapshot 
FROM interviews 
WHERE verification_snapshot IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result**: 
```
id                                   | has_snapshot
9453a30f-75f1-46d2-a4e4-8007415f61f8 | true
```

### Check Snapshot Size
```sql
SELECT id, octet_length(verification_snapshot) as size_bytes 
FROM interviews 
WHERE verification_snapshot IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

**Expected Result**: 
```
id                                   | size_bytes
9453a30f-75f1-46d2-a4e4-8007415f61f8 | 45234
```

---

## Common Issues & Solutions

### Issue: Modal appears at top instead of centered
**Solution**: Check CSS class `flex items-center justify-center` is present

### Issue: Background too dark/blurred
**Solution**: Verify line 979 has `bg-black/30` (not `bg-black/60 backdrop-blur-sm`)

### Issue: API returns 500 error
**Solution**: Check server console for specific error message in logs

### Issue: "Interview not found" error
**Solution**: Verify `applicationId` in URL matches database

### Issue: Canvas tainted error
**Solution**: Verify videos are hidden before screenshot (lines 62-63)

### Issue: Screenshot not captured
**Solution**: Check browser console for html2canvas errors

---

## Success Criteria

✅ **All of these must be true**:
1. Modal appears after 2nd question (not before)
2. Modal is centered on screen
3. Background is light (30% opacity)
4. Screen is visible and clear (no blur)
5. 5-second countdown displays correctly
6. Screenshot captures without errors
7. Browser console shows success message
8. Server console shows success message
9. Database contains snapshot BYTEA data
10. Interview continues normally after capture

---

## If Something Goes Wrong

1. **Check Browser Console** (F12)
   - Look for red error messages
   - Note the exact error

2. **Check Server Console**
   - Look for ❌ error logs
   - Note the exact error message

3. **Check Database**
   - Verify interview exists
   - Verify snapshot column exists

4. **Restart Everything**
   - Stop dev server
   - Clear browser cache
   - Restart dev server
   - Try again

---

**Last Updated**: Nov 20, 2025
**Status**: Ready for testing
