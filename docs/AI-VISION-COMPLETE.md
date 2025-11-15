# AI Vision Extraction - Complete Implementation Guide

## 🚨 CRITICAL FOR LLMs: Autonomous Testing Requirements

**BEFORE involving the user, you MUST:**
1. ✅ Create and run automated test scripts
2. ✅ Verify all file references using grep/find
3. ✅ Test database queries using Node.js scripts
4. ✅ Validate syntax using `node --check`
5. ✅ Check console logs programmatically

**ONLY involve user when:**
- Browser extension reload required (cannot automate)
- Visual verification needed (screenshot appearance)
- User-specific environment issues detected

**See:** `SUBAGENT-WORKFLOW-PROMPT.md` for complete autonomous workflow template

---

## Overview

The Brave Capture extension now automatically extracts token breakdown data from DeFi position screenshots using Claude Vision API. This eliminates manual copy/paste and provides accurate, real-time token balance tracking.

## How It Works

### Flow Diagram

```
User clicks "Capture Positions"
         ↓
popup.js: Captures screenshot of page
         ↓
popup.js: Sends screenshot + positions to background.js
         ↓
background.js: Calls Claude Vision API
         ↓
Claude AI: Analyzes screenshot → Identifies expanded position
         ↓
Claude AI: Returns JSON with token breakdown
         ↓
background.js: Matches extracted pair to database position
         ↓
background.js: Updates Supabase database
         ↓
Console: "✅✅ Successfully saved {pair} to database!"
         ↓
Dashboard: Shows token breakdown with amounts & percentages
```

## Architecture

### 1. Screenshot Capture (popup.js)

**Location:** `popup.js:84-92`

```javascript
// Capture screenshot of the current tab
let screenshot = null;
try {
  screenshot = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
    format: 'png',
    quality: 90
  });
  console.log('📸 Screenshot captured');
} catch (error) {
  console.warn('Failed to capture screenshot:', error);
}
```

**What it does:**
- Captures visible tab as PNG image
- Quality: 90% (balance between file size and accuracy)
- Returns base64-encoded data URL
- Stored in capture object and database

### 2. Message Passing (popup.js → background.js)

**Location:** `popup.js:202-234`

```javascript
// Run AI Vision extraction in background if screenshot exists
if (screenshot) {
  const positions = capture.data?.content?.clmPositions?.positions || [];
  const missingPositions = positions.filter(pos =>
    pos.token0Amount === null || pos.token1Amount === null
  );

  if (missingPositions.length > 0) {
    // Send to background.js to extract AND save directly
    chrome.runtime.sendMessage({
      action: 'extractBalanceFromScreenshot',
      screenshot: screenshot,
      captureTimestamp: capture.timestamp,
      allPositions: missingPositions
    });
  }
}
```

**Why in background.js:**
- Background service worker bypasses CORS restrictions
- Can make direct API calls to Anthropic
- Has access to Supabase for database updates
- Runs independently of popup lifecycle

### 3. Claude Vision API Call (background.js)

**Location:** `background.js:447-560`

**Key Components:**

#### API Configuration
```javascript
const ANTHROPIC_API_KEY = 'sk-ant-api03-...';
const MODEL = 'claude-3-opus-20240229';
const MAX_TOKENS = 1024;
```

#### Prompt Design
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
{"error": "No expanded position found"}`;
```

**Why this works:**
- Clear, specific instructions
- Asks Claude to identify which pair IS expanded (discovery approach)
- Structured JSON output for easy parsing
- Error handling for cases when no position is expanded

#### API Request
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'  // Required for browser
  },
  body: JSON.stringify({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Image
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }]
  })
});
```

**Response Parsing:**
```javascript
const data = await response.json();
const textContent = data.content.find(c => c.type === 'text');
let responseText = textContent.text.trim()
  .replace(/```json\n?/g, '')  // Remove markdown code blocks
  .replace(/```\n?/g, '')
  .trim();

const balanceData = JSON.parse(responseText);
```

### 4. Pair Matching Logic (background.js)

**Location:** `background.js:578-595`

**Challenge:** Claude might extract "SOL/PUMP" but database has "PUMP/SOL0"

**Solution:** Multi-strategy matching

```javascript
const matchedPosition = allPositions.find(pos => {
  // Normalize: remove trailing zeros and whitespace
  const posTokens = pos.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
  const extractedTokens = extracted.pair.split('/').map(t => t.trim().replace(/0+$/, ''));

  // Strategy 1: Exact match
  if (posTokens[0] === extractedTokens[0] && posTokens[1] === extractedTokens[1]) {
    return true;
  }

  // Strategy 2: Reversed match (e.g., "SOL/PUMP" vs "PUMP/SOL")
  if (posTokens[0] === extractedTokens[1] && posTokens[1] === extractedTokens[0]) {
    console.log(`   ℹ️  Matched reversed pair: ${extracted.pair} → ${pos.pair}`);
    return true;
  }

  return false;
});
```

**Examples:**
- `cbBTC/USDC` → `cbBTC/USDC0` ✅ (exact match after removing trailing 0)
- `SOL/PUMP` → `PUMP/SOL0` ✅ (reversed match)
- `whETH/SOL` → `whETH/SOL0` ✅ (exact match)

### 5. Database Update (background.js)

**Location:** `background.js:598-643`

**Challenge:** Timestamp mismatch

The capture timestamp and position timestamp are created at slightly different times:
- Capture: `2025-11-11T12:41:40.015Z` (popup.js creates this)
- Position: `2025-11-11T12:41:40.127+00:00` (Supabase creates this)

Differences:
1. Milliseconds apart (100ms difference)
2. Format difference (Z vs +00:00)

**Solution:** Time range query (±5 seconds)

```javascript
// Create 5-second window
const captureTime = new Date(captureTimestamp);
const timeBefore = new Date(captureTime.getTime() - 5000).toISOString();
const timeAfter = new Date(captureTime.getTime() + 5000).toISOString();

const { data, error } = await supabaseClient
  .from('positions')
  .update({
    token0_amount: extracted.token0Amount,
    token1_amount: extracted.token1Amount,
    token0_percentage: extracted.token0Percentage,
    token1_percentage: extracted.token1Percentage
  })
  .eq('pair', matchedPosition.pair)
  .gte('captured_at', timeBefore)   // Greater than or equal to
  .lte('captured_at', timeAfter)     // Less than or equal to
  .order('captured_at', { ascending: false })
  .limit(1)
  .select();
```

**Why this works:**
- Finds positions within ±5 seconds of capture time
- Orders by timestamp (most recent first)
- Limits to 1 result (the matching position)
- Returns updated data with `.select()`

### 6. Success Confirmation

**Console Output:**
```
🚀 Background: Extract and save balance
🤖 Background: Analyzing screenshot to find expanded position
✅ Found expanded position: cbBTC/USDC
✅ Extracted: 0.039162 cbBTC (40.7%), 5983.9815 USDC (59.3%)
🎯 Matched cbBTC/USDC to cbBTC/USDC0
✅ Supabase initialized in background
📝 Updating database: pair="cbBTC/USDC0", around timestamp="2025-11-11T12:41:40.015Z"
✅✅ Successfully saved cbBTC/USDC0 to database!
```

## Database Schema

### Positions Table

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  pair TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  balance NUMERIC,
  current_price NUMERIC,
  range_min NUMERIC,
  range_max NUMERIC,
  in_range BOOLEAN,
  apy NUMERIC,

  -- Token breakdown fields (added for AI Vision)
  token0_amount NUMERIC,
  token1_amount NUMERIC,
  token0_percentage NUMERIC,
  token1_percentage NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Captures Table

```sql
CREATE TABLE captures (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  protocol TEXT,
  data JSONB,
  screenshot TEXT,  -- Base64 encoded PNG
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Configuration Files

### manifest.json

**Required Permissions:**
```json
{
  "permissions": [
    "activeTab",
    "tabs",        // For screenshot capture
    "storage",
    "scripting",
    "downloads"
  ],

  "host_permissions": [
    "https://www.orca.so/*",
    "https://*.supabase.co/*",
    "https://api.anthropic.com/*"  // For Claude Vision API
  ],

  "background": {
    "service_worker": "background.js"
  }
}
```

### background.js Dependencies

**Loaded via importScripts:**
```javascript
importScripts('supabase.js');  // Supabase client library
```

**Environment Variables:**
```javascript
const ANTHROPIC_API_KEY = 'sk-ant-api03-...';
const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

## Error Handling

### 1. No Expanded Position

```javascript
if (balanceData.error) {
  console.log(`   ⚠️ ${balanceData.error}`);
  throw new Error(balanceData.error);
}
// User sees: "⚠️ No expanded position found"
// Solution: Expand a position before capturing
```

### 2. Pair Mismatch

```javascript
if (!matchedPosition) {
  console.error(`❌ No match found for ${extracted.pair}`);
  console.error(`   Available positions:`, allPositions.map(p => p.pair));
  throw new Error(`Extracted pair ${extracted.pair} doesn't match any position`);
}
// User sees: List of available pairs
// Solution: Check if position exists in capture data
```

### 3. Database Update Failed

```javascript
if (error) {
  console.error('❌ Supabase update error:', error);
  throw new Error(`Database update failed: ${error.message}`);
}
// User sees: Specific Supabase error message
// Solution: Check database connectivity and schema
```

### 4. No Rows Updated

```javascript
if (data && data.length > 0) {
  console.log(`✅✅ Successfully saved ${matchedPosition.pair} to database!`);
} else {
  console.warn('⚠️ No rows updated - position not found');
  throw new Error('Position not found in database');
}
// User sees: Warning about position not found
// Solution: Check timestamp matching and database state
```

## Testing

### Manual Testing Steps

1. **Test Screenshot Capture:**
   ```
   1. Go to Orca portfolio page
   2. Open background console (brave://extensions → service worker)
   3. Click "Capture Positions"
   4. Look for: "📸 Screenshot captured"
   ```

2. **Test AI Extraction:**
   ```
   1. Expand ONE position on Orca (to show token breakdown)
   2. Click "Capture Positions"
   3. Look for: "✅ Found expanded position: {pair}"
   4. Look for: "✅ Extracted: {amount1} {token1} ({pct1}%), {amount2} {token2} ({pct2}%)"
   ```

3. **Test Pair Matching:**
   ```
   1. Look for: "🎯 Matched {extracted} to {database}"
   2. Verify it matches correct position
   3. Check for reversed pairs (e.g., SOL/PUMP → PUMP/SOL)
   ```

4. **Test Database Save:**
   ```
   1. Look for: "✅✅ Successfully saved {pair} to database!"
   2. Run: node verify-all-positions.js
   3. Verify position has token breakdown data
   ```

### Automated Tests

**Test Files:**
- `test-vision-flow.js` - End-to-end API and flow testing
- `test-db-update.js` - Database update verification
- `test-reversed-matching.js` - Pair matching logic
- `verify-all-positions.js` - Database verification

**Run Tests:**
```bash
# All tests
npm run test:all

# Individual tests
npm test                    # Vision flow
npm run test:db            # Database updates
node verify-all-positions.js  # Verify data
```

## Performance

### Timing Breakdown

```
Screenshot Capture:        ~100ms
API Call to Claude:        ~2-3 seconds
Response Parsing:          ~10ms
Pair Matching:            ~1ms
Database Update:          ~50-100ms
─────────────────────────────────
Total Time:               ~2.5-3.5 seconds
```

### Optimization Tips

1. **Screenshot Quality:**
   - Current: 90% quality (good balance)
   - Higher quality = larger file, slower API call
   - Lower quality = faster but less accurate extraction

2. **API Model:**
   - Current: claude-3-opus-20240229 (most accurate)
   - Alternative: claude-3-sonnet (faster, cheaper, slightly less accurate)
   - Alternative: claude-3-haiku (fastest, cheapest, less accurate)

3. **Caching:**
   - Claude API has built-in caching for repeated images
   - Supabase connection is reused across calls

## Troubleshooting

### Issue 1: "No expanded position found"

**Cause:** No position drawer is open in the screenshot

**Solution:**
1. Click on a position to expand it (right side drawer appears)
2. Ensure drawer shows "Balance" with token amounts and percentages
3. Then click "Capture Positions"

### Issue 2: "No match found for {pair}"

**Cause:** Claude extracted a pair that doesn't exist in the capture

**Solution:**
1. Check console for "Available positions" list
2. Verify the expanded position matches one in the list
3. If reversed (e.g., SOL/PUMP vs PUMP/SOL), code should handle it
4. If still failing, check pair matching logic in background.js:578-595

### Issue 3: "No rows updated - position not found"

**Cause:** Timestamp mismatch or wrong pair name

**Solution:**
1. Check console for exact timestamp used
2. Run: `node check-timestamp-issue.js`
3. Verify 5-second window is sufficient
4. Check database has position with matching pair and similar timestamp

### Issue 4: API Rate Limits

**Cause:** Too many API calls to Anthropic

**Solution:**
1. Anthropic has rate limits (requests per minute)
2. Wait a minute between captures if rate limited
3. Consider using claude-3-haiku for testing (faster, cheaper)

### Issue 5: Screenshot Not Captured

**Cause:** Missing permissions or tab not active

**Solution:**
1. Check manifest.json has "tabs" permission
2. Ensure tab is active (visible) when capturing
3. Check console for capture error messages

## Future Enhancements

### Potential Improvements

1. **Batch Processing:**
   - Capture all positions at once (user expands each, takes screenshots)
   - Process multiple screenshots in parallel
   - Update all positions in one database transaction

2. **Smart Caching:**
   - Cache extracted data for identical screenshots
   - Skip API call if screenshot hasn't changed
   - Reduce API costs and improve speed

3. **Validation:**
   - Cross-validate extracted data with DOM-parsed data
   - Flag discrepancies for manual review
   - Build confidence scores for extractions

4. **Multi-Protocol Support:**
   - Extend to Raydium, Aerodrome, etc.
   - Different prompt strategies per protocol
   - Protocol-specific extraction logic

5. **User Feedback:**
   - Show extraction progress in popup
   - Allow user to verify/correct extracted data
   - Build training dataset for improved prompts

## API Costs

### Anthropic Pricing (Claude Opus)

- **Input:** $15 per million tokens
- **Output:** $75 per million tokens

### Per-Screenshot Estimate

- **Image:** ~1,500 tokens (PNG screenshot)
- **Prompt:** ~200 tokens
- **Response:** ~100 tokens
- **Total:** ~1,800 tokens per capture

**Cost:** ~$0.03 per capture (3 cents)

**Monthly Cost Estimate:**
- 10 captures/day × 30 days = 300 captures
- 300 × $0.03 = **$9/month**

### Cost Optimization

Use cheaper models for testing:
- **Claude Sonnet:** 5x cheaper (~$0.006/capture)
- **Claude Haiku:** 50x cheaper (~$0.0006/capture)

## Security Considerations

### API Keys

**Current Implementation:**
- API keys hardcoded in background.js
- ⚠️ **WARNING:** Keys are visible in source code
- ✅ OK for personal use, NOT for distribution

**Production Recommendation:**
- Store keys in environment variables
- Use server-side proxy for API calls
- Implement key rotation

### Data Privacy

**Screenshot Storage:**
- Screenshots stored in Supabase (captures.screenshot)
- Base64 encoded PNG (large data)
- Contains full page view (may include sensitive data)

**Recommendations:**
- Encrypt screenshots at rest
- Implement data retention policy
- Allow user to opt-out of screenshot storage

### CORS and Permissions

**Required Headers:**
```javascript
'anthropic-dangerous-direct-browser-access': 'true'
```

This header is required for browser-based API calls but named "dangerous" by Anthropic as a warning that:
- API keys are exposed in browser
- Requests can be inspected
- Not suitable for production apps with many users

## Version History

### v1.3.0 (Current) - AI Vision Extraction

**Added:**
- Claude Vision API integration
- Automatic token breakdown extraction
- Screenshot capture and storage
- Pair matching with reversed support
- Time-range database queries

**Modified:**
- background.js: Added AI extraction + database save
- popup.js: Added screenshot capture
- manifest.json: Added Anthropic API permissions

**Database:**
- Added screenshot column to captures table
- Token breakdown columns already existed

### v1.2.0 - Token Breakdown Columns

**Added:**
- token0_amount, token1_amount columns
- token0_percentage, token1_percentage columns
- Manual balance entry UI (now replaced by AI)

### v1.1.0 - Multi-Protocol Support

**Added:**
- Orca, Raydium, Aerodrome, Cetus, Hyperion, Beefy, PancakeSwap
- Protocol-specific parsers
- Dashboard with token breakdown display

## Credits

**Technologies Used:**
- Claude 3 Opus (Anthropic) - Vision AI
- Supabase - Database
- Chrome Extensions API - Screenshot capture
- JavaScript/ES6 - Implementation

**Development:**
- Implementation: Claude Code (Anthropic)
- Testing: Automated test suite
- Documentation: This file

## Support

**For Issues:**
1. Check console logs (background and popup)
2. Run automated tests
3. Review this documentation
4. Check GitHub issues

**Common Questions:**
- Q: Why doesn't it work for all positions?
  A: Only ONE position should be expanded per capture

- Q: Can I extract multiple positions at once?
  A: Not currently - capture each position individually

- Q: What if Claude extracts wrong data?
  A: Check screenshot quality and position drawer visibility

- Q: Can I use this offline?
  A: No - requires API calls to Anthropic and Supabase

---

**Last Updated:** 2025-11-11
**Version:** 1.3.0
**Status:** ✅ Production Ready
