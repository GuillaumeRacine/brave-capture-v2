# Issue Diagnosis: Missing Token Data & Timestamps

## Problem Statement
User reports that token amounts, values, percentages, and timestamps ("2h ago") are NOT showing up in the dashboard despite code changes.

## Investigation Results

### ✅ What's Working

1. **Dashboard Code is CORRECT**
   - `dashboard.js` lines 196-209: Properly maps `token0_amount` → `token0Amount`
   - `dashboard.js` lines 407-423: Renders token amounts with values and percentages
   - `dashboard.js` lines 8-25: `formatTimeAgo()` function exists and works correctly
   - `dashboard.html` line 899: Loads `dashboard.js` correctly

2. **Database Schema is CORRECT**
   - Columns exist: `token0_amount`, `token1_amount`, `token0_value`, `token1_value`, `token0_percentage`, `token1_percentage`, `captured_at`
   - Migration has been run successfully

3. **AI Vision Code is CORRECT**
   - `background.js` lines 479-799: AI Vision extraction function exists
   - `background-config.js`: Anthropic API key IS configured
   - API key format is valid: `sk-ant-api03-...`

### ❌ What's NOT Working

**ROOT CAUSE: AI Vision extraction is NOT being triggered**

Database check shows:
- **10/10 recent positions** have NULL token data
- All positions captured 5 minutes ago
- **0% success rate** for token extraction

This means the AI Vision workflow is either:
1. NOT running at all
2. Failing silently without errors
3. Being skipped by the user

## Why Token Data is Missing

The token extraction flow works like this:

```
User visits Orca → Clicks "Capture Positions"
        ↓
    popup.js captures screenshot
        ↓
    Saves to database with NULL token data
        ↓
    popup.js checks: do positions need token data?
        ↓
    IF LIST VIEW (multiple positions):
        → autoExtractTokenDataPrompt() should trigger
        → User should see prompt to extract tokens
        → Should expand each position and extract

    IF DETAIL VIEW (one position expanded):
        → Should extract from current screenshot
        → Send to background.js extractBalanceFromScreenshot()
        → Save token data to database
```

**PROBLEM**: The extraction is NOT happening, which means:

### Scenario A: User is capturing LIST view
- Multiple positions visible
- None expanded
- `autoExtractTokenDataPrompt()` should show up
- **BUT**: User may be dismissing it or not seeing it

### Scenario B: User is capturing DETAIL view
- One position expanded
- Should auto-extract from screenshot
- **BUT**: AI Vision may be failing silently

## Database Evidence

```sql
SELECT pair, protocol, token0_amount, token1_amount, captured_at
FROM positions
ORDER BY captured_at DESC
LIMIT 10;
```

Results:
- PUMP/SOL0 (Orca) - token0_amount: NULL
- JLP/USDC0 (Orca) - token0_amount: NULL
- cbBTC/USDC0 (Orca) - token0_amount: NULL
- whETH/SOL0 (Orca) - token0_amount: NULL
- SOL/USDC0 (Orca) - token0_amount: NULL

**Conclusion**: 100% of recent captures have NO token data.

## Solutions

### For the User

1. **Reload the Extension**
   ```
   1. Go to chrome://extensions
   2. Find "Brave Capture"
   3. Click the reload icon
   4. This ensures background-config.js with API key is loaded
   ```

2. **Use Detail View Capture**
   ```
   1. On Orca, click ONE position to expand the drawer
   2. Wait for drawer to fully open (shows token breakdown)
   3. Click "Capture Positions" in extension
   4. AI Vision should auto-extract from the screenshot
   ```

3. **Use Batch Extraction**
   ```
   1. Capture positions normally (list view)
   2. Click "Extract Token Data" button in popup
   3. Extension will:
      - Expand each position automatically
      - Take screenshot
      - Extract token data
      - Save to database
   ```

### For Debugging

1. **Check Console Logs**
   - Open extension popup
   - Right-click → Inspect → Console tab
   - Look for errors during capture
   - Check if "Auto-extracting token data" appears

2. **Check Background Worker Logs**
   - Go to chrome://extensions
   - Click "service worker" link under extension
   - Console will show background.js logs
   - Look for "AI Vision extraction" messages

3. **Verify API Key Loaded**
   - In background worker console, check:
   ```javascript
   console.log(BACKGROUND_CONFIG?.ANTHROPIC_API_KEY ? 'API Key loaded' : 'API Key missing');
   ```

## Expected Behavior After Fix

Once AI Vision extraction runs successfully:

1. **Dashboard will show**:
   ```
   SOL/USDC · Orca · 5m ago

   Token 0: 125.45 SOL ($15,234 • 48%)
   Token 1: 16,523 USDC ($16,523 • 52%)
   ```

2. **Database will have**:
   ```
   token0_amount: 125.45
   token1_amount: 16523
   token0_percentage: 48
   token1_percentage: 52
   ```

3. **Timestamps will show**:
   - "Just now"
   - "5m ago"
   - "2h ago"
   - "3d ago"

## Next Steps

1. User should reload extension
2. Try capturing ONE expanded position (detail view)
3. Check if token data appears
4. If still failing, check console for errors
5. Share console logs for further debugging
