# Automatic Token Extraction

## Overview

The Brave Capture extension now features **fully automatic token extraction** that requires **ZERO user interaction**. When you capture positions, the extension automatically extracts token breakdown data using AI Vision without any confirmation dialogs or manual steps.

## How It Works

### User Flow

1. **User clicks "Capture Positions"** → Extension captures position data
2. **Screenshot taken automatically** → Stored with capture
3. **Missing token data detected** → Extension identifies positions without token amounts
4. **Automatic extraction begins** → No confirmation needed
5. **Progress shown in popup** → Live updates as extraction proceeds
6. **Database updated automatically** → Complete data saved
7. **Dashboard shows real amounts** → All token values populated

### Technical Flow

```
User Action: Click "Capture Positions"
    ↓
Capture DOM data
    ↓
Take screenshot
    ↓
Save to database
    ↓
Detect missing token data
    ↓
LIST VIEW (multiple positions)?
    ├─ YES → Start batch extraction
    │         ├─ For each position:
    │         │   ├─ Expand position drawer
    │         │   ├─ Wait for animation
    │         │   ├─ Capture screenshot
    │         │   ├─ Extract with AI Vision (Claude Haiku)
    │         │   ├─ Save to database
    │         │   └─ Close drawer
    │         └─ Show completion message
    │
    └─ NO → DETAIL VIEW (single position)
              ├─ Extract from current screenshot
              └─ Save to database

Popup stays open during extraction
    ↓
Auto-closes when complete
    ↓
User opens dashboard → All data is there!
```

## Key Features

### 1. No Confirmation Dialogs
- **Before:** User had to click "OK" to confirm extraction
- **After:** Extraction starts automatically after capture
- **User Experience:** Just click "Capture Positions" and wait

### 2. Smart Detection
The extension automatically detects:
- **List View:** Multiple positions visible, none expanded
  - → Batch extraction: Expand each position one by one
- **Detail View:** Single position with expanded drawer
  - → Direct extraction: Use the current screenshot

### 3. Progress Tracking
- Real-time progress bar in popup
- Current position being extracted
- Success/failure count
- Estimated time remaining
- Example: "Extracting 15/30: SOL/USDC..."

### 4. Popup Behavior
- **During capture:** Popup stays open, shows "Capturing..."
- **During extraction:** Popup stays open, shows progress
- **After completion:** Auto-closes after 2-3 seconds
- **On error:** Stays open to show error message

### 5. Background Cleanup Worker
- Runs every 5 minutes
- Checks database for positions with missing token data
- Logs positions that need extraction
- Helps identify any missed positions

## Cost & Performance

### AI Model Used
- **Model:** Claude 3 Haiku (fastest, most cost-effective)
- **Cost per position:** ~$0.0005 USD
- **Time per position:** ~1.5 seconds
- **Example:** 30 positions = $0.015 USD, ~45 seconds

### Typical Scenarios
| Positions | Cost | Time |
|-----------|------|------|
| 10 | $0.005 | ~15s |
| 30 | $0.015 | ~45s |
| 50 | $0.025 | ~75s |

## What Users See

### Before Automatic Extraction
```
User clicks "Capture Positions"
    ↓
Popup shows: "Do you want to extract token data for 30 positions?"
    ↓
User clicks "OK"
    ↓
Extraction begins
```

### After Automatic Extraction
```
User clicks "Capture Positions"
    ↓
Extraction begins immediately
    ↓
(No dialog, no confirmation, just works)
```

## Database Schema

Positions are stored with complete token breakdown:

```sql
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  balance DECIMAL,
  token0_amount DECIMAL,        -- Extracted automatically
  token1_amount DECIMAL,         -- Extracted automatically
  token0_percentage DECIMAL,     -- Extracted automatically
  token1_percentage DECIMAL,     -- Extracted automatically
  captured_at TIMESTAMP,
  -- other fields...
);
```

## Error Handling

### Extraction Failures
- If extraction fails for a position:
  - Logs error to console
  - Continues with next position
  - Shows failure count in summary
  - User can retry later from dashboard

### Network Issues
- AI Vision API calls have automatic retry
- Background worker will find missed positions
- User can manually trigger re-extraction if needed

### Missing Positions
- Background worker checks every 5 minutes
- Identifies positions with NULL token data
- Logs them for user awareness
- User can re-capture if needed

## Testing the Flow

### Manual Test
1. Go to Orca portfolio page: `https://www.orca.so/positions`
2. Click extension popup → "Capture Positions"
3. Watch popup show extraction progress
4. Wait for completion message
5. Open dashboard → Verify all token amounts are populated

### Verify Database
```bash
# Check for positions with complete data
node scripts/show-positions.js

# Expected output:
# ✅ SOL/USDC: 150.5 SOL (45%) + 2,500 USDC (55%)
# ✅ cbBTC/USDC: 0.035 cbBTC (37%) + 6,385 USDC (63%)
# (No positions showing "0 ($0 • 50%)")
```

### Check Logs
```javascript
// In browser console (popup.js):
// ✅ Success messages:
"🤖 Auto-extracting token data for 30 positions..."
"🚀 Starting batch extraction..."
"✅ Successfully extracted SOL/USDC"
"✅ Extraction complete! 30/30 successful (45s)"

// ❌ Error messages:
"❌ Failed to extract cbBTC/USDC: Network error"
"⚠️ Extraction completed with failures: 28/30 successful"
```

## Troubleshooting

### "No positions need extraction" but dashboard shows missing data
- **Cause:** Database already has entries with NULL values
- **Solution:** Run cleanup query to find them:
  ```sql
  SELECT * FROM positions
  WHERE token0_amount IS NULL
  ORDER BY captured_at DESC;
  ```

### Extraction starts but popup closes too early
- **Cause:** `extractionInProgress` flag not set correctly
- **Solution:** Check popup.js line 4 for flag initialization

### Background worker not running
- **Cause:** Alarm not created on install
- **Solution:** Reload extension to trigger `chrome.runtime.onInstalled`

### AI Vision extraction fails
- **Cause:** Missing API key or incorrect screenshot
- **Solution:**
  1. Check `ANTHROPIC_API_KEY` in `.env.local`
  2. Run `npm run build:config` to regenerate config
  3. Reload extension

## Code References

### Main Files
- **popup.js** (lines 870-910): `autoExtractTokenDataPrompt()` - Automatic extraction entry point
- **popup.js** (lines 912-1026): `startBatchExtraction()` - Batch extraction coordinator
- **background.js** (lines 479-600): `extractBalanceFromScreenshot()` - AI Vision extraction
- **background.js** (lines 728-809): `extractAndSaveBalance()` - Extract and save to database
- **background.js** (lines 814-871): `cleanupMissingTokenData()` - Background cleanup worker

### Key Functions
```javascript
// Popup automatically triggers extraction after capture
async function autoExtractTokenDataPrompt(missingPositions) {
  // No confirmation - always extract
  extractionInProgress = true;
  await startBatchExtraction(positions);
  extractionInProgress = false;
}

// Background worker checks for missed positions
async function cleanupMissingTokenData() {
  // Query database for NULL token amounts
  // Log positions that need extraction
  // Store count for user awareness
}
```

## Future Enhancements

### Planned Features
1. **Retry mechanism:** Automatically retry failed extractions
2. **Batch optimization:** Process multiple positions in parallel
3. **User notifications:** Browser notification when extraction completes
4. **Manual trigger:** Button in dashboard to re-extract specific positions
5. **Extraction history:** Track which positions were auto-extracted vs manual

### Possible Improvements
- Use faster AI model for batch operations
- Cache token prices to avoid repeated API calls
- Smart scheduling: Extract during idle time
- User preference: Enable/disable automatic extraction

## Summary

The automatic token extraction feature makes the extension **truly hands-off**:
- ✅ User clicks ONE button
- ✅ Everything happens automatically
- ✅ Database populated with complete data
- ✅ Dashboard shows real token amounts
- ✅ Background worker catches missed positions

**User experience goal achieved:** "I just click capture and it works!"
