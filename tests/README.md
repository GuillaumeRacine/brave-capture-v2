# Test Suite for Brave Capture

## Overview

This directory contains automated tests for the Brave Capture extension, with a focus on the Batch AI Vision Token Extraction feature.

## Test Files

### test-batch-extraction.js

Comprehensive test suite for batch extraction functionality.

**Tests included:**
1. Protocol detection
2. Position discovery on page
3. Position expansion (drawer opening)
4. Token data visibility
5. Drawer closing
6. Screenshot capability

**Usage:**

1. Load the extension in Chrome
2. Navigate to Orca positions page: https://www.orca.so/positions
3. Open DevTools console (F12)
4. Copy and paste the test script into console
5. Run: `await testBatchExtraction()`

**Expected output:**
```
=== BATCH EXTRACTION TEST SUITE ===

Test 1: Protocol Detection
✅ Detected Orca page

Test 2: Position Discovery
Found 15 table rows
✅ Found 15 valid positions

Test 3: Position Expansion
Expanding position: SOL/USDC 0.30%
✅ Position drawer opened successfully

Test 4: Token Data in Drawer
✅ Drawer contains token breakdown data

Test 5: Close Drawer
✅ Drawer closed successfully

Test 6: Screenshot Capability
✅ Screenshot test requires extension context
   Manual verification: Open extension popup and check if screenshot button works

=== TEST RESULTS SUMMARY ===
✅ Passed: 6
   - Protocol detection (Orca)
   - Position discovery (15 positions)
   - Position expansion
   - Token data visibility
   - Drawer close
   - Screenshot capability (manual verification needed)

Pass Rate: 100.0% (6/6)
```

## Running Individual Tests

### Test Position Expansion

```javascript
// Test expanding the first position (index 0)
await testPositionExpansion(0)

// Test expanding the third position
await testPositionExpansion(2)
```

**Expected output:**
```
Testing expansion of position 0...
Position: SOL/USDC 0.30%
✅ Drawer opened
Drawer content preview: SOL/USDC 0.30% Position Details Balance 5.234 SOL...
```

### Test Drawer Close

```javascript
// Close currently open drawer
await testCloseDrawer()
```

**Expected output:**
```
Testing drawer close...
Clicking close button
✅ Drawer closed successfully
```

## Manual Testing Checklist

Use this checklist when testing manually:

### Pre-test Setup
- [ ] Extension loaded in Chrome
- [ ] Navigated to Orca positions page
- [ ] Logged in and positions visible
- [ ] DevTools console open

### Test Batch Extraction Button
- [ ] Click "Extract Token Data" button in popup
- [ ] Confirmation dialog shows:
  - [ ] Correct number of positions
  - [ ] Cost estimate displayed
  - [ ] Time estimate displayed
- [ ] Click OK to start
- [ ] Progress bar appears and updates
- [ ] Success/fail counts update in real-time
- [ ] Completion message shows final stats

### Test Position Expansion
- [ ] First position expands automatically
- [ ] Drawer opens on right side
- [ ] Drawer shows token breakdown
- [ ] Screenshot is taken (check timing)
- [ ] Drawer closes automatically
- [ ] Next position expands
- [ ] Process continues until complete

### Test Error Handling
- [ ] Close page mid-extraction - should stop gracefully
- [ ] Refresh page mid-extraction - should stop gracefully
- [ ] Network disconnect - should show error and continue
- [ ] Invalid position - should skip and continue

### Test Database Updates
- [ ] Open Supabase dashboard
- [ ] Check positions table
- [ ] Verify token0_amount populated
- [ ] Verify token1_amount populated
- [ ] Verify token0_percentage populated
- [ ] Verify token1_percentage populated
- [ ] Verify correct pair name matched

## Debugging Failed Tests

### Test 1 Failed: Protocol Detection

**Symptoms:**
```
❌ Test 1 failed: Not on a supported protocol page
```

**Solutions:**
- Make sure you're on orca.so or uniswap.org
- Check URL in address bar
- Try refreshing the page

### Test 2 Failed: Position Discovery

**Symptoms:**
```
❌ Test 2 failed: No position rows found
```

**Solutions:**
- Make sure you're on the positions page (not liquidity pools)
- Log in to your account
- Check if positions are visible in the UI
- Try scrolling down to load positions

### Test 3 Failed: Position Expansion

**Symptoms:**
```
❌ Test 3 failed: Drawer did not open
```

**Solutions:**
- Check if clicking the row manually opens drawer
- Increase wait time in test (slow computer/network)
- Check console for JavaScript errors
- Try a different position (index 1, 2, etc.)

### Test 4 Warning: Token data not visible

**Symptoms:**
```
⚠️ Warning: Drawer may not contain expected token data
```

**Solutions:**
- Check if drawer shows percentages (%)
- Check if drawer shows decimal numbers
- Verify this is a CLM position (not regular swap)
- Try expanding different positions

## Performance Testing

### Test Extraction Speed

```javascript
// Time a single position extraction
console.time('Single extraction');

// Expand position
await testPositionExpansion(0);

// Simulate screenshot + AI (add delays)
await new Promise(r => setTimeout(r, 1000)); // Screenshot
await new Promise(r => setTimeout(r, 500));  // AI processing

// Close
await testCloseDrawer();

console.timeEnd('Single extraction');
// Expected: 1500-2000ms
```

### Test Batch Performance

```javascript
// Test 10 positions
const start = Date.now();

for (let i = 0; i < 10; i++) {
  await testPositionExpansion(i);
  await new Promise(r => setTimeout(r, 1000));
  await testCloseDrawer();
  await new Promise(r => setTimeout(r, 300));
}

const duration = (Date.now() - start) / 1000;
console.log(`10 positions: ${duration}s (${(duration/10).toFixed(1)}s per position)`);
// Expected: 13-15 seconds total, 1.3-1.5s per position
```

## CI/CD Integration

Future: Integrate with automated testing tools

### Puppeteer Example

```javascript
// TODO: Add Puppeteer test
const puppeteer = require('puppeteer');

async function runBatchTest() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load extension
  // Navigate to Orca
  // Run tests
  // Capture results

  await browser.close();
}
```

### Jest Example

```javascript
// TODO: Add Jest test
describe('Batch Extraction', () => {
  test('should detect Orca protocol', () => {
    // Test logic
  });

  test('should find positions on page', () => {
    // Test logic
  });
});
```

## Coverage Goals

Target coverage:
- [ ] Protocol detection: 100%
- [ ] Position discovery: 100%
- [ ] Position expansion: 90%+
- [ ] Token extraction: 90%+
- [ ] Database saves: 95%+
- [ ] Error handling: 80%+

## Contributing Tests

When adding new features, please:

1. Add test cases to test-batch-extraction.js
2. Update this README
3. Test manually before committing
4. Document any edge cases
5. Add debugging tips for failures

## Test Data

### Sample Orca Position Data

```javascript
{
  pair: "SOL/USDC",
  protocol: "Orca",
  balance: 1234.56,
  token0: "SOL",
  token1: "USDC",
  token0Amount: 5.234,
  token1Amount: 1043.21,
  token0Percentage: 45.2,
  token1Percentage: 54.8
}
```

### Sample Uniswap Position Data

```javascript
{
  pair: "ETH/USDC",
  protocol: "Uniswap",
  balance: 5678.90,
  token0: "ETH",
  token1: "USDC",
  token0Amount: 1.234,
  token1Amount: 3456.78,
  token0Percentage: 52.1,
  token1Percentage: 47.9
}
```

## Known Issues

1. **Drawer animation timing** - Sometimes drawer closes too fast for screenshot
   - Workaround: Increase wait time from 800ms to 1000ms

2. **Multiple drawers** - If previous drawer didn't close, new one might not open
   - Workaround: Always verify drawer closed before next expansion

3. **Rate limiting** - Anthropic API has rate limits (50 req/min)
   - Workaround: Add delay between batches if needed

## Support

For test failures or questions:
1. Check console logs
2. Review this README
3. Try manual testing
4. Report issue with test output
