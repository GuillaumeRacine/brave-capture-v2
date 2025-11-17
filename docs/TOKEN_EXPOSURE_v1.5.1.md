# Token Exposure Card - v1.5.1 Guide

**Version:** 1.5.1
**Last Updated:** November 17, 2025
**Status:** ✅ Production Ready

---

## Overview

The Token Exposure Card provides a unified view of all token holdings across CLM positions and hedge positions in a single, easy-to-read table format.

### What's New in v1.5.1

**Replaced:** Dual-tab interface (CLM Tokens / Hedge Tokens)
**With:** Unified table with 6 columns

This simplifies the UI and makes it easier to see your complete token exposure at a glance.

---

## Table Format

### Column Structure

The Token Exposure table has **6 columns**:

| Column | Description | Example |
|--------|-------------|---------|
| **Token** | Token symbol with icon | USD (with icon) |
| **Price** | Current USD price from CoinGecko | $1.00 |
| **CLM USD** | Total USD value in CLM positions | $25,528 |
| **CLM Exposure** | Token amount in CLM positions | 25,528 USD |
| **Hedge Exposure** | Net amount from hedges (long - short) | -200.00 SOL |
| **Net Exposure** | Total exposure (CLM + Hedge) | +25,328 USD |

### Example Table

```
┌──────────────────────────────────────────────────────────────────────┐
│ Token | Price | CLM USD | CLM Exposure | Hedge Exposure | Net Exp  │
├──────────────────────────────────────────────────────────────────────┤
│ USD   | $1.00 | $25,528 | 25,528 USD   | -           | +25,528 USD │
│ SOL   | $140  | $17,616 | 125.8 SOL    | -200.00 SOL | -74.2 SOL   │
│ BTC   | $60k  | $18,000 | 0.3000 BTC   | +0.50 BTC   | +0.80 BTC   │
│ ETH   | $3k   | $8,400  | 2.80 ETH     | +7.00 ETH   | +9.80 ETH   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Token Consolidation

Similar tokens are automatically grouped together:

**BTC Group:**
- WBTC, cbBTC, xBTC, RENBTC → all show as "BTC"

**ETH Group:**
- WETH, whETH, STETH, WSTETH, RETH, CBETH → all show as "ETH"

**USD Group (Stablecoins):**
- USDC, USDT, DAI, FRAX, LUSD, GUSD, BUSD, TUSD, USDP, USDC.E → all show as "USD"

**Why?** This prevents fragmentation and shows your true exposure to the underlying asset.

### 2. Net Exposure Calculation

**Formula:** `Net Exposure = CLM Amount + Hedge Net Amount`

**Example:**
```
CLM Position:    100 SOL
Hedge Position:  -50 SOL (net short: 0 long - 50 short)
Net Exposure:    +50 SOL
```

**Color Coding:**
- **Green** - Positive (long bias)
- **Red** - Negative (short bias)
- **White** - CLM exposure (always positive)

### 3. Smart Sorting

Tokens are sorted by **CLM USD value** (descending).

This means your most valuable holdings appear first, making it easy to focus on what matters most.

### 4. Real-Time Prices

Prices are fetched from CoinGecko API and cached for 5 minutes.

**Supported:** 60+ tokens including:
- Major assets (BTC, ETH, SOL)
- DeFi tokens (AAVE, UNI, LINK)
- Solana ecosystem (30+ tokens)
- Stablecoins
- Wrapped/Liquid Staked variants

---

## How It Works

### Data Flow

```
1. Load CLM Positions
   ↓
2. Load Hedge Positions
   ↓
3. Aggregate CLM Tokens
   - Split pairs (SOL/USDC → SOL + USDC)
   - Consolidate variants (WBTC → BTC)
   - Sum values across positions
   - Estimate missing data (balance * 0.5)
   ↓
4. Aggregate Hedge Tokens
   - Group by token
   - Calculate net exposure (long - short)
   - Consolidate variants
   ↓
5. Fetch Prices
   - Get unique token symbols
   - Fetch from CoinGecko (with cache)
   ↓
6. Render Table
   - Combine CLM + Hedge data
   - Calculate Net Exposure
   - Sort by CLM USD value
   - Apply color coding
```

### Estimation Strategy

**Problem:** ~79% of CLM positions lack individual token breakdown data.

**Solution:** When token data is missing, we estimate:
- Each token in a pair = `balance * 0.5`
- Example: SOL/USDC position with $8,000 balance → SOL = $4,000, USDC = $4,000

**Transparency:** This is a best-effort estimate. As you capture more positions with the Orca rotation workflow, actual data will replace estimates.

---

## Code Reference

### Key Functions

**aggregateCLMTokens()**
- Processes all CLM positions
- Splits pairs into individual tokens
- Consolidates variants (WBTC → BTC)
- Estimates missing data
- Returns: `{ tokens: Array, estimationPct: number }`

**aggregateHedgeTokens()**
- Processes all hedge positions
- Calculates net exposure (long - short)
- Consolidates variants
- Returns: `Array` of token objects with net exposure

**renderTokenExposureTable(clmTokens, hedgeTokens, prices)**
- Combines CLM and hedge data
- Calculates Net Exposure column
- Sorts by CLM USD value
- Generates HTML table

**formatTokenWithSymbol(amount, symbol, showSign)**
- Smart decimal formatting based on amount size
- Optionally adds '+' sign for positive values
- Returns formatted string (e.g., "+7.00 ETH")

### File Locations

**JavaScript:** `/Users/gui/Brave-Capture/dashboard.js`
- Lines 1210-1246: Token consolidation logic
- Lines 1342-1455: aggregateCLMTokens()
- Lines 1458-1540: aggregateHedgeTokens()
- Lines 1582-1641: renderTokenExposureTable()

**HTML:** `/Users/gui/Brave-Capture/dashboard.html`
- Lines 1037-1092: Token Exposure Card structure
- Lines 737-869: Table CSS styles

**Tests:** `/Users/gui/Brave-Capture/tests/test-token-exposure.js`
- 8 comprehensive tests (100% passing)

---

## Usage Examples

### Example 1: Checking Net Exposure

**Scenario:** You have SOL in CLM and a short hedge

```
Dashboard shows:
  SOL | $140.50 | $17,616 | 125.4 SOL | -200.00 SOL | -74.6 SOL
                                         ^^^^^^^^^^^   ^^^^^^^^^^^
                                         Short hedge   Net short!
```

**Interpretation:**
- You hold 125.4 SOL in CLM positions
- You're short 200 SOL in hedges
- Your net exposure is -74.6 SOL (more short than long)

**Action:** Consider adding more SOL longs or closing short hedge to balance exposure.

### Example 2: Identifying Concentration Risk

**Scenario:** Check your largest exposures

```
Table sorted by CLM USD:
1. USD  - $47,000 (largest holding)
2. SOL  - $18,000
3. ETH  - $12,000
4. BTC  - $9,000
```

**Interpretation:**
- Heavy stablecoin exposure (USD)
- Diversified across major tokens
- SOL, ETH, BTC positions are well-balanced

### Example 3: Monitoring Hedge Effectiveness

**Scenario:** You hedged your ETH exposure

```
Before:
  ETH | $3,000 | $30,000 | 10.00 ETH | -      | +10.00 ETH

After adding hedge:
  ETH | $3,000 | $30,000 | 10.00 ETH | -3.00 ETH | +7.00 ETH
                                       ^^^^^^^^^^ ^^^^^^^^^
                                       Short      Reduced
```

**Interpretation:**
- Original exposure: 10 ETH
- Added 3 ETH short hedge
- Net exposure reduced to 7 ETH (30% hedged)

---

## Configuration

### Adjust Cache Duration

Edit `dashboard.js` line 1262:

```javascript
if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
  //                                            ↑
  //                              Change to desired minutes
  //                              Example: 10 * 60 * 1000 = 10 minutes
```

### Add New Token Mappings

Edit `dashboard.js` lines 1098-1208:

```javascript
const COINGECKO_TOKEN_MAP = {
  // ... existing mappings ...
  'YOUR_TOKEN': 'coingecko-api-id',
};
```

**Finding CoinGecko IDs:**
1. Visit https://www.coingecko.com/
2. Search for token
3. Check URL: `https://www.coingecko.com/en/coins/[ID]`
4. Use `[ID]` in mapping

### Modify Token Consolidation

Edit `dashboard.js` lines 1222-1226:

```javascript
const TOKEN_GROUPS = {
  'BTC': ['BTC', 'WBTC', 'CBBTC', 'XBTC', 'RENBTC'],
  'ETH': ['ETH', 'WETH', 'WHETH', 'STETH', 'WSTETH', 'RETH', 'CBETH'],
  'USD': ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'GUSD', 'BUSD', 'TUSD', 'USDP', 'USDC.E'],
  // Add your custom groups here
};
```

---

## Troubleshooting

### Table Not Showing

**Check:**
1. Dashboard loaded successfully
2. Token Exposure card is present in HTML
3. JavaScript console for errors
4. `initTokenExposure()` is being called (line 253 in dashboard.js)

**Debug:**
```javascript
// Open browser console, check if functions exist:
typeof aggregateCLMTokens      // should be 'function'
typeof renderTokenExposureTable // should be 'function'
```

### Prices Showing "N/A"

**Causes:**
1. Token not in COINGECKO_TOKEN_MAP
2. CoinGecko API rate limit (free tier: 10-30 calls/minute)
3. Network error
4. Invalid CoinGecko ID

**Solutions:**
1. Add token mapping (see Configuration section)
2. Wait 1 minute, refresh dashboard
3. Check network connection
4. Verify CoinGecko ID is correct

**Debug:**
```javascript
// Test price fetching in browser console:
const prices = await fetchTokenPrices(['ETH', 'SOL', 'BTC']);
console.log(prices);
// Should show: { ETH: 3000, SOL: 140, BTC: 60000 }
```

### Net Exposure Calculation Wrong

**Check:**
1. Hedge positions loaded correctly
2. CLM positions loaded correctly
3. Token consolidation is working (WBTC → BTC, etc.)

**Debug:**
```javascript
// Check aggregation results:
const { tokens: clmTokens } = aggregateCLMTokens();
const hedgeTokens = aggregateHedgeTokens();

console.log('CLM Tokens:', clmTokens);
console.log('Hedge Tokens:', hedgeTokens);
```

### Sorting Not Working

**Expected:** Tokens sorted by CLM USD value (largest first)

**Check:**
1. CLM positions have valid `balance` values
2. No JavaScript errors in console

**Code Reference:** `dashboard.js` line 1635:
```javascript
rows.sort((a, b) => b.sortValue - a.sortValue);
```

---

## Testing

### Run Token Exposure Tests

```bash
npm run test:tokens
```

**Expected Output:**
```
✅ PASSED: Should extract all unique tokens from CLM positions
✅ PASSED: Should sum token values across multiple positions
✅ PASSED: Should estimate token values when data is missing
✅ PASSED: Should calculate net exposure (long - short) for hedge tokens
✅ PASSED: Should normalize wrapped token variants
✅ PASSED: Should have mappings for common tokens
✅ PASSED: Should show warning when >50% of data is estimated
✅ PASSED: Should format token amounts with appropriate decimal places

Test Summary: 8/8 PASSED (100%)
```

### Run All Tests

```bash
npm run test:all
```

**Expected:** 30/30 tests passing (100%)

---

## Version History

### v1.5.1 (November 17, 2025)

**Changes:**
- ✅ Replaced dual-tab interface with unified table
- ✅ Added Net Exposure column
- ✅ Fixed ETH consolidation (added whETH variant)
- ✅ Improved USD value display consistency
- ✅ Removed deprecated functions (switchTokenTab, renderCLMTokens, renderHedgeTokens)
- ✅ Added comprehensive inline code comments
- ✅ Sorted by CLM USD value

**Bug Fixes:**
- ETH exposure now includes whETH variant
- USD values rounded consistently

**Code Cleanup:**
- Removed ~200 lines of deprecated code
- Added JSDoc comments to all key functions
- Documented token consolidation logic

### v1.5.0 (November 16, 2025)

**Initial Release:**
- Token Exposure Card with dual-tab interface
- CLM and Hedge token aggregation
- CoinGecko price integration (60+ tokens)
- Smart data estimation
- 5-minute price cache

---

## Related Documentation

- **CHANGELOG-v1.5.1.md** - Complete release notes and bug fixes
- **TOKEN_EXPOSURE_FEATURE.md** - Original feature documentation (v1.5.0)
- **tests/README.md** - Test suite documentation
- **CHANGELOG-v1.5.0.md** - Initial Token Exposure release notes

---

## Support

**Issues or Questions:**
- GitHub: https://github.com/GuillaumeRacine/brave-capture-v2/issues
- Documentation: `/docs/TOKEN_EXPOSURE_v1.5.1.md` (this file)

**Quick Links:**
- Test Token Exposure: `npm run test:tokens`
- Test Everything: `npm run test:all`
- Validate Code: `node --check dashboard.js`

---

**Version:** 1.5.1
**Status:** ✅ Production Ready
**Test Results:** 8/8 tests passing (100%)
**Last Updated:** November 17, 2025

Thank you for using Brave Capture!
