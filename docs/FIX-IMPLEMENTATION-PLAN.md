# Token Balance Fix - Implementation Plan

**Priority**: HIGH
**Estimated Time**: 4-6 hours for Phase 1
**Success Metric**: >90% of positions have complete token data

---

## Phase 1: Quick Win - Batch AI Vision Extraction (RECOMMENDED)

### Overview
Add a post-capture batch processing feature that automatically extracts missing token data using AI Vision without requiring users to manually expand each position.

### Implementation Steps

#### 1. Add Batch Extraction UI to Popup (1 hour)

**File**: `/Users/gui/Brave-Capture/popup.js`

**Add after line 241** (after `checkForMissingBalances(capture)`):

```javascript
// Show batch extraction button if multiple positions missing data
showBatchExtractionButton(capture);
```

**New function**:
```javascript
function showBatchExtractionButton(capture) {
  const positions = capture.data?.content?.clmPositions?.positions || [];
  const missingPositions = positions.filter(pos =>
    pos.token0Amount === null || pos.token1Amount === null
  );

  if (missingPositions.length > 1) {
    // Show prominent button in popup
    const statusDiv = document.getElementById('status');
    const batchBtn = document.createElement('button');
    batchBtn.id = 'batchExtractBtn';
    batchBtn.className = 'batch-extract-button';
    batchBtn.textContent = `Extract Token Data for ${missingPositions.length} Positions`;
    batchBtn.onclick = () => startBatchExtraction(capture, missingPositions);

    statusDiv.insertBefore(batchBtn, statusDiv.firstChild);
  }
}

async function startBatchExtraction(capture, missingPositions) {
  const btn = document.getElementById('batchExtractBtn');
  btn.disabled = true;
  btn.textContent = 'Extracting...';

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < missingPositions.length; i++) {
    const position = missingPositions[i];
    btn.textContent = `Extracting ${i + 1}/${missingPositions.length}: ${position.pair}`;

    try {
      // Send message to content script to expand this position
      await chrome.tabs.sendMessage(tab.id, {
        action: 'expandPosition',
        pair: position.pair
      });

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Take screenshot
      const screenshot = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });

      // Extract via AI Vision
      const result = await chrome.runtime.sendMessage({
        action: 'extractBalanceFromScreenshot',
        screenshot: screenshot,
        captureTimestamp: capture.timestamp,
        allPositions: [position] // Only this position
      });

      if (result.success) {
        successCount++;
        console.log(`✅ Extracted ${position.pair}`);
      } else {
        failCount++;
        console.error(`❌ Failed ${position.pair}:`, result.error);
      }

      // Close the drawer
      await chrome.tabs.sendMessage(tab.id, {
        action: 'closeDrawer'
      });

      // Small delay between positions
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      failCount++;
      console.error(`❌ Error extracting ${position.pair}:`, error);
    }
  }

  // Show results
  btn.textContent = `Complete: ${successCount} extracted, ${failCount} failed`;
  btn.disabled = false;

  // Reload dashboard
  setTimeout(() => {
    btn.textContent = `Extract Token Data`;
  }, 3000);
}
```

#### 2. Add Position Expansion Logic to Content Script (1 hour)

**File**: `/Users/gui/Brave-Capture/content.js`

**Add message handler** (after existing message listener, around line 58):

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ... existing handlers ...

  if (request.action === 'expandPosition') {
    expandPosition(request.pair).then(success => {
      sendResponse({ success });
    });
    return true;
  }

  if (request.action === 'closeDrawer') {
    closeDrawer().then(success => {
      sendResponse({ success });
    });
    return true;
  }
});

async function expandPosition(pair) {
  console.log(`🔍 Expanding position: ${pair}`);

  // Protocol-specific expansion logic
  const hostname = window.location.hostname;

  if (hostname.includes('orca.so')) {
    return expandOrcaPosition(pair);
  } else if (hostname.includes('pancakeswap.finance')) {
    return expandPancakeSwapPosition(pair);
  } else if (hostname.includes('cetus.zone')) {
    return expandCetusPosition(pair);
  } else if (hostname.includes('uniswap')) {
    return expandUniswapPosition(pair);
  } else if (hostname.includes('raydium.io')) {
    return expandRaydiumPosition(pair);
  } else if (hostname.includes('ekubo')) {
    return expandEkuboPosition(pair);
  }

  return false;
}

async function expandOrcaPosition(pair) {
  // Find the position row by searching for the pair text
  const allRows = document.querySelectorAll('table tbody tr, [role="row"]');

  for (const row of allRows) {
    const rowText = row.innerText || row.textContent;
    if (rowText.includes(pair.replace('/', ' / '))) {
      // Click the row to expand
      row.click();
      console.log(`✅ Clicked on ${pair} position`);
      return true;
    }
  }

  console.warn(`⚠️ Could not find row for ${pair}`);
  return false;
}

async function expandPancakeSwapPosition(pair) {
  // PancakeSwap positions link to detail pages
  // Find and click the position link
  const links = document.querySelectorAll('a[href*="/liquidity/"]');

  for (const link of links) {
    const linkText = link.innerText || link.textContent;
    if (linkText.includes(pair.replace('/', '-')) || linkText.includes(pair)) {
      // Store current URL to return later
      window._returnUrl = window.location.href;

      // Navigate to detail page
      link.click();

      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  }

  return false;
}

async function expandCetusPosition(pair) {
  // Similar to Orca - click on position row
  const allRows = document.querySelectorAll('[class*="position"], [class*="row"]');

  for (const row of allRows) {
    const rowText = row.innerText || row.textContent;
    if (rowText.includes(pair)) {
      row.click();
      return true;
    }
  }

  return false;
}

async function expandUniswapPosition(pair) {
  // Uniswap shows token breakdown by default in position detail
  // Just need to click into the position
  const links = document.querySelectorAll('a[href*="/pool/"]');

  for (const link of links) {
    const linkText = link.innerText || link.textContent;
    if (linkText.includes(pair)) {
      window._returnUrl = window.location.href;
      link.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
  }

  return false;
}

async function expandRaydiumPosition(pair) {
  // Similar to Orca
  const allRows = document.querySelectorAll('[class*="position"], table tbody tr');

  for (const row of allRows) {
    const rowText = row.innerText || row.textContent;
    if (rowText.includes(pair)) {
      row.click();
      return true;
    }
  }

  return false;
}

async function expandEkuboPosition(pair) {
  // Ekubo-specific logic
  const allElements = document.querySelectorAll('[class*="position"], [class*="pool"]');

  for (const el of allElements) {
    const elText = el.innerText || el.textContent;
    if (elText.includes(pair)) {
      el.click();
      return true;
    }
  }

  return false;
}

async function closeDrawer() {
  console.log('🔍 Closing drawer/modal');

  // Check if we navigated to a detail page
  if (window._returnUrl) {
    window.location.href = window._returnUrl;
    delete window._returnUrl;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  // Try common close button selectors
  const closeSelectors = [
    '[aria-label="Close"]',
    'button[aria-label="Close"]',
    '.close-button',
    '[data-testid="close-button"]',
    'button:has(svg[class*="close"])',
    '[role="dialog"] button:first-of-type', // Often the X button
    '.modal-close',
    '.drawer-close'
  ];

  for (const selector of closeSelectors) {
    const closeBtn = document.querySelector(selector);
    if (closeBtn) {
      closeBtn.click();
      console.log(`✅ Clicked close button: ${selector}`);
      return true;
    }
  }

  // Try ESC key
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
  console.log('✅ Sent ESC key');
  return true;
}
```

#### 3. Add CSS for Batch Button (5 minutes)

**File**: `/Users/gui/Brave-Capture/popup.html`

Add to `<style>` section:

```css
.batch-extract-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.batch-extract-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.batch-extract-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### 4. Update AI Vision Prompt for Better Extraction (30 minutes)

**File**: `/Users/gui/Brave-Capture/background.js`

**Update prompt at line 483** to handle more protocols:

```javascript
const prompt = `You are analyzing a screenshot of a DeFi portfolio page (could be Orca, PancakeSwap, Cetus, Uniswap, Raydium, or similar).

Look for an EXPANDED position detail panel or drawer showing token balance breakdown. This could be:
- A right-side drawer (Orca style)
- A detail page (PancakeSwap style)
- An expanded row (Cetus style)
- A modal dialog

Extract the following data if visible:
1. Which token pair (e.g., "cbBTC/USDC", "SOL/USDC", "ETH/USDC")
2. Individual token amounts (e.g., "0.035 cbBTC", "6385 USDC")
3. Token percentages (e.g., "37%", "63%")
4. USD values per token (optional but helpful)

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

If NO position detail is visible, return:
{"error": "No position detail found"}

IMPORTANT:
- Ignore list/summary views - we need the DETAILED breakdown
- Token names should match exactly (including prefixes like "cb", "w", etc.)
- Percentages should add up to 100
- Amounts should be numeric values without commas

Example outputs:

Good (Orca expanded drawer):
{
  "pair": "cbBTC/USDC",
  "token0": "cbBTC",
  "token1": "USDC",
  "token0Amount": 0.035,
  "token1Amount": 6385,
  "token0Percentage": 37,
  "token1Percentage": 63
}

Good (PancakeSwap detail page):
{
  "pair": "SOL/USDC",
  "token0": "SOL",
  "token1": "USDC",
  "token0Amount": 45.23,
  "token1Amount": 4521.18,
  "token0Percentage": 49.8,
  "token1Percentage": 50.2
}`;
```

### Testing Phase 1

1. **Test on Orca** (largest dataset: 605 positions):
   ```
   - Navigate to https://www.orca.so/portfolio
   - Click "Capture Data"
   - Click "Extract Token Data for X Positions"
   - Verify positions are expanded one by one
   - Check database for updated token amounts
   ```

2. **Test on PancakeSwap** (0% coverage):
   ```
   - Navigate to positions page
   - Capture
   - Run batch extraction
   - Verify it clicks into detail pages
   - Verify extraction works
   ```

3. **Verify Database Updates**:
   ```bash
   node tests/verify-token-data.js
   ```
   - Should show >90% completion after batch extraction

### Rollout

1. Deploy to production
2. Add user documentation:
   - "After capturing, click 'Extract Token Data' to fill in missing amounts"
   - "This uses AI to analyze each position (takes ~2-3 seconds per position)"
3. Monitor extraction success rate via console logs

---

## Phase 2: Enhanced Protocol Parsers (FOLLOW-UP)

### Goal
Improve DOM parsing so most protocols extract token data on first capture, reducing need for AI Vision.

### Priority Order (by impact)

#### 1. Orca Improvements (605 positions, 28% → 80%+)

**Problem**: Only extracts when position manually expanded

**Solution**: After capturing list view, automatically expand each position briefly to extract token data

**File**: `/Users/gui/Brave-Capture/content.js:608`

**Implementation**:
```javascript
function captureOrcaCLMPositions() {
  console.log('Orca: Parsing CLM positions');

  // First, capture list view (current code)
  const positions = captureOrcaListView();

  // Then, enhance with expanded data
  return enhanceOrcaPositionsWithExpansion(positions);
}

async function enhanceOrcaPositionsWithExpansion(positions) {
  // For each position, briefly expand to get token breakdown
  for (const position of positions) {
    try {
      await expandOrcaPosition(position.pair);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for drawer

      const breakdown = extractExpandedOrcaPositions();
      const key = position.pair;

      if (breakdown.has(key)) {
        Object.assign(position, breakdown.get(key));
        console.log(`✅ Enhanced ${position.pair} with token breakdown`);
      }

      await closeDrawer();
      await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause
    } catch (error) {
      console.warn(`⚠️ Could not enhance ${position.pair}:`, error);
    }
  }

  return {
    summary: { /* ... */ },
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}
```

**Concern**: This adds 0.5-1s per position to capture time
- 6 positions = 3-6 seconds additional
- Acceptable tradeoff for complete data

#### 2. PancakeSwap Improvements (14 positions, 0% → 70%+)

**Problem**: Token breakdown only visible in detail pages

**Solution**: Parse detail pages more thoroughly

**File**: `/Users/gui/Brave-Capture/content.js:2339`

**Enhancement needed**: Lines 2339-2522 already parse detail pages, but `extractTokenBreakdown()` isn't finding the data. Need to:
1. Log the actual page HTML to see structure
2. Add PancakeSwap-specific extraction patterns
3. Look for common CSS classes/data attributes

**Action**: Test on actual PancakeSwap page, inspect HTML, update parser.

#### 3. Cetus Improvements (26 positions, 0% → 60%+)

**Problem**: Similar to Orca - needs position expansion

**Solution**: Same approach as Orca enhancement

#### 4. Hyperion Improvements (11 positions, 0% → 50%+)

**Problem**: Protocol doesn't expose token amounts easily

**Solution**:
1. Test if detail pages have the data
2. If not, rely on AI Vision (Phase 1)
3. Or calculate from price + balance (estimate)

#### 5. Ekubo Value Calculation (3 positions, 66% amounts → 100% complete)

**Problem**: Extracts token0Amount, token1Amount but not USD values

**Solution**: Use current price to calculate values:

```javascript
// After extracting amounts
if (position.token0Amount && position.currentPrice && position.balance) {
  // Assume currentPrice is token1 per token0
  const token0ValueInToken1Units = position.token0Amount * position.currentPrice;
  const totalInToken1Units = token0ValueInToken1Units + position.token1Amount;

  position.token0Percentage = (token0ValueInToken1Units / totalInToken1Units) * 100;
  position.token1Percentage = 100 - position.token0Percentage;

  position.token0Value = position.balance * (position.token0Percentage / 100);
  position.token1Value = position.balance * (position.token1Percentage / 100);
}
```

### Testing Phase 2

After each protocol improvement:
1. Clear local captures
2. Navigate to protocol
3. Capture fresh data
4. Run verification: `node tests/verify-token-data.js`
5. Check improvement in percentage

---

## Phase 3: Calculated Fallback (OPTIONAL)

### When to Use
If both DOM parsing AND AI Vision fail, calculate token split as last resort.

### Implementation

**File**: `/Users/gui/Brave-Capture/popup.js`

**After AI Vision fails**:
```javascript
if (position.token0Amount === null && position.currentPrice && position.balance) {
  // Calculate 50/50 split as estimate
  const token0Value = position.balance * 0.5;
  const token1Value = position.balance * 0.5;

  // Use currentPrice to derive amounts
  // This assumes price is token1 per token0
  position.token1Amount = token1Value; // Assuming token1 is the quote (USDC, USDT)
  position.token0Amount = token0Value / position.currentPrice;

  position.token0Value = token0Value;
  position.token1Value = token1Value;
  position.token0Percentage = 50;
  position.token1Percentage = 50;

  // Mark as estimated
  position._isEstimated = true;

  console.log(`ℹ️ Calculated fallback for ${position.pair} (ESTIMATED)`);
}
```

**Database Schema Addition**:
```sql
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT false;

COMMENT ON COLUMN positions.is_estimated IS 'True if token breakdown was calculated/estimated vs extracted';
```

**Dashboard Display**:
Show warning icon "⚠️" for estimated positions.

---

## Success Metrics

### Phase 1 (Batch AI Vision)
- **Target**: 90%+ positions with complete token data
- **Measure**: Run `node tests/verify-token-data.js` after batch extraction
- **Expected**:
  - Orca: 28% → 90%
  - PancakeSwap: 0% → 80%
  - Cetus: 0% → 75%
  - Others: Varies by UI structure

### Phase 2 (Enhanced Parsers)
- **Target**: 95%+ with automatic extraction (no AI Vision needed)
- **Measure**: Capture fresh, don't run batch extraction, check completion
- **Expected**:
  - Orca: 90%+ automatic
  - Uniswap: maintain 71%+
  - Others: 60-80% automatic

### Phase 3 (Calculated Fallback)
- **Target**: 100% with "estimated" flag for <5%
- **Measure**: Zero NULL token amounts in database
- **Expected**: All positions have data, <5% marked estimated

---

## API Cost Estimates

### AI Vision API Costs (Anthropic Claude)

**Current pricing** (Claude Opus):
- $15 per 1M input tokens
- Image: ~1000 tokens
- Prompt: ~400 tokens
- Total per call: ~1400 tokens input, ~100 tokens output
- **Cost per extraction**: ~$0.02

**Batch extraction cost**:
- 500 positions × $0.02 = **$10.00 one-time**
- Future captures: Only new positions (5-10 per day)
- **Monthly cost**: ~$3-6

**Optimization**: Use cheaper model (Haiku) for simpler cases:
- Claude Haiku: $0.25 per 1M input tokens
- **Cost per extraction**: ~$0.0004
- 500 positions × $0.0004 = **$0.20 one-time**
- **Monthly cost**: ~$0.06

**Recommendation**: Start with Opus for accuracy, switch to Haiku after validating it works.

---

## Timeline

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Batch extraction UI | 1h | HIGH |
| 1 | Position expansion logic | 1h | HIGH |
| 1 | CSS styling | 0.5h | HIGH |
| 1 | Enhanced AI prompt | 0.5h | HIGH |
| 1 | Testing & debugging | 1h | HIGH |
| **1** | **TOTAL PHASE 1** | **4h** | **HIGH** |
| 2 | Orca parser enhancement | 1h | MEDIUM |
| 2 | PancakeSwap parser | 1h | MEDIUM |
| 2 | Cetus parser | 1h | MEDIUM |
| 2 | Ekubo value calculation | 0.5h | MEDIUM |
| 2 | Testing all protocols | 1h | MEDIUM |
| **2** | **TOTAL PHASE 2** | **4.5h** | **MEDIUM** |
| 3 | Calculated fallback | 1h | LOW |
| 3 | Database schema update | 0.5h | LOW |
| 3 | Dashboard UI update | 0.5h | LOW |
| **3** | **TOTAL PHASE 3** | **2h** | **LOW** |

**Total time**: 10.5 hours across all phases
**Recommended start**: Phase 1 only (4 hours) for immediate 90%+ coverage

---

## Next Steps

1. ✅ Review this implementation plan
2. ⬜ Start Phase 1 implementation
3. ⬜ Test on Orca (largest dataset)
4. ⬜ Test on other protocols
5. ⬜ Deploy batch extraction feature
6. ⬜ Monitor extraction success rate
7. ⬜ Proceed to Phase 2 if needed

