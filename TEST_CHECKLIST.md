# Test Checklist - Automatic Token Extraction

## Pre-Flight Checks

- [ ] Extension is loaded in Brave browser
- [ ] API key configured: Check `.env.local` has `ANTHROPIC_API_KEY`
- [ ] Config built: Run `npm run build:config`
- [ ] Extension reloaded after building config
- [ ] Orca page open: `https://www.orca.so/positions`
- [ ] You have at least 10 positions visible

## Quick Test (5 minutes)

### Step 1: Capture
- [ ] Click extension icon
- [ ] Click "Capture Positions"
- [ ] **DO NOT CLICK ANYTHING ELSE**

### Step 2: Observe (Expected behavior)
- [ ] Popup shows "Capturing..."
- [ ] Popup shows "Saving to database..."
- [ ] Popup shows "Extracting token data..." (automatic, no dialog)
- [ ] Progress bar appears
- [ ] Text shows "Extracting 1/10: SOL/USDC..."
- [ ] Progress bar fills up gradually
- [ ] Stats show "Success: 1 | Failed: 0"
- [ ] Continues through all positions
- [ ] Shows "Extraction complete! 10/10 successful"
- [ ] Popup closes automatically after 2-3 seconds

### Step 3: Verify
- [ ] Open dashboard (click "View Dashboard")
- [ ] Check positions show real token amounts
- [ ] Example: "150.5 SOL (45%) + 2,500 USDC (55%)"
- [ ] NOT: "0 ($0 • 50%)"

### Step 4: Database Check
```bash
cd /Users/gui/Brave-Capture
node scripts/show-positions.js
```

- [ ] All positions show real token amounts
- [ ] No positions show "0 ($0 • 50%)"
- [ ] Token percentages add up to ~100%

## ✅ PASS / ❌ FAIL

Result: _______

## If Failed

### Check Console Logs

**Popup Console:**
```
Right-click popup → Inspect → Console tab
```

Look for:
- ❌ "Failed to prepare batch extraction"
- ❌ "Extraction failed"
- ❌ Any red error messages

**Background Console:**
```
chrome://extensions → Brave Capture → service worker → inspect
```

Look for:
- ❌ "Supabase update error"
- ❌ "Claude API error"
- ❌ "No match found"

### Common Fixes

**If no extraction started:**
```bash
# Check API key
cat .env.local | grep ANTHROPIC_API_KEY

# Rebuild config
npm run build:config

# Reload extension
# chrome://extensions → Brave Capture → Reload button
```

**If extraction failed:**
- Check internet connection
- Wait 1 minute and try again (API rate limit)
- Check browser console for specific error

**If database not updated:**
- Check Supabase credentials
- Verify database is accessible
- Look for "Supabase update error" in console

## Advanced Tests (Optional)

### Test Background Worker
- [ ] Wait 5 minutes after extension loads
- [ ] Check background console for cleanup logs
- [ ] Should see: "🧹 Background cleanup: Checking..."

### Test Error Handling
- [ ] Disable internet before clicking capture
- [ ] Verify popup shows error message
- [ ] Verify popup doesn't close automatically on error
- [ ] Re-enable internet and retry

### Test Rapid Captures
- [ ] Click "Capture Positions"
- [ ] Close popup immediately
- [ ] Open popup again
- [ ] Click "Capture Positions" again
- [ ] Both should complete without errors

## Performance Test

### Measure Time
- Start: When you click "Capture Positions"
- End: When popup auto-closes
- Target: ~1.5 seconds per position

| Positions | Expected | Actual |
|-----------|----------|--------|
| 10 | ~15s | _____ |
| 30 | ~45s | _____ |
| 50 | ~75s | _____ |

Within target? [ ] Yes [ ] No

## Regression Tests

- [ ] Dashboard still works correctly
- [ ] File export still works
- [ ] Screenshot capture still works
- [ ] Manual balance entry still works (if needed)
- [ ] No console errors during normal operation

## Final Verification

- [ ] User clicks ONE button only
- [ ] NO confirmation dialog appeared
- [ ] Extraction happened automatically
- [ ] Progress shown in real-time
- [ ] Popup closed automatically
- [ ] Database has complete data
- [ ] Dashboard shows real amounts
- [ ] No breaking changes

## Sign-Off

**Tested by:** _______________

**Date:** _______________

**Version:** v1.3.1

**Result:** [ ] PASS [ ] FAIL

**Notes:**
_________________________________
_________________________________
_________________________________

---

## If All Tests Pass ✅

The automatic token extraction feature is working correctly!

**User experience achieved:**
- User clicks "Capture Positions"
- Everything happens automatically
- Complete data appears in dashboard
- ZERO additional interaction required

**Goal: "I just click capture and it works!"** ✅

---

## If Tests Fail ❌

### Debug Steps

1. **Check extension console for errors**
   - Popup console: Right-click popup → Inspect
   - Background console: chrome://extensions → service worker

2. **Verify configuration**
   ```bash
   # Check files exist
   ls config.js background-config.js

   # Check API key
   grep "ANTHROPIC_API_KEY" .env.local

   # Rebuild if needed
   npm run build:config
   ```

3. **Test extraction manually**
   - Open background console
   - Run: `cleanupMissingTokenData()`
   - Check for errors

4. **Check database connection**
   ```bash
   # Query positions
   node scripts/show-positions.js

   # Should show recent captures
   ```

5. **Review implementation**
   - Read `/AUTOMATIC_EXTRACTION_IMPLEMENTATION.md`
   - Check modified functions match documentation
   - Verify no typos in code changes

6. **Contact developer**
   - Provide console logs
   - Describe what went wrong
   - Include browser and extension version

---

## Next Steps After Testing

### If Passed
1. [ ] Update version in `manifest.json` to `1.3.1`
2. [ ] Commit changes to git
3. [ ] Tag release as `v1.3.1`
4. [ ] Update changelog
5. [ ] Deploy to users

### If Failed
1. [ ] Document failure details
2. [ ] Review error logs
3. [ ] Fix issues
4. [ ] Retest
5. [ ] Repeat until passing

---

## Remember

The goal is **ZERO user interaction** beyond clicking "Capture Positions". If you had to:
- Click "OK" on a dialog → FAIL
- Manually trigger extraction → FAIL
- Open console to fix something → FAIL
- Do anything except click one button → FAIL

**Success = Click once → Everything happens automatically → Complete data in dashboard**
