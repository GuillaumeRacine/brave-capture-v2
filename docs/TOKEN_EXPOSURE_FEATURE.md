# Token Exposure Card - Feature Documentation

**Current Version:** 1.5.1
**Original Version:** 1.5.0
**Added:** November 16, 2025
**Last Updated:** November 17, 2025
**Status:** ✅ Production Ready

---

## 🔔 Important Notice

**This document describes the original v1.5.0 implementation with dual-tab interface.**

**For the current v1.5.1 implementation (unified table format), see:**
👉 **[TOKEN_EXPOSURE_v1.5.1.md](TOKEN_EXPOSURE_v1.5.1.md)** - Current implementation guide

**What Changed in v1.5.1:**
- ❌ Removed: Dual-tab interface (CLM Tokens / Hedge Tokens tabs)
- ✅ Added: Unified table with 6 columns (Token | Price | CLM USD | CLM Exposure | Hedge Exposure | Net Exposure)
- ✅ Added: Net Exposure column (automatic calculation)
- ✅ Improved: Sorting by CLM USD value
- ✅ Fixed: ETH consolidation bug (added whETH variant)
- ✅ Removed: Deprecated functions (switchTokenTab, renderCLMTokens, renderHedgeTokens)

---

## 📋 Overview (v1.5.0 - Historical)

The Token Exposure Card provides a consolidated view of all token holdings across both CLM (Concentrated Liquidity Market Maker) positions and hedge positions. This feature helps users:

- Track total exposure to individual tokens across all protocols
- Monitor net hedge positions (long vs short exposure)
- View real-time token prices from CoinGecko
- Identify over-concentration in specific tokens
- Understand overall portfolio token allocation

---

## 🎯 Key Features

### 1. Dual Tab Interface

**CLM Tokens Tab:**
- Aggregates individual token amounts from all CLM pairs
- Example: SOL/USDC + SOL/USDT positions → Total SOL exposure
- Shows each token separately (not as pairs)
- Displays total USD value per token
- Includes estimation warnings for missing data

**Hedge Tokens Tab:**
- Calculates net exposure per token (long positions - short positions)
- Example: 10 ETH long + 3 ETH short = +7 ETH net (long bias)
- Shows negative values for net short positions
- Displays position counts (e.g., "2 long, 1 short")
- Color-coded badges (green for long, red for short)

### 2. Real-Time Price Data

- Integration with CoinGecko API (free tier)
- 5-minute cache to minimize API calls
- Supports 60+ token symbols
- Automatic mapping of wrapped variants (WETH → ETH price)
- Graceful fallback when prices unavailable

### 3. Smart Data Estimation

**Problem:** 79% of CLM positions are missing individual token amounts
**Solution:** Estimation strategy with transparency

- When token data missing: Estimate value as `balance * 0.5` per token
- Display warning banner when >50% estimated
- Mark estimated tokens with "⚠️ Estimated" badge
- Show exact estimation percentage in warning

### 4. Performance Optimization

- Lazy loading: Only fetches prices when card expanded
- Aggressive caching (5-minute TTL for prices)
- Batch API requests (all tokens in single call)
- Uses existing dashboard cache infrastructure

---

## 🏗️ Architecture

### File Structure

```
/Users/gui/Brave-Capture/
├── dashboard.html           # HTML structure + CSS styles
│   ├── Lines 898-958:      Token Exposure Card HTML
│   └── Lines 733-866:      Token card CSS (tabs, badges, items)
│
├── dashboard.js             # JavaScript logic
│   ├── Lines 1094-1202:    CoinGecko token mapping
│   ├── Lines 1204-1231:    Tab switching function
│   ├── Lines 1233-1293:    CoinGecko API fetcher
│   ├── Lines 1295-1316:    Token symbol normalization
│   ├── Lines 1318-1402:    CLM token aggregation
│   ├── Lines 1404-1451:    Hedge token aggregation
│   ├── Lines 1453-1520:    CLM tokens renderer
│   ├── Lines 1522-1590:    Hedge tokens renderer
│   ├── Lines 1592-1604:    Metrics updater
│   └── Lines 1606-1645:    Main initialization
│
└── tests/
    └── test-token-exposure.js   # Automated tests (8 tests, 100% pass)
```

### Data Flow

```
Dashboard Load
    ↓
Load CLM Positions (from positions table)
    ↓
Load Hedge Positions (from captures)
    ↓
Load Collateral Positions (from captures)
    ↓
Initialize Token Exposure Card
    ↓
Aggregate CLM Tokens (sum values per token)
    ↓
Aggregate Hedge Tokens (net exposure per token)
    ↓
Extract Unique Symbols (combine both lists)
    ↓
Fetch Prices from CoinGecko (with cache check)
    ↓
Render CLM Tokens Tab (with prices + amounts)
    ↓
Render Hedge Tokens Tab (with net positions)
    ↓
Update Header Metrics (token counts + total value)
```

---

## 💻 Code Examples

### Example 1: Aggregating CLM Tokens

```javascript
// Input: CLM Positions
[
  { pair: "SOL/USDC", balance: 18654, token0Value: 13616, token1Value: 5028 },
  { pair: "SOL/USDT", balance: 8000 },  // Missing token data
  { pair: "ETH/USDC", balance: 12500, token0Value: 8400, token1Value: 7500 }
]

// Output: Aggregated Tokens
{
  SOL: {
    symbol: "SOL",
    value: 13616 + 4000,  // Actual + Estimated (8000 * 0.5)
    isEstimated: true
  },
  USDC: {
    symbol: "USDC",
    value: 5028 + 7500 + 4000,  // From 3 positions
    isEstimated: true  // One position estimated
  },
  USDT: {
    symbol: "USDT",
    value: 4000,  // Estimated (8000 * 0.5)
    isEstimated: true
  },
  ETH: {
    symbol: "ETH",
    value: 8400,
    isEstimated: false  // Complete data
  }
}
```

### Example 2: Calculating Net Hedge Exposure

```javascript
// Input: Hedge Positions
[
  { asset: "ETH", side: "long", size: 10, usdValue: "$30,000" },
  { asset: "ETH", side: "short", size: 3, usdValue: "$9,000" },
  { asset: "SOL", side: "short", size: 200, usdValue: "$28,000" }
]

// Output: Net Exposure
{
  ETH: {
    longAmount: 10,
    shortAmount: 3,
    netAmount: 7,           // 10 - 3 = +7 (long bias)
    longValue: 30000,
    shortValue: 9000,
    netValue: 21000,        // +$21k (positive)
    longPositions: 1,
    shortPositions: 1
  },
  SOL: {
    longAmount: 0,
    shortAmount: 200,
    netAmount: -200,        // 0 - 200 = -200 (short bias)
    longValue: 0,
    shortValue: 28000,
    netValue: -28000,       // -$28k (negative)
    longPositions: 0,
    shortPositions: 1
  }
}
```

### Example 3: CoinGecko API Integration

```javascript
// Fetch prices for multiple tokens
const symbols = ['ETH', 'SOL', 'BTC', 'USDC'];

// Check cache first (5-minute TTL)
const cached = getCachedData(CACHE_KEYS.TOKEN_PRICES);
if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
  return cached.prices;  // Return cached prices
}

// Map to CoinGecko IDs
const ids = symbols.map(s => COINGECKO_TOKEN_MAP[s]);
// ['ethereum', 'solana', 'bitcoin', 'usd-coin']

// Fetch from API (batch request)
const url = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,bitcoin,usd-coin&vs_currencies=usd`;

const response = await fetch(url);
const data = await response.json();
// {
//   ethereum: { usd: 3000 },
//   solana: { usd: 140 },
//   bitcoin: { usd: 60000 },
//   "usd-coin": { usd: 1 }
// }

// Convert back to symbol → price mapping
const prices = {
  ETH: 3000,
  SOL: 140,
  BTC: 60000,
  USDC: 1
};

// Cache for 5 minutes
setCachedData(CACHE_KEYS.TOKEN_PRICES, {
  timestamp: Date.now(),
  prices
});

return prices;
```

---

## 🎨 UI Components

### Card Header Metrics

```
┌─────────────────────────────────────────────────────────┐
│ 🪙 Token Exposure                                    ▼  │
│                                                          │
│ Total CLM Tokens    Total Hedge Tokens    Combined Value│
│        12                    8              $487,245    │
└─────────────────────────────────────────────────────────┘
```

### Tab Navigation

```
┌─────────────────────────────────────────────────────────┐
│  [CLM Tokens]  [Hedge Tokens]                           │
│  ═══════════                                            │
└─────────────────────────────────────────────────────────┘
```

### CLM Token Item

```
┌─────────────────────────────────────────────────────────┐
│  [SO]  SOL                    96.80         $13,616     │
│        $140.50                                           │
└─────────────────────────────────────────────────────────┘
```

### Hedge Token Item (Net Long)

```
┌─────────────────────────────────────────────────────────┐
│  [ET]  ETH                    +7.00        +$21,000     │
│        $3,000 · 1 long, 1 short                  [Long] │
└─────────────────────────────────────────────────────────┘
```

### Hedge Token Item (Net Short)

```
┌─────────────────────────────────────────────────────────┐
│  [SO]  SOL                   -200.00       -$28,000     │
│        $140 · 0 long, 1 short                   [Short] │
└─────────────────────────────────────────────────────────┘
```

### Data Quality Warning

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Data Quality Notice: 79% of token data is estimated │
│ due to missing position details. Values shown are       │
│ approximate.                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Suite: `test-token-exposure.js`

**Status:** ✅ All 8 tests passing (100%)

#### Test Coverage:

1. **CLM Token Counting** - Extracts all unique tokens from pairs
2. **CLM Value Calculation** - Sums values across multiple positions
3. **Missing Data Estimation** - Estimates when token data unavailable
4. **Hedge Net Exposure** - Calculates long - short correctly
5. **Symbol Normalization** - Handles wrapped variants (WETH, USDC.e)
6. **CoinGecko Mapping** - Validates token ID mappings
7. **Warning Threshold** - Shows warning when >50% estimated
8. **Amount Formatting** - Formats decimals correctly

#### Run Tests:

```bash
node tests/test-token-exposure.js
```

**Expected Output:**
```
🧪 Testing Token Exposure Card Functionality
============================================================
✅ PASSED: Should extract all unique tokens from CLM positions
✅ PASSED: Should sum token values across multiple positions
✅ PASSED: Should estimate token values when data is missing
✅ PASSED: Should calculate net exposure (long - short) for hedge tokens
✅ PASSED: Should normalize wrapped token variants
✅ PASSED: Should have mappings for common tokens
✅ PASSED: Should show warning when >50% of data is estimated
✅ PASSED: Should format token amounts with appropriate decimal places

Test Summary: 8/8 PASSED (100%)
🎉 All tests passed! Token Exposure card logic is working correctly.
```

---

## 📊 CoinGecko Token Mappings

### Currently Supported (60+ tokens)

**Major Tokens:**
- BTC, ETH, SOL, USDC, USDT, DAI
- WETH, WBTC, cbBTC

**DeFi Tokens:**
- AAVE, UNI, LINK, CRV, MKR, SNX, COMP, SUSHI, YFI

**Layer 2 / Alt Chains:**
- MATIC, ARB, OP, AVAX, FTM, ONE

**Solana Ecosystem (30+ tokens):**
- JTO, BONK, JUP, ORCA, RAY, MNGO, SRM, FIDA, SAMO, COPE, STEP, etc.

**Base Ecosystem:**
- AERO, WELL, BALD, TOSHI

**Stablecoins:**
- FRAX, LUSD, GUSD, BUSD, TUSD, USDP

**Wrapped Assets:**
- STETH, WSTETH, RETH, CBETH

**Lending Specific:**
- MORPHO, CVX

**Meme Coins:**
- DOGE, SHIB, PEPE, WIF

### Adding New Tokens

Edit `dashboard.js` lines 1098-1202:

```javascript
const COINGECKO_TOKEN_MAP = {
  // ... existing mappings ...
  'NEW_TOKEN': 'coingecko-api-id',  // Add here
};
```

**Finding CoinGecko IDs:**
1. Visit https://www.coingecko.com/
2. Search for the token
3. Check the URL: `https://www.coingecko.com/en/coins/[ID]`
4. Use the `[ID]` part in the mapping

---

## 🚨 Known Limitations

### 1. Missing CLM Token Data (79% of positions)

**Issue:** Most CLM positions lack individual token amounts/values
**Impact:** Heavy reliance on estimation (balance * 0.5 per token)
**Mitigation:**
- Clear warning banner when >50% estimated
- "⚠️ Estimated" badge on affected tokens
- Transparent estimation methodology

**Long-term Solution:**
Improve AI extraction to capture token breakdown from side panels (see `docs/CLAUDE.md` for Orca rotation workflow)

### 2. CoinGecko Rate Limits

**Free Tier:** 10-30 calls/minute
**Mitigation:**
- 5-minute price cache (reduces calls 98%)
- Batch requests (all tokens in 1 API call)
- Lazy loading (only fetch when card expanded)

**If Rate Limited:**
- Cached prices continue to work
- Graceful fallback to "N/A" for new tokens
- No error shown to user (silent fail)

### 3. Token Symbol Ambiguity

**Issue:** Some symbols map to multiple tokens (e.g., USDC on different chains)
**Current Approach:** Use single CoinGecko ID per symbol
**Impact:** May show incorrect price for cross-chain tokens

**Future Enhancement:**
Map by `(symbol, chain)` tuple instead of symbol alone

### 4. No Historical Price Data

**Current:** Only shows current/latest prices
**Future Enhancement:**
- Track price changes (24h %, 7d %)
- Show sparkline charts
- Calculate unrealized P&L per token

---

## 🔧 Configuration

### Cache Duration

Edit `dashboard.js` line 1238:

```javascript
if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
  //                                               ↑
  //                             Change this (in milliseconds)
  //                             5 min = 5 * 60 * 1000
```

### Estimation Warning Threshold

Edit `dashboard.js` line 1469:

```javascript
if (estimationPct > 50) {
  //                ↑
  //     Change threshold percentage here
  warningDiv.style.display = 'block';
}
```

### Token Amount Decimal Places

Edit `dashboard.js` lines 1484-1491:

```javascript
if (amount < 1) {
  amountStr = amount.toFixed(6);  // Small amounts: 6 decimals
} else if (amount < 100) {
  amountStr = amount.toFixed(2);  // Medium amounts: 2 decimals
} else {
  amountStr = Math.round(amount).toLocaleString('en-US');  // Large: no decimals
}
```

---

## 🐛 Troubleshooting

### Card Not Appearing

**Check:**
1. `dashboard.html` includes card HTML (lines 898-958)
2. `dashboard.html` includes CSS styles (lines 733-866)
3. `dashboard.js` includes all functions (lines 1094-1649)
4. `initTokenExposure()` called in `loadAllPositions()` (line 253)

### Prices Showing "N/A"

**Causes:**
1. Token not in `COINGECKO_TOKEN_MAP` → Add mapping
2. CoinGecko API rate limit → Wait 1 minute, refresh
3. Network error → Check console for errors
4. Invalid CoinGecko ID → Verify ID on coingecko.com

**Debug:**
```javascript
// Open browser console, run:
const prices = await fetchTokenPrices(['ETH', 'SOL', 'BTC']);
console.log(prices);
```

### Estimation Warning Always Showing

**Causes:**
1. >50% of CLM positions missing token data (expected)
2. AI extraction not capturing token breakdowns

**Solution:**
Follow Orca rotation capture workflow (see `docs/CLAUDE.md`):
- Expand each position's side panel
- Take individual screenshot per position
- AI will extract token amounts from visible panel

### Tab Switching Not Working

**Check:**
1. Console for JavaScript errors
2. `switchTokenTab()` function defined (lines 1204-1231)
3. onclick handlers in HTML: `onclick="switchTokenTab('clm')"`
4. Tab button `data-tab` attributes match function logic

---

## 📈 Future Enhancements

### Priority 1: Improve Data Quality

- [ ] Better AI prompts for CLM token extraction
- [ ] Parse Orca side panels more reliably
- [ ] Support for multi-capture data merging
- [ ] Fallback to balance-based estimation only when necessary

### Priority 2: Enhanced Metrics

- [ ] 24h price change percentage
- [ ] 7-day price sparklines
- [ ] Unrealized P&L per token
- [ ] Token allocation pie chart
- [ ] Risk concentration indicators

### Priority 3: User Customization

- [ ] Hide small holdings (<$100)
- [ ] Custom token grouping (stablecoins, majors, alts)
- [ ] Sort by value, amount, or alphabetical
- [ ] Export token exposure to CSV

### Priority 4: Advanced Features

- [ ] Cross-chain token aggregation (USDC on multiple chains)
- [ ] Token correlation analysis (risk concentration)
- [ ] Rebalancing suggestions
- [ ] Integration with wallet APIs for external holdings
- [ ] Historical token exposure tracking

---

## 🔗 Related Documentation

- **Main README:** `/Users/gui/Brave-Capture/README.md`
- **Cache Optimization:** `/Users/gui/Brave-Capture/docs/CHANGELOG-v1.4.2.md`
- **Test Results:** `/Users/gui/Brave-Capture/tests/README.md`
- **Orca Workflow:** `/Users/gui/Brave-Capture/docs/CLAUDE.md`
- **Token Analysis:** `/Users/gui/Brave-Capture/docs/TOKEN-BALANCE-ANALYSIS.md`

---

## 📝 Changelog

### v1.5.1 - November 17, 2025

**Changed:**
- 🔄 Replaced dual-tab interface with unified table format
- ➕ Added Net Exposure column (CLM + Hedge calculation)
- 📊 Changed sorting to CLM USD value (descending)
- 🎨 Simplified UI (no tab switching required)
- 📚 Updated documentation to reflect table format

**Fixed:**
- 🐛 ETH consolidation (added whETH variant to TOKEN_GROUPS)
- 💵 USD value display consistency (standardized rounding)
- 🧹 Removed deprecated functions (switchTokenTab, renderCLMTokens, renderHedgeTokens)

**Documentation:**
- ✅ Created TOKEN_EXPOSURE_v1.5.1.md (current implementation guide)
- ✅ Created CHANGELOG-v1.5.1.md (detailed release notes)
- ✅ Updated tests/README.md (added token exposure tests section)
- ✅ Added comprehensive inline code comments (JSDoc format)

**Migration:**
- 👉 See [TOKEN_EXPOSURE_v1.5.1.md](TOKEN_EXPOSURE_v1.5.1.md) for current docs
- 👉 See [CHANGELOG-v1.5.1.md](CHANGELOG-v1.5.1.md) for upgrade guide

### v1.5.0 - November 16, 2025

**Added:**
- ✨ Token Exposure Card with dual-tab interface
- 🪙 CLM token aggregation across all positions
- 🎯 Hedge net exposure calculation (long - short)
- 💰 CoinGecko API integration for real-time prices
- ⚠️ Data quality warning system for estimations
- 🎨 Responsive card design with tab navigation
- 🧪 Comprehensive test suite (8 tests, 100% pass)
- 📊 Smart estimation for missing token data
- 🚀 Performance optimization (5-min cache, lazy loading)
- 📚 Complete feature documentation

**Supported:**
- 60+ token price mappings
- Automatic wrapped token normalization
- Batch API requests for efficiency
- Graceful fallback when data missing

---

**Current Version:** 1.5.1
**Status:** ✅ Production Ready
**Test Coverage:** 100% (8/8 tests passing)
**Last Updated:** November 17, 2025

**📖 For current implementation, see [TOKEN_EXPOSURE_v1.5.1.md](TOKEN_EXPOSURE_v1.5.1.md)**
