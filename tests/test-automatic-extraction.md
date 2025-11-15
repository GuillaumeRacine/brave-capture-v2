# Test: Automatic Token Extraction

## Test Objective
Verify that token extraction happens automatically without any user interaction beyond clicking "Capture Positions".

## Prerequisites
1. Extension installed and loaded in Brave browser
2. Anthropic API key configured in `.env.local`
3. Run `npm run build:config` to generate config files
4. Supabase database connected and accessible
5. Orca portfolio page open: `https://www.orca.so/positions`

## Test Case 1: List View Capture (Multiple Positions)

### Steps
1. Navigate to Orca positions page
2. Ensure you have 10+ positions visible
3. Do NOT expand any position drawer
4. Click extension icon → "Capture Positions"
5. **Observe:** Do NOT click anything else

### Expected Behavior
```
✅ Popup shows: "Capturing..."
✅ Popup shows: "Data captured! Taking screenshot..."
✅ Popup shows: "Saving to database..."
✅ Popup shows: "Data captured! File: orca-..."
✅ (500ms delay)
✅ Popup shows: "Extracting token data..."
✅ Progress bar appears
✅ Progress text: "Extracting 1/30: SOL/USDC..."
✅ Progress bar fills gradually
✅ Progress stats: "Success: 1 | Failed: 0"
✅ (Repeat for all positions)
✅ Popup shows: "Extraction complete! 30/30 successful (45s)"
✅ (2 seconds delay)
✅ Progress bar hides
✅ (1 second delay)
✅ Popup closes automatically
```

### Verification
```bash
# Check database for complete data
node scripts/show-positions.js
```

Expected output:
```
📊 Recent Positions (captured within last 24 hours)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOL/USDC
  Balance: $5,234.50
  Tokens: 150.5 SOL (45%) + 2,500 USDC (55%)  ✅
  APY: 25.3% | In Range: Yes
  Captured: 2025-11-14 14:30:00

cbBTC/USDC
  Balance: $10,107.00
  Tokens: 0.035 cbBTC (37%) + 6,385 USDC (63%)  ✅
  APY: 18.7% | In Range: Yes
  Captured: 2025-11-14 14:30:00

(All positions show real token amounts, NOT "0 ($0 • 50%)")
```

### Success Criteria
- [ ] No confirmation dialog appeared
- [ ] Extraction started automatically after capture
- [ ] Progress bar showed live updates
- [ ] All positions extracted successfully
- [ ] Popup closed automatically after completion
- [ ] Database contains complete token data for all positions
- [ ] Dashboard shows real token amounts (not placeholders)

## Test Case 2: Detail View Capture (Single Position Expanded)

### Steps
1. Navigate to Orca positions page
2. Click on ONE position to expand its drawer
3. Wait for drawer to fully open
4. Click extension icon → "Capture Positions"
5. **Observe:** Do NOT click anything else

### Expected Behavior
```
✅ Popup shows: "Capturing..."
✅ Popup shows: "Data captured! Taking screenshot..."
✅ Popup shows: "Saving to database..."
✅ (500ms delay)
✅ Popup shows: "Token data extracted for SOL/USDC"
✅ (1.5 seconds delay)
✅ Popup closes automatically
```

### Verification
```bash
# Check that the expanded position has complete data
node scripts/show-positions.js | grep "SOL/USDC"
```

Expected output:
```
SOL/USDC
  Balance: $5,234.50
  Tokens: 150.5 SOL (45%) + 2,500 USDC (55%)  ✅
```

### Success Criteria
- [ ] No confirmation dialog appeared
- [ ] Extraction happened immediately from screenshot
- [ ] No batch extraction process (single position only)
- [ ] Popup closed automatically after success message
- [ ] Database contains complete token data for the position

## Test Case 3: Extraction Failure Handling

### Steps
1. Navigate to Orca positions page
2. Disable network to simulate API failure
3. Click extension icon → "Capture Positions"
4. **Observe:** Extension should handle failure gracefully

### Expected Behavior
```
✅ Popup shows: "Capturing..."
✅ Popup shows: "Data captured! Taking screenshot..."
✅ Popup shows: "Saving to database..."
✅ (500ms delay)
✅ Popup shows: "Extracting token data..."
✅ Progress bar appears
✅ Progress text: "Extracting 1/30: SOL/USDC..."
❌ Progress stats: "Success: 0 | Failed: 1"
❌ (Repeat for remaining positions)
❌ Popup shows: "Extraction failed for all positions"
✅ Popup stays open (doesn't auto-close on error)
```

### Success Criteria
- [ ] Extension didn't crash
- [ ] Error message displayed
- [ ] Failed count tracked correctly
- [ ] Popup stayed open to show error
- [ ] User can retry by clicking "Capture Positions" again

## Test Case 4: Background Cleanup Worker

### Steps
1. Manually insert a position with NULL token data:
   ```sql
   INSERT INTO positions (pair, balance, token0_amount, token1_amount, captured_at)
   VALUES ('TEST/USDC', 1000, NULL, NULL, NOW());
   ```
2. Wait 5+ minutes (or restart extension to trigger immediate check)
3. Check browser console (background.js service worker)

### Expected Behavior
```
✅ Console log: "🧹 Background cleanup: Checking for positions with missing token data..."
✅ Console log: "📊 Found 1 positions missing token data (from last 7 days)"
✅ Console log: "   - TEST/USDC (captured at 2025-11-14 14:30:00)"
```

### Verification
```javascript
// Check Chrome storage for cleanup info
chrome.storage.local.get(['positionsNeedingExtraction', 'lastCleanupCheck'], (result) => {
  console.log('Positions needing extraction:', result.positionsNeedingExtraction);
  console.log('Last cleanup check:', result.lastCleanupCheck);
});
```

### Success Criteria
- [ ] Background worker ran on schedule
- [ ] Detected position with missing data
- [ ] Logged position details
- [ ] Stored count in Chrome storage

## Test Case 5: Rapid Capture (Multiple Captures in Succession)

### Steps
1. Navigate to Orca positions page
2. Click "Capture Positions"
3. Immediately close popup
4. Open popup again
5. Click "Capture Positions" again
6. **Observe:** Should handle overlapping captures gracefully

### Expected Behavior
```
✅ First capture completes and starts extraction
✅ Second capture queues or starts new extraction
✅ No race conditions or conflicts
✅ Both captures save to database correctly
```

### Success Criteria
- [ ] No errors in console
- [ ] Both captures saved to database
- [ ] Token extraction completed for both
- [ ] No duplicate entries

## Performance Benchmarks

### Target Metrics
| Positions | Expected Time | Max Time | Cost |
|-----------|--------------|----------|------|
| 10 | ~15 seconds | 25s | $0.005 |
| 30 | ~45 seconds | 60s | $0.015 |
| 50 | ~75 seconds | 100s | $0.025 |

### Actual Results
| Positions | Actual Time | Notes |
|-----------|-------------|-------|
| 10 | _______ sec | _____ |
| 30 | _______ sec | _____ |
| 50 | _______ sec | _____ |

## Regression Tests

### Verify No Breaking Changes
- [ ] Manual balance entry still works (if user wants to override)
- [ ] Dashboard displays positions correctly
- [ ] Export functionality still works
- [ ] File storage still saves captures locally
- [ ] Screenshot capture still works
- [ ] Supabase integration still works

## Edge Cases

### Test Edge Case 1: No Positions on Page
1. Navigate to Orca page with no positions
2. Click "Capture Positions"
3. Expected: No extraction attempts, no errors

### Test Edge Case 2: Positions Already Have Token Data
1. Capture positions once (extraction completes)
2. Immediately capture again
3. Expected: No extraction (all positions already have data)

### Test Edge Case 3: API Key Missing
1. Remove `ANTHROPIC_API_KEY` from `.env.local`
2. Run `npm run build:config`
3. Reload extension
4. Click "Capture Positions"
5. Expected: Capture succeeds, extraction skipped with warning

### Test Edge Case 4: Supabase Connection Lost
1. Disable network after capture but before extraction
2. Expected: Extraction fails gracefully, retry when network returns

## Final Verification Checklist

- [ ] User clicks ONE button only
- [ ] No confirmation dialogs appear
- [ ] Extraction happens automatically
- [ ] Progress updates shown in real-time
- [ ] Popup closes automatically when done
- [ ] Database populated with complete data
- [ ] Dashboard shows real token amounts
- [ ] Background worker checks for missed positions
- [ ] Error handling works correctly
- [ ] No console errors
- [ ] No race conditions
- [ ] Performance within targets

## Test Report Template

```
Date: ___________
Tester: ___________
Extension Version: v1.3.0

Test Results:
✅ List View Capture: PASS / FAIL
✅ Detail View Capture: PASS / FAIL
✅ Failure Handling: PASS / FAIL
✅ Background Worker: PASS / FAIL
✅ Rapid Capture: PASS / FAIL

Performance:
- 30 positions: _____ seconds
- Success rate: ____ / 30
- Cost: $_____

Issues Found:
1. _____________________
2. _____________________
3. _____________________

Notes:
_______________________________
_______________________________
_______________________________
```

## Known Limitations

1. **Browser must stay open:** Extraction requires active tab
2. **Network required:** AI Vision API calls need internet
3. **Orca page must be loaded:** Can't extract from other DeFi protocols
4. **Sequential processing:** Positions extracted one at a time (not parallel)
5. **Rate limits:** Anthropic API has rate limits (should rarely hit them)

## Conclusion

If all tests pass, the automatic token extraction feature is working correctly and provides a seamless, zero-interaction experience for users.

**Goal achieved:** User clicks "Capture Positions" → Everything happens automatically → Complete data in dashboard
