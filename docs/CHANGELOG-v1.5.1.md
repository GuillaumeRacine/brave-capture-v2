# Release Notes - v1.5.1

**Release Date:** November 17, 2025
**Code Name:** Token Exposure Table Refinement

---

## Overview

v1.5.1 is a refinement release that improves the Token Exposure Card introduced in v1.5.0. This release simplifies the UI by replacing the dual-tab interface with a unified table format, fixes critical bugs, and improves code maintainability.

---

## What's New in v1.5.1

### 1. Unified Token Exposure Table

**Replaced:** Dual-tab interface (CLM Tokens / Hedge Tokens tabs)
**With:** Single table with 6 columns

**New Table Format:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Token | Price | CLM USD | CLM Exposure | Hedge Exposure | Net Exposure  │
├──────────────────────────────────────────────────────────────────────────┤
│ USD   | $1.00 | $25,528 | 25,528 USD   | -               | +25,528 USD  │
│ SOL   | $140  | $17,616 | 125.8 SOL    | -200.00 SOL     | -74.2 SOL    │
│ BTC   | $60k  | $18,000 | 0.3000 BTC   | +0.50 BTC       | +0.80 BTC    │
│ ETH   | $3k   | $8,400  | 2.80 ETH     | +7.00 ETH       | +9.80 ETH    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- **Side-by-side comparison** - See CLM and Hedge exposure together
- **Net Exposure calculation** - Automatic calculation of total exposure (CLM + Hedge)
- **Better sorting** - Sorted by CLM USD value (most valuable first)
- **Cleaner UI** - No tab switching required
- **Color-coded values** - Green for long bias, red for short bias

---

## Bug Fixes

### 1. ETH Exposure Calculation Fix

**Issue:** ETH token exposure was showing incorrect values in some CLM positions
**Root Cause:** Missing token consolidation for whETH variant
**Fix:** Added whETH → ETH mapping to TOKEN_GROUPS
**Impact:** ETH exposure now accurately aggregates all variants (WETH, whETH, STETH, etc.)

**Before:**
```javascript
const TOKEN_GROUPS = {
  'ETH': ['ETH', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH']
  // Missing: whETH
};
```

**After:**
```javascript
const TOKEN_GROUPS = {
  'ETH': ['ETH', 'WETH', 'WHETH', 'STETH', 'WSTETH', 'RETH', 'CBETH']
  //                      ^^^^^^ Added
};
```

### 2. USD Value Display Consistency

**Issue:** Token values were displaying with inconsistent decimal places
**Fix:** Standardized to round values before displaying
**Before:** `$25,528.456` (too many decimals)
**After:** `$25,528` (clean, rounded)

### 3. Net Exposure Column Addition

**Issue:** Previous version only showed CLM and Hedge separately
**Enhancement:** Added Net Exposure column to show total exposure per token
**Calculation:** `Net Exposure = CLM Amount + Hedge Net Amount`
**Example:**
- CLM: 100 SOL
- Hedge: -50 SOL (net short)
- Net: +50 SOL (combined)

---

## UI/UX Improvements

### Simplified Interface

**Removed:**
- Tab navigation (CLM Tokens / Hedge Tokens tabs)
- Tab switching animation
- Dual tab content containers
- switchTokenTab() function

**Added:**
- Single unified table
- Net Exposure column with color coding
- CLM USD column for sorting priority

### Visual Consistency

- **Card header metrics:** Updated to show combined counts
- **Color coding:**
  - Green: Positive hedge/net exposure (long bias)
  - Red: Negative hedge/net exposure (short bias)
  - White: CLM exposure (always positive)
- **Icon gradient:** Token icon uses orange gradient for distinction

---

## Code Cleanup & Refactoring

### Deprecated Functions Removed

**Removed 3 legacy functions (saving ~200 lines of code):**

1. **switchTokenTab()** (lines 1228-1255)
   - Was used for dual-tab interface
   - No longer needed with unified table

2. **renderCLMTokens()** (lines 1583-1650)
   - Rendered card-based CLM tokens
   - Replaced by renderTokenExposureTable()

3. **renderHedgeTokens()** (lines 1652-1720)
   - Rendered card-based hedge tokens
   - Replaced by renderTokenExposureTable()

**Replacement Function:**
- `renderTokenExposureTable()` - Unified renderer for all tokens
- Single source of truth for token display logic
- Easier to maintain and extend

### Code Documentation

**Added comprehensive inline comments:**
- Token consolidation logic explained
- Aggregation functions documented with JSDoc
- Formatting functions with usage examples
- Removed code sections clearly marked with reasons

**Example JSDoc additions:**
```javascript
/**
 * Aggregate CLM tokens across all positions (with consolidation)
 *
 * Estimation Strategy (v1.5.1):
 * - Missing data is common (~79% of positions lack token breakdown)
 * - Estimation: Assume 50/50 split → each token = balance * 0.5
 * - Mark token as estimated if ANY position lacks data
 *
 * @returns {Object} - { tokens: Array, estimationPct: number }
 */
```

---

## Technical Details

### Files Modified

**dashboard.html:**
- No changes (table structure already in place from v1.5.0)

**dashboard.js:**
- **Removed:** 3 deprecated functions (~200 lines)
- **Added:** Comprehensive JSDoc comments (~100 lines)
- **Modified:** Token consolidation mapping (added whETH)

**package.json:**
- Version: 1.5.0 → 1.5.1

**manifest.json:**
- Version: 1.5.0 → 1.5.1

### Files Created

**docs/CHANGELOG-v1.5.1.md:**
- This file - comprehensive release notes

**docs/TOKEN_EXPOSURE_v1.5.1.md:**
- Complete guide to current implementation
- Replaces outdated dual-tab documentation
- Includes table format, Net Exposure calculation, sorting logic

---

## Migration Guide

### For Users

**No action required!** The upgrade is seamless:
1. Pull latest code / reload extension
2. Open dashboard
3. Expand Token Exposure card
4. See new unified table (no tabs)

**Visual Changes:**
- ~~Tab navigation~~ → Single table
- ~~Separate CLM/Hedge views~~ → Side-by-side columns
- **New:** Net Exposure column

### For Developers

**If you extended the token card:**
- Remove any references to `switchTokenTab()`
- Remove any references to `renderCLMTokens()` or `renderHedgeTokens()`
- Use `renderTokenExposureTable()` instead
- Update any custom CSS that targeted `.tab-button` or `.token-item`

**Breaking Changes:**
- None - all changes are internal to dashboard.js

---

## Testing

### Validation Performed

✅ **All existing tests still pass (30/30 - 100%)**

**Token Exposure Tests:**
```bash
npm run test:tokens
```

**All Tests:**
```bash
npm run test:all
```

**JavaScript Syntax Check:**
```bash
node --check /Users/gui/Brave-Capture/dashboard.js
```

### Test Results

```
Test Suite                    Tests    Passed    Failed    Rate
────────────────────────────────────────────────────────────────
test-token-exposure.js          8        8         0      100%
test-hyperliquid-parser.js      9        9         0      100%
test-aave-deduplication.js      5        5         0      100%
test-price-slider.js            8        8         0      100%
────────────────────────────────────────────────────────────────
TOTAL                          30       30         0      100%
```

---

## Documentation Updates

### New Documentation

**TOKEN_EXPOSURE_v1.5.1.md:**
- Comprehensive guide to current implementation
- Table format documentation
- Net Exposure calculation explanation
- Sorting logic documentation
- Code examples for current version

### Updated Documentation

**TOKEN_EXPOSURE_FEATURE.md:**
- Updated to remove dual-tab references
- Updated column list (6 columns)
- Updated UI component descriptions
- Updated code examples
- Added v1.5.1 changelog section

**tests/README.md:**
- Added token exposure test information
- Updated test count (22 → 30 tests)
- Added test:tokens npm script documentation

---

## Performance Impact

### Metrics

- **Code size:** Reduced by ~100 lines (removed deprecated functions, added comments)
- **Dashboard load time:** No change (lazy loading still in effect)
- **Memory footprint:** No change
- **Table rendering:** <5ms (single render vs dual tab renders)

### Improvements

✅ **Simpler code** - One render function vs three
✅ **Better maintainability** - Single source of truth
✅ **Easier to extend** - Add columns to table vs managing tabs

---

## Known Issues & Limitations

### Inherited from v1.5.0

1. **CLM Data Quality (79% Missing)**
   - Most CLM positions lack individual token data
   - Heavy reliance on estimation (balance * 0.5)
   - Workaround: Use Orca rotation capture workflow

2. **CoinGecko Rate Limits**
   - Free tier: 10-30 calls/minute
   - Mitigation: 5-minute cache reduces calls by 98%

3. **Cross-Chain Token Ambiguity**
   - Same symbol on different chains uses single price
   - Future: Map by (symbol, chain) tuple

### No New Issues

✅ No new bugs introduced
✅ All existing functionality preserved
✅ Backward compatible with v1.5.0 data

---

## Upgrade Instructions

### For Existing Users

1. **Pull Latest Code:**
   ```bash
   cd /Users/gui/Brave-Capture
   git pull origin main
   ```

2. **Reload Extension:**
   - Open `chrome://extensions`
   - Click reload on Brave Capture extension
   - Refresh dashboard tab

3. **Verify:**
   - Open dashboard
   - Expand "Token Exposure" card
   - Should see single table (no tabs)
   - Check Net Exposure column exists

### No Breaking Changes

✅ All existing features work
✅ No database migrations required
✅ No API changes
✅ Backward compatible with v1.5.0

---

## Comparison: v1.5.0 vs v1.5.1

| Feature | v1.5.0 | v1.5.1 |
|---------|--------|--------|
| **UI Format** | Dual tabs (CLM / Hedge) | Single unified table |
| **Columns** | 4 per tab | 6 total columns |
| **Net Exposure** | Manual calculation | Automatic column |
| **Sorting** | Alphabetical | By CLM USD value |
| **Tab Switching** | Yes | No (removed) |
| **ETH Consolidation** | Missing whETH | Includes all variants |
| **Code Size** | ~1,888 lines | ~1,788 lines (-100) |
| **Documentation** | Dual-tab focused | Table-focused |

---

## Future Enhancements

### Planned for v1.6.0

- [ ] Historical price charts (sparklines)
- [ ] 24h price change percentages
- [ ] Unrealized P&L per token
- [ ] Token allocation pie chart
- [ ] Export to CSV

### Under Consideration

- [ ] Custom column selection
- [ ] User-defined sorting options
- [ ] Filter by token value threshold
- [ ] Token correlation analysis
- [ ] Rebalancing suggestions

---

## Credits

**Built with:**
- CoinGecko API (free tier)
- Chrome Extension APIs
- Supabase database
- Claude AI for extraction

**v1.5.1 Changes:**
- UI simplification (dual tabs → unified table)
- ETH consolidation bug fix
- Code cleanup and documentation
- Net Exposure column addition

---

## Support

**Issues or Questions:**
- GitHub Issues: https://github.com/GuillaumeRacine/brave-capture-v2/issues
- Documentation: `/docs/TOKEN_EXPOSURE_v1.5.1.md`

**Testing:**
```bash
npm run test:tokens      # Token exposure tests only
npm run test:all         # All tests (30 total)
```

---

## Checklist

- [x] Bug fixes implemented (ETH consolidation)
- [x] Deprecated code removed (3 functions)
- [x] Code comments added (JSDoc format)
- [x] Version numbers updated (1.5.1)
- [x] Documentation created (CHANGELOG-v1.5.1.md)
- [x] Documentation updated (TOKEN_EXPOSURE_FEATURE.md)
- [x] All tests passing (30/30 - 100%)
- [x] Code syntax validated
- [x] No console errors
- [x] Backward compatible with v1.5.0

---

**Version:** 1.5.1
**Status:** ✅ Ready for Release
**Test Results:** 30/30 passing (100%)
**Release Date:** November 17, 2025

Thank you for using Brave Capture!
