# Quick Start - AI Vision Token Extraction

## 🚨 FOR LLMs: AUTONOMOUS TESTING REQUIRED

**CRITICAL: Test autonomously BEFORE involving user!**

```
WORKFLOW:
1. Explore → Understand codebase
2. Plan → Design implementation
3. Implement → Write code
4. Test → Create and run automated tests
5. Debug → Fix issues found in tests
6. Document → Update all .md files
7. Verify → Final check of all changes

ONLY THEN → Present to user with simple verification steps
```

**See:** `SUBAGENT-WORKFLOW-PROMPT.md` for master prompt template

---

## For Humans 👤

### How to Use

1. **Go to Orca Portfolio:** https://www.orca.so/portfolio

2. **Expand ONE position:**
   - Click on a position to open the right-side drawer
   - Drawer should show token amounts and percentages

3. **Capture:**
   - Click extension icon
   - Click "Capture Positions"
   - Wait 2-3 seconds

4. **Verify:**
   - Open background console: `brave://extensions` → "service worker"
   - Look for: `✅✅ Successfully saved {pair} to database!`

5. **View Dashboard:**
   - Click "📊 View Dashboard" in extension popup
   - See token breakdown with amounts and percentages

### Tips

- ✅ **DO:** Expand one position at a time
- ✅ **DO:** Wait for drawer to fully load before capturing
- ✅ **DO:** Keep background console open to see progress
- ❌ **DON'T:** Expand multiple positions (only captures one)
- ❌ **DON'T:** Capture too quickly (wait for API response)

### Troubleshooting

**Problem:** "No expanded position found"
- **Fix:** Make sure drawer is open and visible

**Problem:** "No match found for {pair}"
- **Fix:** Check if position exists in your portfolio

**Problem:** "No rows updated"
- **Fix:** Wait a few seconds, try capturing again

## For LLMs 🤖

### System Architecture

```
Component Flow:
popup.js → chrome.tabs.captureVisibleTab() → base64 PNG
popup.js → chrome.runtime.sendMessage() → background.js
background.js → fetch('https://api.anthropic.com/v1/messages') → Claude Vision
Claude → JSON response with token breakdown
background.js → Pair matching logic → Database position
background.js → supabase.update() → Database save
Console → Success/error message
```

### Key Files

1. **background.js:447-643**
   - AI extraction: `extractBalanceFromScreenshot()`
   - Database save: `extractAndSaveBalance()`
   - Supabase client initialization

2. **popup.js:84-92, 202-234**
   - Screenshot capture
   - Message passing to background

3. **manifest.json**
   - Permissions: tabs, api.anthropic.com
   - Background service worker config

### Critical Functions

**Extract and Save (background.js:572-643):**
```javascript
async function extractAndSaveBalance(screenshotDataUrl, captureTimestamp, allPositions) {
  // 1. Extract from screenshot using Claude Vision
  const extracted = await extractBalanceFromScreenshot(screenshotDataUrl, allPositions.map(p => p.pair));

  // 2. Match extracted pair to database position
  const matchedPosition = allPositions.find(pos => {
    // Handles: exact match, reversed pairs, trailing zeros
  });

  // 3. Update database with 5-second time window
  const { data, error } = await supabaseClient
    .from('positions')
    .update({...})
    .eq('pair', matchedPosition.pair)
    .gte('captured_at', timeBefore)
    .lte('captured_at', timeAfter)
    .select();

  return { success: true, pair: matchedPosition.pair, data: extracted };
}
```

**Pair Matching Logic (background.js:579-595):**
- Normalizes: Removes trailing zeros, trims whitespace
- Exact match: cbBTC/USDC → cbBTC/USDC0
- Reversed match: SOL/PUMP → PUMP/SOL0

**Time Range Query (background.js:604-621):**
- Why: Capture timestamp ≠ Position timestamp (milliseconds apart)
- Solution: ±5 second window using `.gte()` and `.lte()`

### Database Schema

**positions table:**
```sql
token0_amount NUMERIC      -- e.g., 0.039162
token1_amount NUMERIC      -- e.g., 5945.6789
token0_percentage NUMERIC  -- e.g., 41.1
token1_percentage NUMERIC  -- e.g., 58.99
```

### API Configuration

**Claude Vision API:**
- Model: claude-3-opus-20240229
- Endpoint: https://api.anthropic.com/v1/messages
- Required Header: 'anthropic-dangerous-direct-browser-access': 'true'
- Input: Base64 PNG + text prompt
- Output: JSON with token breakdown

**Prompt Strategy:**
- Discovery approach: "Which pair IS expanded?" not "Extract pair X"
- Structured JSON output
- Error handling for no expanded position

### Error Handling

**Common Errors:**
1. `balanceData.error` → No expanded position
2. `!matchedPosition` → Pair not found in positions list
3. `error` from Supabase → Database connection/schema issue
4. `data.length === 0` → No rows updated (timestamp mismatch)

### Testing

**Automated:**
```bash
npm run test:all                # Full test suite
node verify-all-positions.js    # Check database
node test-reversed-matching.js  # Test pair logic
```

**Manual:**
```javascript
// In background console
chrome.runtime.reload();  // Hard reload service worker
```

### Performance

- Screenshot: ~100ms
- API Call: ~2-3 seconds
- Database: ~50-100ms
- **Total: ~2.5-3.5 seconds per capture**

### Cost

- Per capture: ~$0.03 (Claude Opus)
- Monthly (10/day): ~$9
- Optimization: Use Claude Haiku for testing (~$0.0006/capture)

### Future Modifications

**To add new protocol:**
1. Add to content.js parser
2. Update prompt in background.js (protocol-specific instructions)
3. Test pair matching logic
4. Update dashboard display

**To change model:**
```javascript
// background.js:496
model: 'claude-3-haiku-20240307'  // Faster, cheaper
```

**To adjust time window:**
```javascript
// background.js:605-606
const timeBefore = new Date(captureTime.getTime() - 10000);  // 10 seconds
const timeAfter = new Date(captureTime.getTime() + 10000);
```

### Debug Checklist

1. ✅ Screenshot captured? (Check console for "📸")
2. ✅ API called? (Check for "🤖 Background: Analyzing")
3. ✅ Response parsed? (Check for "✅ Found expanded position")
4. ✅ Pair matched? (Check for "🎯 Matched")
5. ✅ Database updated? (Check for "✅✅ Successfully saved")

### Integration Points

**Input:**
- `popup.js` → Screenshot data URL (base64 PNG)
- `popup.js` → Capture timestamp (ISO string)
- `popup.js` → All positions with null token amounts

**Output:**
- Console logs (success/error messages)
- Database updates (token0_amount, token1_amount, etc.)
- Return value: `{ success: boolean, pair: string, data: object }`

**Dependencies:**
- supabase.js (loaded via importScripts)
- Chrome APIs: tabs, runtime, storage
- External APIs: Anthropic, Supabase

---

**Quick Reference:**
- 📄 Full docs: AI-VISION-COMPLETE.md
- 🧪 Tests: npm run test:all
- 🔍 Verify: node verify-all-positions.js
- 📊 Dashboard: Click "View Dashboard" in popup
