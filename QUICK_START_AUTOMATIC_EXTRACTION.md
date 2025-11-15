# Quick Start: Automatic Token Extraction

## What Changed?

Your extension now extracts token data **automatically**. No more clicking "OK" or confirming anything!

## How to Use

### Simple 3-Step Process

1. **Go to Orca portfolio page**
   ```
   https://www.orca.so/positions
   ```

2. **Click ONE button**
   - Click extension icon
   - Click "Capture Positions"
   - **That's it! Don't click anything else**

3. **Watch it work**
   - Popup shows progress: "Extracting 1/30..."
   - Progress bar fills up
   - Popup closes automatically when done
   - Open dashboard → All data is there!

## What You'll See

```
Click "Capture Positions"
    ↓
"Capturing..." (2 seconds)
    ↓
"Saving to database..." (1 second)
    ↓
"Extracting token data..." (appears automatically)
    ↓
"Extracting 1/30: SOL/USDC..."
"Extracting 2/30: cbBTC/USDC..."
... (continues for all positions)
    ↓
"Extraction complete! 30/30 successful (45s)" (2 seconds)
    ↓
Popup closes automatically
```

## Before vs After

### Before (OLD)
```
You: Click "Capture Positions"
Extension: "Extract token data for 30 positions?"
You: Click "OK"
Extension: Starts extraction
```

### After (NEW)
```
You: Click "Capture Positions"
Extension: Starts extraction automatically
(You don't click anything else!)
```

## Cost & Time

| Positions | Time | Cost |
|-----------|------|------|
| 10 positions | ~15 seconds | $0.005 |
| 30 positions | ~45 seconds | $0.015 |
| 50 positions | ~75 seconds | $0.025 |

**Very affordable!** 30 positions costs less than 2 cents.

## Troubleshooting

### "Popup closed before extraction finished"
- **Shouldn't happen!** The popup now stays open during extraction
- If it does happen, reload the extension and try again

### "Some positions missing token data"
- Check browser console for errors
- Verify your API key is set up correctly
- Background worker will find them (checks every 5 minutes)
- You can always re-capture to retry

### "No extraction started"
- Make sure positions don't already have token data
- Check that you have the API key configured
- Console should show: "🤖 Auto-extracting token data..."

### "Extraction failed"
- Check your internet connection
- Verify API key is valid
- Popup will show error message
- You can retry by clicking "Capture Positions" again

## Verify It Works

### Check Database
```bash
cd /Users/gui/Brave-Capture
node scripts/show-positions.js
```

**Good output:**
```
✅ SOL/USDC: 150.5 SOL (45%) + 2,500 USDC (55%)
✅ cbBTC/USDC: 0.035 cbBTC (37%) + 6,385 USDC (63%)
```

**Bad output (needs extraction):**
```
❌ SOL/USDC: 0 ($0 • 50%)
❌ cbBTC/USDC: 0 ($0 • 50%)
```

### Check Dashboard
1. Click "View Dashboard" in popup
2. Look at position cards
3. Should show real token amounts like:
   - "150.5 SOL (45%)"
   - "2,500 USDC (55%)"
4. NOT placeholder values like "0 ($0 • 50%)"

## Background Worker

The extension now has a **background cleanup worker** that:
- Checks every 5 minutes for positions missing data
- Logs them to console for your awareness
- Runs automatically in the background

**Check it's working:**
```javascript
// In browser console (background service worker):
// Should see logs like:
"🧹 Background cleanup: Checking for positions with missing token data..."
"✅ No positions need token data extraction"
// or
"📊 Found 5 positions missing token data (from last 7 days)"
```

## What if I Want to Turn it Off?

Currently, automatic extraction is **always on** because it makes the extension so much easier to use!

If you really want to disable it:
1. Open `/Users/gui/Brave-Capture/popup.js`
2. Find line 879: `const confirmed = true;`
3. Change to: `const confirmed = false;`
4. Reload extension

But we recommend keeping it on for the best experience!

## Tips

1. **Let it finish:** Don't close the popup manually during extraction
2. **Wait for completion:** The popup will auto-close when done
3. **Check dashboard:** Verify data looks correct after capture
4. **Re-capture if needed:** You can always capture again to retry extraction
5. **Background worker:** Runs automatically, no action needed

## Need Help?

### Check Logs
**Popup console:**
```javascript
// Right-click extension popup → Inspect
// Check Console tab for:
"🤖 Auto-extracting token data for 30 positions..."
"✅ Successfully extracted SOL/USDC"
"✅ Extraction complete! 30/30 successful"
```

**Background console:**
```javascript
// chrome://extensions → Brave Capture → service worker → inspect
// Check for:
"✅ Background.js successfully extracted and saved: SOL/USDC"
"🧹 Background cleanup: Checking for positions..."
```

### Common Issues

**Issue:** "Failed to prepare batch extraction"
- **Fix:** Reload the Orca page and try again

**Issue:** "Extraction failed for all positions"
- **Fix:** Check internet connection and API key

**Issue:** "Position not found in database"
- **Fix:** Capture again, database might have timed out

**Issue:** Dashboard shows old data
- **Fix:** Refresh dashboard page (Ctrl+R or Cmd+R)

## Documentation

- **Full guide:** `/docs/AUTOMATIC_TOKEN_EXTRACTION.md`
- **Test cases:** `/tests/test-automatic-extraction.md`
- **Implementation:** `/AUTOMATIC_EXTRACTION_IMPLEMENTATION.md`

## Summary

**You just click ONE button and everything happens automatically!**

No confirmations, no manual steps, no hassle. The extension does all the work for you:
- ✅ Captures position data
- ✅ Takes screenshot
- ✅ Saves to database
- ✅ Extracts token amounts (automatic!)
- ✅ Updates database
- ✅ Shows complete data in dashboard

**Enjoy your hands-free token extraction!** 🎉
