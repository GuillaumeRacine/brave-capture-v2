# CLM Positions Table Alignment Fix

## Problem Summary

The CLM positions table in the dashboard had poor spacing and alignment issues. Column data was running together and wrapping improperly, especially in the token amount columns.

### User-Reported Example (Misaligned):
```
Pair | Balance | Token 0 | Token 1 | Yield | APY | Price Range
SOL/USDC | $18,723 | 95.0146 ($13,444 • 72%) | 5,280.08 ($5,279 • 28%) | $426 | 73.9% | 141.4804 / 126.654 / 190.0027
```

**Issues:**
- Token columns too narrow (140px) for content like "1,192,405.97 ($4,277 • 49%)"
- Numbers not aligned properly
- Insufficient spacing between columns
- Text wrapping and breaking layout

## Root Cause Analysis

**File:** `/Users/gui/Brave-Capture/dashboard.html`

**Original CSS (Lines 475-489):**
```css
.position-detail.balance {
  width: 90px;
}

.position-detail.token {
  width: 140px;  /* TOO NARROW! */
}

.position-detail.yield {
  width: 80px;
}

.position-detail.apy {
  width: 70px;
}
```

**Token Column Content (from dashboard.js, lines 421-426):**
```javascript
${formatTokenAmount(token0Amount)} <span style="color: var(--text-muted); font-size: 0.625rem;">($${Math.round(token0Value).toLocaleString('en-US')} • ${token0Pct.toFixed(0)}%)</span>
```

This generates content like:
- "95.0146 ($13,444 • 72%)" → needs ~200px
- "1,192,405.97 ($4,277 • 49%)" → needs ~240px
- "5,280.08 ($5,279 • 28%)" → needs ~190px

**The 140px width was causing text to wrap and break the table alignment.**

## Changes Made

### 1. Token Column Widths (Lines 480-483)
**Before:**
```css
.position-detail.token {
  width: 140px;
}
```

**After:**
```css
.position-detail.token {
  width: 240px;
  min-width: 240px;
}
```

**Why:** Increased from 140px to 240px to accommodate the longest token amounts with USD values and percentages. Added `min-width` to ensure it never shrinks below this.

### 2. Balance Column Alignment (Lines 475-478)
**Before:**
```css
.position-detail.balance {
  width: 90px;
}
```

**After:**
```css
.position-detail.balance {
  width: 100px;
  text-align: right;
}
```

**Why:** Increased width slightly and added right-alignment for better number readability.

### 3. Yield & APY Column Alignment (Lines 485-493)
**Before:**
```css
.position-detail.yield {
  width: 80px;
}

.position-detail.apy {
  width: 70px;
}
```

**After:**
```css
.position-detail.yield {
  width: 80px;
  text-align: right;
}

.position-detail.apy {
  width: 70px;
  text-align: right;
}
```

**Why:** Added right-alignment for numeric columns to improve readability and create a cleaner table look.

### 4. Position Header Width (Lines 361-363, 400-406)
**Before:**
```css
.position-header {
  width: 180px;
}
```

**After:**
```css
.position-header {
  width: 200px;
}
```

**Why:** Increased from 180px to 200px to better accommodate pair names like "SOL/USDC · Orca · 2h ago".

### 5. Item & Detail Spacing (Lines 384-393, 460-465)
**Before:**
```css
.position-item {
  gap: 8px;
}

.position-details {
  gap: 8px;
}
```

**After:**
```css
.position-item {
  gap: 12px;
  padding: 8px 10px;  /* Also increased from 6px 8px */
}

.position-details {
  gap: 12px;
}
```

**Why:** Increased gap from 8px to 12px for better visual separation between columns. Increased padding for more breathing room.

## Summary of Changes

| Element | Property | Before | After | Reason |
|---------|----------|--------|-------|--------|
| `.position-detail.token` | width | 140px | 240px | Accommodate long numbers with USD values |
| `.position-detail.token` | min-width | - | 240px | Prevent shrinking |
| `.position-detail.balance` | width | 90px | 100px | Slight increase for readability |
| `.position-detail.balance` | text-align | - | right | Align numbers to the right |
| `.position-detail.yield` | text-align | - | right | Align numbers to the right |
| `.position-detail.apy` | text-align | - | right | Align numbers to the right |
| `.position-header` | width | 180px | 200px | Better accommodate pair names |
| `.position-item` | gap | 8px | 12px | Increase spacing between columns |
| `.position-item` | padding | 6px 8px | 8px 10px | More breathing room |
| `.position-details` | gap | 8px | 12px | Increase spacing between details |

## Testing

A comprehensive test file has been created at:
**`/Users/gui/Brave-Capture/tests/test-table-alignment.html`**

This test file includes:
1. Your original example (SOL/USDC)
2. Large number test case (USDC/STRK with 1,192,405.97 tokens)
3. Out-of-range position test (ETH/USDC)
4. Small decimal test (BTC with 0.8234 tokens)

### To Test:
1. Open `/Users/gui/Brave-Capture/tests/test-table-alignment.html` in your browser
2. Verify all columns are properly aligned
3. Verify no text wrapping occurs
4. Verify numbers are right-aligned in Balance, Yield, and APY columns
5. Open `/Users/gui/Brave-Capture/dashboard.html` in your browser
6. Verify live data displays correctly

## Visual Comparison

**Before:**
- Token columns: 140px (text wrapping)
- Gap between items: 8px (cramped)
- Numbers: left-aligned (inconsistent)

**After:**
- Token columns: 240px (no wrapping)
- Gap between items: 12px (comfortable spacing)
- Numbers: right-aligned (clean and professional)

## Expected Result

The table should now display like this (aligned):

```
Pair                          Balance    Token 0                                    Token 1                                    Yield    APY     Price Range
SOL/USDC · Orca · 2h ago      $18,723    95.0146 ($13,444 • 72%)                   5,280.08 ($5,279 • 28%)                    $426     73.9%   141.4804 / 126.654 / 190.0027
USDC/STRK · Ekubo · 5h ago    $8,554     1,192,405.97 ($4,277 • 49%)               4,277.19 ($4,277 • 51%)                    $123     45.2%   96,311.28 / 90,870 / 115,700
ETH/USDC · Uniswap · 12h ago  $45,890    12.4567 ($38,234 • 83%)                   7,656.23 ($7,656 • 17%)                    $1,234   89.3%   3,067.45 / 2,800 / 3,200
```

## Files Modified

1. **`/Users/gui/Brave-Capture/dashboard.html`**
   - Lines 361-363: Position header row width
   - Lines 384-393: Position item padding and gap
   - Lines 400-406: Position header width
   - Lines 460-465: Position details gap
   - Lines 475-493: Column widths and text alignment

## Files Created

1. **`/Users/gui/Brave-Capture/tests/test-table-alignment.html`**
   - Comprehensive test file with 4 test cases
   - Shows before/after comparison
   - Includes edge cases (large numbers, decimals, out-of-range)

2. **`/Users/gui/Brave-Capture/docs/table-alignment-fix.md`**
   - This documentation file

## Additional Recommendations

### 1. Consider Monospace Font for Numbers
For even better alignment, you could add a monospace font for numeric values:

```css
.detail-value {
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
}
```

### 2. Add Column Resizing
For users with different screen sizes, consider adding a draggable column resize feature.

### 3. Responsive Breakpoints
The mobile view already uses a grid layout (lines 708-711), which is good. However, you might want to test on tablets (768px-1024px) to ensure the table doesn't get too cramped.

### 4. Overflow Handling
For extremely large numbers (>10 million), consider truncating with ellipsis:

```css
.position-detail.token {
  overflow: hidden;
  text-overflow: ellipsis;
}
```

## Notes

- The changes maintain the existing dark theme design
- Responsive breakpoints were preserved
- No JavaScript changes were required
- The fix is purely CSS-based for better performance
- The changes don't affect Hedge or Collateral position tables (they use a different layout)

## Verification Checklist

- [x] Token columns widened to 240px
- [x] Balance, Yield, APY columns right-aligned
- [x] Spacing increased between columns
- [x] Position header width increased
- [x] Test file created with sample data
- [x] Documentation created
- [ ] Visual testing in browser (pending user verification)
- [ ] Testing with live data (pending user verification)
- [ ] Testing on mobile devices (pending user verification)
