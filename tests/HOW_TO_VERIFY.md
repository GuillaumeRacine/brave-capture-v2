# How to Verify Token Balance Display is Working

## Quick Visual Check (30 seconds)

### Step 1: Open Dashboard
- Navigate to your extension's dashboard.html in Chrome
- Or click extension icon → "Open Dashboard"

### Step 2: Look at CLM Positions Section
Expand the "CLM Positions" card if collapsed.

### Step 3: Check Each Position
You should see **5 positions** with data like this:

```
Pair: SOL/USDC
Balance: $18,834
Token 0: 81.85 ($13,106 • 70%)     ← CHECK: See actual numbers?
Token 1: 5,729.17 ($5,728 • 30%)   ← CHECK: See actual numbers?
Yield: $433
APY: 50.9%
```

### ✅ Success Indicators:
- [ ] All 5 pairs visible (SOL/USDC, JLP/USDC, cbBTC/USDC, whETH/SOL, PUMP/SOL)
- [ ] Token 0 shows: `NUMBER ($USD • XX%)`
- [ ] Token 1 shows: `NUMBER ($USD • XX%)`
- [ ] No "N/A" or missing values for token amounts
- [ ] Percentages add up to ~100%
- [ ] Table columns aligned (no text wrapping)

### ❌ Problem Indicators:
- [ ] "N/A" instead of token amounts
- [ ] Missing USD values or percentages
- [ ] Text wrapping/misaligned columns
- [ ] Fewer than 5 positions showing

---

## Automated Verification (1 minute)

Run this in your terminal:

```bash
cd /Users/gui/Brave-Capture
node scripts/test-token-balance-display.js
```

### Expected Output:
```
🧪 Testing Token Balance Display

📊 TEST 1: Database State Check
   ✅ SOL/USDC        - Token data: YES
   ✅ PUMP/SOL        - Token data: YES
   ✅ JLP/USDC        - Token data: YES
   ✅ cbBTC/USDC      - Token data: YES
   ✅ whETH/SOL       - Token data: YES

🎉 ALL TESTS PASSED - Token balance display is ready!
```

If you see all ✅ marks, everything is working!

---

## Browser Console Check (Advanced)

### Step 1: Open Dashboard
Navigate to dashboard.html

### Step 2: Open DevTools
Press F12 or right-click → Inspect

### Step 3: Go to Console Tab

### Step 4: Run This Command:
```javascript
window.getLatestPositions().then(positions => {
  console.table(positions.map(p => ({
    pair: p.pair,
    balance: p.balance,
    token0: p.token0_amount,
    token1: p.token1_amount,
    hasData: p.token0_amount !== null
  })));
});
```

### Expected Output:
You should see a table with 5 rows, all showing `hasData: true`

```
┌─────────┬──────────────┬──────────┬──────────┬──────────┬─────────┐
│ (index) │     pair     │  balance │  token0  │  token1  │ hasData │
├─────────┼──────────────┼──────────┼──────────┼──────────┼─────────┤
│    0    │ 'SOL/USDC'   │  18834   │  81.85   │  5729.17 │  true   │
│    1    │ 'JLP/USDC'   │   9719   │ 1446.90  │  2789.05 │  true   │
│    2    │ 'cbBTC/USDC' │   9586   │  0.076   │  2263.86 │  true   │
│    3    │ 'whETH/SOL'  │   9193   │  0.494   │   53.28  │  true   │
│    4    │ 'PUMP/SOL'   │   8828   │ 1223280  │  31035.5 │  true   │
└─────────┴──────────────┴──────────┴──────────┴──────────┴─────────┘
```

All rows should have `hasData: true`!

---

## Test New Capture (3 minutes)

This tests the full workflow including cache invalidation:

### Step 1: Note Current Data
Open dashboard and note the token amounts for SOL/USDC

### Step 2: Take New Capture
1. Go to orca.so/portfolio
2. Click on SOL/USDC to expand the side panel
3. Click extension icon → "Capture Current Page"
4. Wait for "✅ Extracted & saved 5 positions" message

### Step 3: Refresh Dashboard
Reload the dashboard page

### Step 4: Check If Data Updated
- SOL/USDC should show NEW token amounts (if prices changed)
- Cache was automatically invalidated
- New data fetched from database

### ✅ Success:
Dashboard shows latest data without manual cache clearing

---

## Checklist: What to Verify

Use this checklist to confirm everything is working:

### Data Completeness
- [ ] All 5 pairs have token amounts (not null/N/A)
- [ ] Token 0 Amount visible (e.g., 81.85)
- [ ] Token 1 Amount visible (e.g., 5,729.17)
- [ ] Token 0 USD Value visible (e.g., $13,106)
- [ ] Token 1 USD Value visible (e.g., $5,728)
- [ ] Token 0 Percentage visible (e.g., 70%)
- [ ] Token 1 Percentage visible (e.g., 30%)

### Data Accuracy
- [ ] Percentages add up to 100% (±0.1% rounding)
- [ ] Token values sum equals balance (±$1 rounding)
- [ ] Token names correct (no "0" suffix like "SOL0")

### Display Quality
- [ ] Table columns aligned
- [ ] No text wrapping in token columns
- [ ] Numbers formatted properly (commas for thousands)
- [ ] USD values in parentheses
- [ ] Percentages show % symbol

### System Behavior
- [ ] Dashboard loads quickly (<1 second)
- [ ] New captures update dashboard after refresh
- [ ] Cache invalidates automatically
- [ ] No console errors

---

## Troubleshooting

### Issue: Dashboard shows "N/A" for token amounts

**Fix:**
1. Open DevTools Console
2. Run: `clearCache()`
3. Refresh page
4. If still N/A, run: `node scripts/check-last-5-captures.js`
   - This shows if database has the data

### Issue: Old data showing after new capture

**Fix:**
1. Make sure you did rotation captures (expanded each position)
2. Check cache was invalidated (should happen automatically)
3. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Issue: Table columns misaligned

**Fix:**
1. Make sure you reloaded the extension after the table alignment fix
2. Clear browser cache
3. Hard refresh the dashboard

### Issue: Automated test fails

**Fix:**
1. Check Supabase connection
2. Verify .env.local has correct credentials
3. Run: `node scripts/check-last-5-captures.js` to see database state

---

## Quick Reference Commands

```bash
# Test token balance display
node scripts/test-token-balance-display.js

# Check last 5 captures
node scripts/check-last-5-captures.js

# Test query logic
node scripts/test-latest-positions-query.js

# Verify AI extraction
node scripts/verify-ai-extraction.js
```

---

## What Success Looks Like

### In Dashboard:
- 5 positions with complete token data
- Professional table layout
- No errors in console
- Fast loading (<1 second)

### In Tests:
- All automated tests passing (✅)
- 5/5 positions with token data
- 100% data accuracy

### In Workflow:
- Take capture → See "Extracted & saved 5 positions"
- Refresh dashboard → See updated data
- No manual cache clearing needed
