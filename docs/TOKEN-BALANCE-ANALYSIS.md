# Token Balance Missing Data - Root Cause Analysis

**Date**: 2025-11-14
**Severity**: HIGH - 79.1% of positions missing token breakdown data
**Status**: Investigation Complete, Root Causes Identified

---

## Executive Summary

**Problem**: Dashboard shows positions but token amounts (token0Amount, token1Amount, etc.) are missing or incorrect for 548 out of 693 positions (79.1%).

**Root Causes Identified**:
1. **Protocol parsers not extracting token breakdown** - Most parsers only extract total USD balance, not individual token amounts
2. **AI Vision not being triggered** - Requires manually expanded position drawer, which users rarely open
3. **AI Vision only processes ONE position** - Even when triggered, it only extracts the currently visible expanded position
4. **Database schema supports the data** - Columns exist and are populated when data is extracted

---

## Database Verification Results

### Overall Statistics (693 positions)

| Metric | Count | Percentage |
|--------|-------|------------|
| With BOTH token amounts | 195 | 28.1% |
| With BOTH token values | 159 | 22.9% |
| With BOTH percentages | 179 | 25.8% |
| **FULLY COMPLETE** | **145** | **20.9%** |
| **MISSING DATA** | **548** | **79.1%** |

### Protocol Breakdown

| Protocol | Total | With Both Amounts | With Both Values | Fully Complete |
|----------|-------|-------------------|------------------|----------------|
| Orca | 605 | 171 (28.3%) | 137 (22.6%) | 137 (22.6%) |
| Uniswap | 28 | 20 (71.4%) | 20 (71.4%) | 6 (21.4%) |
| Cetus | 26 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| PancakeSwap | 14 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| Hyperion | 11 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| Raydium | 4 | 2 (50.0%) | 2 (50.0%) | 2 (50.0%) |
| Ekubo | 3 | 2 (66.7%) | 0 (0.0%) | 0 (0.0%) |
| Beefy | 2 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

### Key Findings

1. **Orca has best coverage** (28.3%) but still missing 71.7% of token data
2. **Uniswap has good amount extraction** (71.4%) but many missing USD values/percentages
3. **Five protocols have 0% token extraction**: Cetus, PancakeSwap, Hyperion, Beefy, and most Ekubo positions
4. **Latest 10 captures**: 9 out of 10 are missing token data

---

## Data Flow Analysis

### Current Pipeline

```
Protocol Page → content.js parser → popup.js → supabase-client.js → Database → dashboard.js → Display
                     ↓                    ↓
              DOM extraction        AI Vision (optional)
                                   - Only if position expanded
                                   - Only processes 1 position
                                   - Saves directly to DB
```

### Three Methods for Token Extraction

#### 1. DOM Parsing (content.js)

**How it works**: Protocol parsers call `extractTokenBreakdown()` which searches for token amounts in the page text.

**Success rate by protocol**:
- Orca: ~28% (only when user manually expands position drawer)
- Uniswap: ~71% (better UI structure)
- Raydium: ~50%
- Others: 0%

**Why it fails**:
- Token breakdown NOT visible in list view
- Requires user to manually click/expand each position
- Most protocols don't show token amounts in summary view

**Code location**: `/Users/gui/Brave-Capture/content.js:394-467` (extractTokenBreakdown function)

Example from PancakeSwap parser (lines 2310-2318):
```javascript
// Extract token breakdown
if (position.token0 && position.token1 && allText) {
  const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
  if (breakdown.token0Amount) {
    Object.assign(position, breakdown);
  } else {
    setTokenBreakdownNull(position); // Sets all token fields to null
  }
}
```

**Result**: If `extractTokenBreakdown()` doesn't find the data in the visible text, it returns empty and the position gets null values.

#### 2. AI Vision from Expanded Position (background.js)

**How it works**:
1. User clicks "Capture Data" in popup
2. Takes screenshot of page
3. Checks if any positions have null token amounts
4. Sends screenshot to background.js
5. Claude API analyzes screenshot for expanded position drawer
6. Extracts token data and saves directly to database

**Success rate**: ~5-10% (only when user manually expands position before capture)

**Why it fails**:
- **User must manually expand position drawer** before clicking capture
- Only processes ONE position per screenshot (the visible expanded one)
- Claude looks for: "EXPANDED drawer/panel on the right side showing detailed balance breakdown"
- If no drawer expanded: returns `{"error": "No expanded position found"}`
- Users typically capture from list view without expanding anything

**Code location**:
- Trigger: `/Users/gui/Brave-Capture/popup.js:203-236`
- Extraction: `/Users/gui/Brave-Capture/background.js:448-677`

AI Vision prompt (lines 483-515):
```javascript
const prompt = `You are analyzing a screenshot of a DeFi Orca portfolio page.

Look for an EXPANDED drawer/panel on the right side showing detailed balance breakdown.

If you see an expanded position drawer, identify:
1. Which token pair it shows (e.g., "cbBTC/USDC", "SOL/USDC", etc.)
2. The individual token amounts
3. The percentages for each token

Return ONLY this JSON (no markdown, no explanation):
{
  "pair": "<token0>/<token1>",
  "token0": "<token0 name>",
  "token1": "<token1 name>",
  "token0Amount": <number>,
  "token1Amount": <number>,
  "token0Percentage": <number>,
  "token1Percentage": <number>
}

If NO position drawer is expanded, return:
{"error": "No expanded position found"}
```

**Result**: Most captures don't have expanded positions, so AI Vision can't extract data.

#### 3. Manual Paste (popup.js)

**How it works**: If capture has missing token data, popup shows a "Parse Balance" button where user can paste text.

**Success rate**: <1% (users don't do this)

**Why it fails**: Too manual, requires user action after every capture.

---

## Root Cause #1: Protocol Parsers Don't Extract Token Breakdown

### Analysis of Each Protocol Parser

#### ✅ WORKING: Orca (28.3% success)
**File**: content.js, lines 608-843
**Method**: `extractExpandedOrcaPositions()` - looks for expanded drawer panels
**Why partial success**: Only works when user manually expands a position
**Code**: Searches for drawer selectors like `.fixed.inset-0.z-50`, `[role="dialog"]`

#### ✅ WORKING: Uniswap (71.4% success)
**File**: content.js, lines 845-1150
**Method**: Parses detailed position pages and extracts token amounts from structured UI
**Why better**: Uniswap shows token breakdown in the position detail view by default
**Code**: Lines 976-981, 1100-1101, 1256-1260

#### ⚠️ PARTIAL: Raydium (50% success)
**File**: content.js, lines 1283-1450
**Method**: Similar to Orca, looks for expanded panels
**Why partial**: Depends on user expanding positions

#### ❌ FAILING: PancakeSwap (0% success)
**File**: content.js, lines 2247-2522
**Method**: Calls `extractTokenBreakdown()` but data not in list view
**Issue**: Token breakdown only visible in position detail page, not captured
**Code**: Line 2312 - calls extractTokenBreakdown, returns empty, sets to null

#### ❌ FAILING: Cetus (0% success)
**File**: content.js, lines 1649-1812
**Method**: Similar to PancakeSwap - no token data in list view
**Issue**: Parser gets total balance but not token breakdown

#### ❌ FAILING: Hyperion (0% success)
**File**: content.js, lines 1813-2246
**Method**: Basic parsing, no token breakdown extraction
**Issue**: Protocol doesn't expose token amounts in accessible way

#### ❌ FAILING: Beefy (0% success)
**File**: content.js, lines 2524-end
**Method**: Focuses on vault-level data, not individual token amounts
**Issue**: Different protocol type (yield aggregator), may not need token breakdown

#### ⚠️ PARTIAL: Ekubo (66.7% amounts, 0% values)
**File**: content.js, lines 1151-1282
**Method**: Extracts token amounts but not USD values
**Issue**: Missing calculation for token0_value, token1_value

---

## Root Cause #2: AI Vision Requires Manual Position Expansion

### The Problem

AI Vision is designed to extract token data from screenshots of **expanded position drawers**. However:

1. **Users don't know they need to expand positions** before capturing
2. **Even if they did, they'd need to**:
   - Expand position 1 → Capture → Close drawer
   - Expand position 2 → Capture → Close drawer
   - Expand position 3 → Capture → Close drawer
   - ... repeat for every position

3. **AI Vision only processes ONE position per screenshot** (the visible expanded one)

4. **Most users capture from list view** without expanding anything

### Evidence from Database

Latest 10 captures (all recent, 2025-11-14 10:00-10:23):
- 9 out of 10 are missing token data
- Only 1 has complete data (Ekubo - amounts only, no values)

This proves users are capturing from list views, not expanded detail views.

---

## Root Cause #3: Database Schema is Correct

The database schema DOES have all necessary columns:

```sql
CREATE TABLE positions (
  -- ... other columns ...
  token0_amount NUMERIC,
  token1_amount NUMERIC,
  token0_value NUMERIC,
  token1_value NUMERIC,
  token0_percentage NUMERIC,
  token1_percentage NUMERIC,
  -- ... other columns ...
);
```

When data IS extracted (20.9% of cases), it saves correctly:

**Example from Uniswap ARB/USDT**:
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

The database is working correctly - the problem is the extraction methods aren't providing the data.

---

## Why Dashboard Shows Missing Balances

### Dashboard Rendering Logic

File: `/Users/gui/Brave-Capture/dashboard.js`, lines 140-186

```javascript
async function loadCLMPositions() {
  const positions = await window.getLatestPositions();

  clmPositions = positions.map(pos => ({
    pair: pos.pair,
    protocol: pos.protocol,
    token0: pos.token0,
    token1: pos.token1,
    token0Amount: pos.token0_amount,  // ← null for 79% of positions
    token1Amount: pos.token1_amount,  // ← null for 79% of positions
    token0Value: pos.token0_value,    // ← null for 77% of positions
    token1Value: pos.token1_value,    // ← null for 77% of positions
    balance: pos.balance,
    // ... rest of mapping
  }));
}
```

Dashboard displays (lines 382-387):
```javascript
<div class="position-detail token">
  <span class="detail-value">
    ${formatTokenAmount(token0Amount)}
    <span style="color: var(--text-muted);">
      ($${Math.round(token0Value).toLocaleString('en-US')} • ${token0Pct.toFixed(0)}%)
    </span>
  </span>
</div>
```

**When token0Amount is null**:
- `formatTokenAmount(null)` returns "0"
- `token0Value` is null, shows "$0"
- `token0Pct` calculation fails, shows "NaN%" or calculates incorrect 50/50 split

**Dashboard fallback logic** (lines 343-366):
- If token values are missing/inconsistent AND currentPrice exists
- Tries to calculate split using currentPrice
- Assumes currentPrice is "token1 per token0" ratio
- Often produces incorrect results because:
  - CurrentPrice might be inverted
  - Missing token amounts to calculate with
  - Results in wrong percentages

---

## Impact Analysis

### User Impact

1. **Cannot see token composition** - Critical for rebalancing decisions
2. **Cannot calculate delta neutrality** - Need to know if 50/50 or skewed
3. **Cannot track IL precisely** - Need token amounts, not just USD total
4. **Dashboard shows incomplete data** - Undermines trust in tool

### Data Quality Impact

| Metric | Current State |
|--------|---------------|
| Complete positions | 145 / 693 (20.9%) |
| Orca (main protocol) | 137 / 605 (22.6%) complete |
| Recent captures | 1 / 10 (10%) complete |
| Protocols with 0% | 5 protocols completely broken |

---

## Recommended Solutions

### SHORT-TERM FIX (1-2 hours)

**Solution**: Add post-capture AI Vision batch processing

1. After user captures all positions from list view
2. Detect positions with missing token data
3. Show UI: "10 positions missing token data. Click to extract."
4. User clicks one button
5. Extension:
   - Opens each position detail page (or expands drawer)
   - Takes screenshot
   - AI Vision extracts data
   - Updates database
   - Closes/moves to next
6. Progress bar: "Extracting 3/10..."

**Pros**:
- Fixes all protocols at once
- User-friendly (one click)
- Uses existing AI Vision code

**Cons**:
- Requires API calls (costs money)
- Takes time (10 positions = 10 API calls)
- Needs user permission/action

### MEDIUM-TERM FIX (3-5 hours)

**Solution**: Enhanced protocol parsers + calculated fallback

1. **Improve parsers** to navigate to detail pages:
   - PancakeSwap: Click into position detail, extract, return
   - Cetus: Same approach
   - Hyperion: Same approach

2. **Add calculated fallback** for when amounts missing:
   - If balance = $10,000 and currentPrice exists
   - Calculate token amounts using price + 50/50 assumption
   - Mark as "estimated" in database (add `is_estimated` flag)
   - Dashboard shows warning icon "⚠️ Estimated"

**Pros**:
- Better data quality
- No API costs
- Works automatically

**Cons**:
- Protocol-specific code for each
- Estimated data might be wrong
- Doesn't solve root cause

### LONG-TERM FIX (8-12 hours)

**Solution**: Hybrid extraction with multiple fallbacks

1. **Primary**: Enhanced parsers (navigate to detail pages)
2. **Secondary**: AI Vision batch processing (if parser fails)
3. **Tertiary**: Calculate from price + 50/50 (mark as estimated)
4. **Database schema**: Add `extraction_method` column
   - Values: "dom_parsing", "ai_vision", "calculated", "manual"

**Pros**:
- Best data quality
- Multiple fallbacks ensure coverage
- Transparent to user what's real vs estimated

**Cons**:
- More complex implementation
- Requires testing across all protocols

### ALTERNATIVE: Price Oracle Integration

Instead of extracting token amounts, calculate from:
- Total USD balance
- Token prices from oracle (e.g., CoinGecko API)
- Current position price ratio

**Pros**:
- Works for all protocols
- No need for protocol-specific parsing
- Real-time accurate

**Cons**:
- Requires API integration
- Doesn't show actual amounts (calculates based on price)
- Might differ from actual position due to IL

---

## Immediate Action Items

1. ✅ **Database verification** - Complete (this document)

2. **Create user guide**: Document that users should:
   - Expand position drawers before capturing
   - Or use batch extraction tool (once built)

3. **Fix dashboard fallback calculation**:
   - Current logic at lines 343-366 is buggy
   - Either remove it or fix the price ratio assumption
   - Add clear "ESTIMATED" label when using fallback

4. **Add logging**:
   - Track extraction success rate per protocol
   - Log when `extractTokenBreakdown()` fails
   - Alert user when 0% of positions have token data

5. **Prioritize protocol fixes**:
   - PancakeSwap (14 positions) - 0% coverage
   - Hyperion (11 positions) - 0% coverage
   - Cetus (26 positions) - 0% coverage
   - Orca (605 positions) - improve from 28% to 80%+

---

## Testing Requirements

Before deploying any fix:

1. **Test each protocol**:
   - Orca: Capture without expanding (list view)
   - Orca: Capture with one position expanded
   - PancakeSwap: Capture from list, from detail page
   - Etc.

2. **Verify database updates**:
   - Check token0_amount, token1_amount populated
   - Check token0_value, token1_value calculated correctly
   - Check percentages add to 100%

3. **Test dashboard rendering**:
   - Positions with complete data
   - Positions with partial data
   - Positions with no token data (null)
   - Positions with estimated data (if implemented)

4. **Test AI Vision batch**:
   - Run on 5-10 positions
   - Verify accuracy vs manual check
   - Check database updates
   - Measure time taken

---

## Conclusion

The token balance missing data issue is caused by:

1. **Protocol parsers only extract visible data** - Most protocols don't show token breakdown in list view
2. **AI Vision requires manual expansion** - Users don't expand positions before capturing
3. **No automated fallback** - When extraction fails, positions are saved with null values

The database schema is correct and working. The fix needs to be in the extraction layer (content.js parsers and/or AI Vision automation).

**Recommended priority**: Implement SHORT-TERM FIX (batch AI Vision) first for immediate relief, then work on MEDIUM-TERM FIX (enhanced parsers) for better long-term solution.
