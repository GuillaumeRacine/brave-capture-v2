# Testing Guide: v1.4.0 Release

## Quick Start Testing

### 1. Reload Extension
```
1. Open chrome://extensions/ (or brave://extensions/)
2. Find "Brave Capture - CLM Position Tracker"
3. Click "Reload" button
4. Verify no errors in console
```

### 2. Test Hyperliquid Parser

**Prerequisites:** Account with open positions on Hyperliquid

**Steps:**
1. Navigate to https://app.hyperliquid.xyz
2. Ensure you have open positions visible in the positions table
3. Open browser console (F12)
4. Click extension icon → "Capture Positions"
5. Watch console output

**Expected Console Output:**
```
Hyperliquid: Parsing positions from table
Hyperliquid: Found 9 table rows
Hyperliquid: Parsed ETH: +$2,771.75 (+171.9%)
Hyperliquid: Parsed BTC: -$73.93 (-4.9%)
...
Hyperliquid: Found 9 positions, Total P&L: $15,234.56
✅ Saved to Supabase
```

**What to Check:**
- ✅ "Found X table rows" matches number of visible positions
- ✅ Each position shows "Parsed [SYMBOL]: +/-$X,XXX.XX"
- ✅ P&L includes + sign for profits (e.g., "+$2,771.75")
- ✅ Total P&L is calculated correctly
- ❌ No "Could not parse P&L" errors

### 3. Test Aave Borrows

**Prerequisites:** Account with supplies AND/OR borrows on Aave

**Steps:**
1. Navigate to https://app.aave.com
2. Ensure you have supplies or borrows visible
3. Open browser console (F12)
4. Click extension icon → "Capture Positions"
5. Watch console output

**Expected Console Output:**
```
Aave: Parsing lending positions
Aave: Found supplies section
Aave: Found supply asset: ETH
Aave: Found supply asset: USDC
Aave: Found borrows section
Aave: Found borrow asset: USDC
Aave: Found 2 supplies, 1 borrows
✅ Saved to Supabase
```

**What to Check:**
- ✅ "Found supplies section" appears
- ✅ "Found borrows section" appears (if you have borrows)
- ✅ Final count: "Found X supplies, Y borrows"
- ✅ If you have ETH supplied AND borrowed, both appear (not filtered)
- ❌ No positions missing

### 4. Test Dashboard Price Sliders

**Prerequisites:** Captured Hyperliquid positions with entry, mark, and liquidation prices

**Steps:**
1. Open extension dashboard (click extension icon → "View Dashboard")
2. Navigate to "Hedge Positions" section
3. Observe position cards

**What to Check:**
- ✅ Each position has a price slider below it
- ✅ Slider has 3 labels: "Entry" | "Current" | "Liquidation"
- ✅ Blue circle marker shows current price position
- ✅ Slider color matches health:
  - Green = Safe (current far from liquidation)
  - Yellow = Warning (current approaching liquidation)
  - Red = Critical (current near liquidation)
- ✅ Prices display below slider with correct formatting
- ✅ Leverage badge shows (e.g., "20x")

**Visual Example:**
```
ETH · Hyperliquid                [20x]
Size: 9.3792 ETH    Value: $29,482
P&L: +$2,771.75 (+171.9%)

Entry -------|●|----------- Liquidation
             Current
$3,000       $3,500          $2,500
```

## Debugging Common Issues

### Issue: "Hyperliquid: Found 0 positions"

**Check:**
1. Are positions visible on the page?
2. Open console and type: `document.querySelectorAll('table').length`
   - Should return 1 or more
3. Type: `document.querySelectorAll('table')[0].querySelectorAll('tbody tr').length`
   - Should match number of positions

**If 0:** Page structure may have changed. Check table selector.

### Issue: "Could not parse P&L from [text]"

**Check:**
1. Open console and find the logged text
2. Verify format matches: "+$2,771.75 (+171.9%)" or "-$73.93 (-4.9%)"
3. If format is different, regex needs update

**Common formats:**
- ✅ "+$2,771.75 (+171.9%)"
- ✅ "-$73.93 (-4.9%)"
- ✅ "$100.00 (5.5%)"
- ❌ "$2,771.75 171.9%" (no parentheses)

### Issue: Aave shows supplies but not borrows

**Check:**
1. Do you actually have borrows? (Check Aave UI)
2. Open console, search for: "Found borrows section"
   - If not present: Page structure may have changed
3. Search for: "Found borrow asset:"
   - If not present: Asset matching may have failed

### Issue: Price sliders not rendering

**Check:**
1. Open dashboard console (F12 on dashboard page)
2. Look for JavaScript errors
3. Type: `hedgePositions` in console
   - Should show array of positions with entryPrice, markPrice, liquidationPrice
4. If any price is 0 or undefined, slider won't render correctly

## Validation Checklist

Use this checklist to verify all features work:

### Hyperliquid
- [ ] Extension captures positions table
- [ ] Console shows "Found X table rows"
- [ ] Console shows "Parsed [SYMBOL]" for each position
- [ ] P&L includes + sign for profits
- [ ] Total P&L calculated correctly
- [ ] Dashboard displays all positions

### Aave
- [ ] Extension detects "Your supplies" section
- [ ] Extension detects "Your borrows" section
- [ ] Console shows correct supply count
- [ ] Console shows correct borrow count
- [ ] Same asset can be both supply and borrow
- [ ] Dashboard displays all positions

### Dashboard
- [ ] Price sliders render below hedge positions
- [ ] Slider colors match health (green/yellow/red)
- [ ] Current price marker positioned correctly
- [ ] Entry, current, liquidation prices display
- [ ] Leverage badge shows
- [ ] No JavaScript console errors

## Performance Testing

### Load Time
- Dashboard should load in < 2 seconds
- Position rendering should be instant
- No UI freezing or lag

### Accuracy
- P&L values match Hyperliquid exactly
- Prices match Hyperliquid exactly
- Aave supplies/borrows match Aave exactly

## Regression Testing

Ensure previous features still work:

### CLM Protocols
- [ ] Orca positions capture correctly
- [ ] Raydium positions capture correctly
- [ ] Other CLM protocols work

### AI Vision
- [ ] Token breakdown extraction works
- [ ] Screenshot capture works
- [ ] AI processing completes

### Database
- [ ] Positions save to Supabase
- [ ] Dashboard loads from Supabase
- [ ] No duplicate saves

## Emergency Rollback

If critical bugs are found:

1. Revert files to previous version:
```bash
cd /Users/gui/Brave-Capture
git diff HEAD content.js > changes.patch
git checkout HEAD~1 content.js dashboard.js
```

2. Reload extension

3. Report issue with details:
   - Browser console output
   - Network tab (if API errors)
   - Screenshot of issue

## Success Criteria

All tests pass when:
- ✅ Hyperliquid parses 9+ positions correctly
- ✅ P&L shows + signs for profits
- ✅ Aave captures both supplies and borrows
- ✅ Price sliders render with correct colors
- ✅ No console errors
- ✅ Previous features still work

---

**Version:** 1.4.0  
**Last Updated:** 2025-11-16  
**Tester:** [Your Name]
