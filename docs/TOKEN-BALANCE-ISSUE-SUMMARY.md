# Token Balance Issue - Quick Reference

## The Problem

**79.1% of positions (548 out of 693) are missing token balance data in the dashboard.**

Users see positions but cannot see:
- Individual token amounts (e.g., "0.035 cbBTC", "6385 USDC")
- Token USD values (e.g., "$7,714", "$1,223")
- Token percentages (e.g., "86%", "14%")

## Root Causes

### 1. Protocol Parsers Only Extract Visible Data (PRIMARY CAUSE)
- Most protocols don't show token breakdown in list view
- Only shows after clicking/expanding each position
- Parser calls `extractTokenBreakdown()` → finds nothing → sets to null

**Example**: PancakeSwap shows balance "$9,542" but not "X SOL + Y USDC"

### 2. AI Vision Requires Manual Position Expansion (SECONDARY CAUSE)
- AI Vision is designed to extract from expanded position drawers
- Users don't know to expand positions before capturing
- Even if they did, they'd need to expand+capture each position individually
- Most users capture from list view → AI Vision finds nothing → returns error

### 3. No Automated Fallback (TERTIARY CAUSE)
- When extraction fails, positions are saved with null values
- No calculation/estimation attempted
- Dashboard tries to calculate from price but often produces incorrect results

## Evidence from Database

```
Protocol Breakdown (693 total positions):

Orca         605 positions   28.3% complete   (171 have token amounts)
Uniswap       28 positions   71.4% complete   (20 have token amounts)
Cetus         26 positions    0.0% complete   (0 have token amounts)
PancakeSwap   14 positions    0.0% complete   (0 have token amounts)
Hyperion      11 positions    0.0% complete   (0 have token amounts)
Raydium        4 positions   50.0% complete   (2 have token amounts)
Ekubo          3 positions   66.7% amounts    (but 0% USD values)
Beefy          2 positions    0.0% complete   (0 have token amounts)

Latest 10 captures: 9 missing token data (90% failure rate)
```

## Quick Solution: Batch AI Vision Extraction

**Time to implement**: 4 hours
**Result**: 90%+ coverage
**Cost**: ~$0.02 per position using Claude Opus (~$10 one-time for 500 positions)

### How it works:
1. User captures all positions from list view (normal workflow)
2. Extension detects X positions missing token data
3. Shows button: "Extract Token Data for X Positions"
4. User clicks once
5. Extension automatically:
   - Expands position 1 → Screenshot → AI Vision → Save to DB
   - Expands position 2 → Screenshot → AI Vision → Save to DB
   - ... repeat for all positions
6. Progress bar shows: "Extracting 3/10..."
7. Done! Dashboard now shows complete token data

### User experience:
```
Before: Dashboard shows "$41,237" but no token breakdown
↓
User clicks "Capture Data" → "Extract Token Data for 6 Positions" → Wait 15 seconds
↓
After: Dashboard shows "37.5% cbBTC ($15,464) + 62.5% USDC ($25,773)"
```

## Files Involved

### Investigation & Analysis
- ✅ `/Users/gui/Brave-Capture/tests/verify-token-data.js` - Database verification script
- ✅ `/Users/gui/Brave-Capture/docs/TOKEN-BALANCE-ANALYSIS.md` - Detailed root cause analysis (22 pages)
- ✅ `/Users/gui/Brave-Capture/docs/FIX-IMPLEMENTATION-PLAN.md` - Implementation guide (24 pages)

### Code to Modify (for fix)
- `/Users/gui/Brave-Capture/popup.js` - Add batch extraction UI
- `/Users/gui/Brave-Capture/content.js` - Add position expansion logic
- `/Users/gui/Brave-Capture/background.js` - Enhance AI Vision prompt
- `/Users/gui/Brave-Capture/popup.html` - Add CSS styling

### Current State
- `/Users/gui/Brave-Capture/content.js:394-467` - `extractTokenBreakdown()` function (works but needs visible data)
- `/Users/gui/Brave-Capture/background.js:448-677` - AI Vision extraction (works but needs expanded position)
- `/Users/gui/Brave-Capture/popup.js:203-236` - AI Vision trigger (only runs if screenshot exists)
- `/Users/gui/Brave-Capture/dashboard.js:140-186` - Dashboard rendering (displays null as "0")

## Database Schema (Verified Working)

```sql
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  capture_id TEXT,
  protocol TEXT,
  pair TEXT,
  token0 TEXT,
  token1 TEXT,

  -- These are the missing fields (nullable)
  token0_amount NUMERIC,        -- ← 71.9% NULL
  token1_amount NUMERIC,        -- ← 71.9% NULL
  token0_value NUMERIC,         -- ← 77.1% NULL
  token1_value NUMERIC,         -- ← 77.1% NULL
  token0_percentage NUMERIC,    -- ← 74.2% NULL
  token1_percentage NUMERIC,    -- ← 74.2% NULL

  balance NUMERIC,              -- ✅ 100% populated
  apy NUMERIC,                  -- ✅ Mostly populated
  -- ... other fields ...
);
```

When data IS extracted (20.9% of cases), it saves correctly:
```json
{
  "token0_amount": 32047.09,
  "token1_amount": 1223.64,
  "token0_value": 7714.36,
  "token1_value": 1222.79,
  "token0_percentage": 86.32,
  "token1_percentage": 13.68
}
```

## What's Working vs. Broken

### ✅ WORKING
- Database schema (has all columns, saves correctly when data exists)
- AI Vision extraction (when position is expanded)
- Dashboard rendering (displays data when it exists)
- Orca parser (28% success rate when positions expanded)
- Uniswap parser (71% success rate)

### ❌ BROKEN / INCOMPLETE
- Protocol parsers (5 out of 8 protocols have 0% extraction)
- AI Vision trigger (requires manual position expansion)
- No automated fallback (when extraction fails)
- Dashboard fallback calculation (produces incorrect results)

## Immediate Actions (Priority Order)

1. **HIGH**: Implement batch AI Vision extraction (4 hours)
   - Result: 90%+ coverage immediately
   - File changes: popup.js, content.js, background.js, popup.html

2. **MEDIUM**: Enhance protocol parsers (4.5 hours)
   - Result: 95%+ automatic extraction
   - File changes: content.js (Orca, PancakeSwap, Cetus sections)

3. **LOW**: Add calculated fallback (2 hours)
   - Result: 100% coverage (5% estimated)
   - File changes: popup.js, database migration, dashboard.js

## Testing Commands

### Verify current state:
```bash
node tests/verify-token-data.js
```

### After implementing fix:
```bash
# Should show 90%+ completion
node tests/verify-token-data.js
```

### Test on live protocol:
```
1. Navigate to https://www.orca.so/portfolio
2. Click extension icon → "Capture Data"
3. Click "Extract Token Data for X Positions"
4. Wait for completion
5. Open dashboard.html
6. Verify token amounts visible
```

## Expected Outcome

### Before Fix:
```
Dashboard Position Row:
cbBTC/SOL    $41,237    Token 0: 0    Token 1: 0    Yield: $58    APY: 26.6%
                        ^^^^^^^^^    ^^^^^^^^^
                        MISSING      MISSING
```

### After Fix:
```
Dashboard Position Row:
cbBTC/SOL    $41,237    Token 0: 0.035 cbBTC ($15,464 • 37%)
                                ^^^^^^^^^^^^^^^^^^^^^^^
                                EXTRACTED
                       Token 1: 25.77k USDC ($25,773 • 63%)
                                ^^^^^^^^^^^^^^^^^^^^^^^
                                EXTRACTED
                       Yield: $58    APY: 26.6%
```

## Contact / Questions

- Analysis document: `/docs/TOKEN-BALANCE-ANALYSIS.md`
- Implementation plan: `/docs/FIX-IMPLEMENTATION-PLAN.md`
- Verification script: `/tests/verify-token-data.js`

---

**Last Updated**: 2025-11-14
**Investigated by**: Claude Code Agent
**Status**: Root cause identified, fix plan ready for implementation
