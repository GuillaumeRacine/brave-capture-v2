# Manual Token Balance Display Verification

This document provides step-by-step instructions to manually verify that token balances are correctly displayed in the dashboard and popup.

## Prerequisites

- Database has 5 Orca positions with complete token data (verified by automated tests)
- Extension is installed in Brave browser
- You have the dashboard.html file

---

## Test 1: Dashboard Token Balance Display

### Objective
Verify that all 5 Orca positions display token amounts (not just percentages)

### Steps

1. **Open Dashboard**
   ```
   Navigate to: chrome-extension://[YOUR_EXTENSION_ID]/dashboard.html
   OR
   Right-click extension icon > Options > Open dashboard.html
   ```

2. **Open Browser DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac)
   - Go to Console tab

3. **Check for Cache**
   ```javascript
   // Run in console to check if data is cached
   window.hasCachedData ? window.hasCachedData() : 'No cache function'
   ```

4. **Clear Cache (if needed)**
   ```javascript
   // Run in console to force fresh data load
   if (typeof clearCache === 'function') {
     clearCache();
     location.reload();
   } else {
     // Manual reload
     location.reload();
   }
   ```

5. **Wait for Data Load**
   - Watch console for: "📊 Loaded X positions from..."
   - Should see: "✅ NEW QUERY (prioritizes positions with token data)"

6. **Verify CLM Positions Card**
   - Expand the "CLM Positions" card (click header)
   - Should see header row with columns: Pair | Balance | Token 0 | Token 1 | Yield | APY

7. **Verify Each Position Shows Token Amounts**

   Check that ALL 5 positions display:
   - Token 0 column: Amount with USD value and percentage
     - Example: `95.01 ($13,444 • 72%)`
   - Token 1 column: Amount with USD value and percentage
     - Example: `5,280.08 ($5,279 • 28%)`

   Expected pairs:
   - [ ] SOL/USDC
   - [ ] PUMP/SOL
   - [ ] JLP/USDC
   - [ ] cbBTC/USDC
   - [ ] whETH/SOL

8. **Verify No "N/A" or Missing Values**
   - Token amounts should be numbers (not "N/A", "0", or blank)
   - USD values should be shown in parentheses
   - Percentages should add up to ~100% per position

9. **Check Console for Errors**
   - No red errors about missing data
   - Should see logs like:
     ```
     📊 Loaded 5 positions from cache (instant)
     💎 Loading CLM positions...
     Found 5 CLM positions
     ```

### Expected Results

✅ **PASS Criteria:**
- All 5 pairs visible in dashboard
- Each pair shows both token amounts (Token 0 and Token 1)
- Token amounts are non-zero numbers
- USD values and percentages displayed correctly
- No "N/A" or error messages

❌ **FAIL Indicators:**
- Missing token amounts (shows only percentages)
- "N/A" values in token columns
- Console errors about missing token data
- Fewer than 5 positions displayed

---

## Test 2: Popup Recent Captures Display

### Objective
Verify that popup shows recent captures (does NOT show detailed token data)

### Steps

1. **Navigate to Orca Portfolio**
   ```
   Go to: https://www.orca.so/liquidity/positions
   ```

2. **Open Extension Popup**
   - Click the Brave Capture extension icon in toolbar

3. **Check "Recent Captures" Section**
   - Should appear at bottom of popup
   - Shows last 5 captures with:
     - Domain name (e.g., "orca.so")
     - Date and time of capture

4. **Verify Popup Content**
   - Current Page URL is shown
   - "Capture Positions" button is visible
   - "View Dashboard" button is visible

### Expected Results

✅ **PASS Criteria:**
- Recent captures list shows up to 5 most recent
- Each capture shows domain + timestamp
- No errors in popup display

📝 **NOTE:**
- Popup does NOT display token balance details
- Popup only shows basic capture metadata
- For detailed token balance view, user must open Dashboard

---

## Test 3: Token Balance Consistency

### Objective
Verify that token balance data matches between database and dashboard display

### Steps

1. **Check Database Data**
   ```bash
   # Run from project root
   node scripts/check-last-5-captures.js
   ```

   Note the token amounts for each pair (example):
   - SOL/USDC: 95.01 / 5,280.08
   - PUMP/SOL: 1,192,405.97 / 31.82
   - JLP/USDC: 1,489.13 / 2,587.13
   - cbBTC/USDC: 0.075 / 2,368.80
   - whETH/SOL: 0.455 / 54.17

2. **Open Dashboard**
   - Load dashboard.html

3. **Compare Displayed Amounts**
   - For each pair, check that dashboard shows same amounts as database
   - Allow for rounding differences (dashboard may round to 2-4 decimals)

4. **Check USD Values Make Sense**
   - Token 0 Value + Token 1 Value should approximately equal Balance
   - Percentages should reflect value split

### Expected Results

✅ **PASS Criteria:**
- Dashboard amounts match database (within rounding)
- USD values are consistent with balance
- Percentages correctly reflect value distribution

---

## Test 4: Cache Behavior

### Objective
Verify that cache doesn't block display of latest token data

### Steps

1. **First Load (No Cache)**
   ```javascript
   // Clear browser data for extension
   // Chrome > Settings > Privacy > Clear browsing data > Cached images and files
   ```

   - Open dashboard.html
   - Console should show: "🔍 No cache available, fetching from database (first load)"
   - All positions should load with token data

2. **Second Load (With Cache)**
   - Refresh dashboard.html
   - Console should show: "⚡ Loading from persistent cache (instant load)"
   - All positions should still show token data

3. **After New Capture**
   - Capture a new position from Orca
   - Wait for "✅ Captured!" message
   - Open dashboard.html
   - New data should appear (cache should invalidate for updated positions)

### Expected Results

✅ **PASS Criteria:**
- First load shows all token data
- Cached load shows same data (faster)
- Cache invalidates correctly after new captures

---

## Test 5: Display Threshold Verification

### Objective
Verify that only positions >= $1,000 are displayed (but ALL positions are counted in metrics)

### Steps

1. **Check Dashboard Metrics**
   - CLM card header shows: "X positions" (displayed count)
   - "X in range (Y hidden)" if positions under $1,000 exist

2. **Verify Position List**
   - Count visible positions in list
   - All should have balance >= $1,000

3. **Check Total Value Metric**
   - "Total Value" should include ALL positions (even hidden ones)
   - Console log should show: "Found X CLM positions" (total, not filtered)

### Expected Results

✅ **PASS Criteria:**
- Only positions >= $1,000 displayed in list
- Metrics include all positions
- Hidden count shown if applicable

---

## Troubleshooting

### Issue: No Token Amounts Showing

**Symptoms:**
- Dashboard shows balance and percentages only
- Token 0/Token 1 columns show "0" or "N/A"

**Solutions:**
1. Clear cache: `localStorage.clear(); location.reload();`
2. Check console for errors
3. Verify database has token data: `node scripts/test-token-balance-display.js`
4. Check network tab for failed API calls

### Issue: Old Data Displayed

**Symptoms:**
- Dashboard shows outdated positions
- Recent captures not appearing

**Solutions:**
1. Force cache clear: `localStorage.clear();`
2. Check if `getLatestPositions()` is being called
3. Verify Supabase connection in console
4. Check if cache invalidation is working

### Issue: Inconsistent Data

**Symptoms:**
- Token amounts don't match database
- Percentages don't add up to 100%

**Solutions:**
1. Check for calculation errors in console
2. Verify `currentPrice` is available
3. Check if USD values are being derived correctly
4. Review `renderCLMPositions()` logic in dashboard.js

---

## Success Checklist

After completing all tests, verify:

- [ ] Dashboard loads without errors
- [ ] All 5 Orca pairs visible
- [ ] Each pair shows both token amounts (not just percentages)
- [ ] Token amounts are non-zero, realistic numbers
- [ ] USD values and percentages displayed correctly
- [ ] Recent captures appear in popup
- [ ] Cache behavior works as expected
- [ ] No console errors related to token data
- [ ] Data matches between database and dashboard

---

## Automated vs Manual Testing Summary

### Automated Tests (scripts/test-token-balance-display.js)
✅ Database has 5 positions with token data
✅ All required fields are non-null
✅ Query logic returns correct data

### Manual Tests (This Document)
⚠️ Dashboard displays token amounts correctly
⚠️ Popup shows recent captures
⚠️ Cache behavior works as expected
⚠️ UI formatting is correct

Both automated and manual tests must pass for full verification.
