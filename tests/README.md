# Test Suite - Brave Capture v1.5.1

Automated test suite for position parsers, UI calculations, and token exposure aggregation.

---

## 🎯 Quick Start

### Run All Tests

```bash
npm run test:all
```

### Run Test Categories

```bash
# Parser tests (Hyperliquid, Aave, Price Slider)
npm run test:parsers

# Token exposure tests (aggregation, consolidation, formatting)
npm run test:tokens

# Vision flow tests
npm run test

# Database update tests
npm run test:db

# Integration tests
npm run test:integration
```

### Run Individual Tests

```bash
# Hyperliquid P&L and leverage extraction
node tests/test-hyperliquid-parser.js

# Aave deduplication logic
node tests/test-aave-deduplication.js

# Price slider calculations
node tests/test-price-slider.js

# Token exposure card functionality
node tests/test-token-exposure.js

# Token card bug fixes
node tests/test-token-card-fix.js
```

---

## ✅ Current Test Results

**Status:** ✅ **All tests passing** (30/30)

```
Test Suite                    Tests    Passed    Failed    Rate
────────────────────────────────────────────────────────────────
test-hyperliquid-parser.js      9        9         0      100%
test-aave-deduplication.js      5        5         0      100%
test-price-slider.js            8        8         0      100%
test-token-exposure.js          8        8         0      100%
────────────────────────────────────────────────────────────────
TOTAL                          30       30         0      100%
```

---

## 📊 Token Exposure Tests (v1.5.1)

The `test-token-exposure.js` suite validates the Token Exposure Card functionality:

### Test Coverage

1. **CLM Token Counting** - Extracts all unique tokens from pairs
2. **CLM Value Calculation** - Sums values across multiple positions
3. **Missing Data Estimation** - Estimates when token data unavailable (~79% of positions)
4. **Hedge Net Exposure** - Calculates long - short correctly
5. **Symbol Normalization** - Handles wrapped variants (WETH, USDC.e, etc.)
6. **CoinGecko Mapping** - Validates token ID mappings (60+ tokens)
7. **Warning Threshold** - Shows warning when >50% estimated
8. **Amount Formatting** - Formats decimals correctly (6, 4, 2, or 0 decimals based on size)

### Run Token Tests

```bash
npm run test:tokens
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

### What Gets Tested

**Token Consolidation:**
- WBTC, cbBTC, xBTC → BTC
- WETH, whETH, STETH → ETH
- USDC, USDT, DAI → USD (stablecoins)

**Net Exposure Calculation:**
```
Example:
  10 ETH long + 3 ETH short = +7 ETH net (long bias)
  0 SOL long + 200 SOL short = -200 SOL net (short bias)
```

**Estimation Logic:**
```
When token data is missing:
  SOL/USDC position with balance $8,000
  → Estimate: SOL = $4,000, USDC = $4,000 (50/50 split)
```

---

## 🧪 Test Files

### Parser Tests

**test-hyperliquid-parser.js** (9 tests)
- P&L extraction from Hyperliquid positions
- Leverage calculation
- Price parsing
- Position side detection

**test-aave-deduplication.js** (5 tests)
- Duplicate position detection
- Merge logic for Aave supplies/borrows
- Health factor calculations

**test-price-slider.js** (8 tests)
- Price range slider positioning
- Liquidation price calculations
- Health status determination (safe/warning/critical)

### Token Exposure Tests

**test-token-exposure.js** (8 tests)
- CLM token aggregation
- Hedge net exposure calculation
- Token consolidation (BTC, ETH, USD groups)
- CoinGecko mapping validation
- Formatting and display logic

**test-token-card-fix.js** (validation)
- ETH consolidation bug fix (whETH variant)
- USD value calculation fix
- Net Exposure column addition

---

## 📚 Test Documentation

For detailed test results and examples, see:
- [TOKEN_EXPOSURE_FEATURE.md](../docs/TOKEN_EXPOSURE_FEATURE.md) - Feature documentation with test results
- [CHANGELOG-v1.5.1.md](../docs/CHANGELOG-v1.5.1.md) - Bug fixes and improvements
- [TOKEN_EXPOSURE_v1.5.1.md](../docs/TOKEN_EXPOSURE_v1.5.1.md) - Current implementation guide

---

**Version:** 1.5.1
**Last Updated:** November 17, 2025
**Test Count:** 30 tests (100% passing)
