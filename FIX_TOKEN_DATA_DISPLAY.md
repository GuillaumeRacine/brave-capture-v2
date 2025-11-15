# Fix: Token Data & Timestamps Not Showing in Dashboard

## Problem Summary

Dashboard is NOT showing:
- Token amounts (e.g., "50 SOL", "5,000 USDC")
- Token values (e.g., "$5,000")
- Token percentages (e.g., "50%")
- Timestamps (e.g., "2h ago")

## Root Cause

**The dashboard code is CORRECT.** The issue is that **AI Vision token extraction is NOT running**, so the database has NULL values for all token fields.

### Evidence

```bash
$ node scripts/check-recent-updates.js

Last 10 positions captured:

1. ❌ Orca - PUMP/SOL0
   Token0: NULL, Token1: NULL

2. ❌ Orca - JLP/USDC0
   Token0: NULL, Token1: NULL

... (all 10 positions have NULL token data)
```

**0 out of 10 positions** have token data = 0% success rate.

## Why This Happened

When you capture positions, the flow should be:

1. ✅ Capture screenshot → **WORKS**
2. ✅ Save position data to database → **WORKS**
3. ❌ Extract token data with AI Vision → **NOT RUNNING**
4. ❌ Update database with token amounts → **NEVER HAPPENS**
5. ❌ Dashboard displays token data → **CAN'T DISPLAY NULL DATA**

The AI Vision extraction has **not been triggered at all** for your recent captures.

## The Fix (3 Steps)

### Step 1: Reload the Extension

This ensures the background script loads with the correct API key.

1. Open `chrome://extensions` in your browser
2. Find "Brave Capture - CLM Position Tracker"
3. Click the **reload icon** (circular arrow)
4. Confirm the service worker is running (shows "active")

### Step 2: Capture with Token Extraction

You have **two options**:

#### Option A: Detail View Capture (Automatic)

1. Go to https://www.orca.so
2. **Click ONE position** to expand its drawer (right side panel)
3. **Wait 2 seconds** for drawer to fully load (you'll see token breakdown)
4. Click "**Capture Positions**" in extension popup
5. AI Vision will **automatically extract** from the screenshot
6. Token data saves to database ✅

#### Option B: Batch Extraction (Manual)

1. Capture positions normally (list view, no expansion needed)
2. In extension popup, click "**Extract Token Data**" button
3. Extension will:
   - Automatically expand each position one by one
   - Take screenshot of each
   - Extract token data with AI Vision
   - Save to database
4. Process takes ~2 seconds per position
5. Progress bar shows extraction status

### Step 3: Verify Data Appears

After extraction completes:

1. Open dashboard: `dashboard.html`
2. You should now see:

```
SOL/USDC · Orca · 5m ago
├─ Balance: $31,234
├─ Token 0: 125.45 SOL ($15,234 • 48%)
├─ Token 1: 16,523 USDC ($16,523 • 52%)
└─ Yield: $45 | APY: 23.5%
```

3. Timestamps will show: "Just now", "5m ago", "2h ago", etc.

## Testing the Fix

Run this command to verify token data is now in database:

```bash
node scripts/check-recent-updates.js
```

**Before fix:**
```
1. ❌ Orca - SOL/USDC
   Token0: NULL, Token1: NULL
```

**After fix:**
```
1. ✅ Orca - SOL/USDC
   Token0: 125.45, Token1: 16523
   Percentage: 48% / 52%
```

## Why Your Code Changes Didn't Work

You may have made changes to:
- `dashboard.js` - mapping and display logic
- `background.js` - AI Vision extraction
- Database schema - added token columns

**All of these are correct!** But if the AI Vision extraction never runs, there's no data to display.

It's like building a perfect display case, but never putting anything inside it.

## Debugging Tips

If token data still doesn't appear after following the fix:

### Check Background Worker Logs

1. Go to `chrome://extensions`
2. Find "Brave Capture"
3. Click "**service worker**" link
4. Console opens showing background.js logs
5. Look for:
   - ✅ "Background config loaded"
   - ✅ "Supabase library loaded"
   - ✅ "AI Vision extraction" messages
   - ❌ Any error messages

### Check Popup Console

1. Open extension popup
2. Right-click anywhere → "**Inspect**"
3. Console tab shows popup.js logs
4. During capture, look for:
   - "Auto-extracting token data for X positions"
   - "Successfully extracted [pair]"
   - Any extraction errors

### Verify API Key

In background worker console, run:

```javascript
console.log('API Key:', BACKGROUND_CONFIG?.ANTHROPIC_API_KEY ? 'Loaded ✅' : 'Missing ❌');
```

Should output: `API Key: Loaded ✅`

## Common Issues

### Issue 1: "No expanded position found"

**Cause**: AI Vision can't find token breakdown in screenshot.

**Fix**: Make sure the position drawer is **fully expanded** before capturing. You should see:
- Token amounts with numbers
- Percentages (%)
- Dollar values ($)

### Issue 2: "Batch extraction shows 0 positions"

**Cause**: All positions already have token data.

**Fix**: Check database - data may already be there. Refresh dashboard.

### Issue 3: "Extraction fails for all positions"

**Cause**: API key not loaded or invalid.

**Fix**:
1. Check `.env.local` has `ANTHROPIC_API_KEY=sk-ant-...`
2. Run `npm run build:config` to regenerate `background-config.js`
3. Reload extension

## What Happens Next

Once AI Vision extraction runs successfully:

### Database Will Have:
```sql
token0_amount: 125.45
token1_amount: 16523.00
token0_value: 15234.00
token1_value: 16523.00
token0_percentage: 48.0
token1_percentage: 52.0
captured_at: 2025-11-14T13:05:23Z
```

### Dashboard Will Show:
- ✅ Token amounts: "125.45 SOL", "16,523 USDC"
- ✅ Token values: "$15,234", "$16,523"
- ✅ Token percentages: "48%", "52%"
- ✅ Timestamps: "5m ago", "2h ago", etc.

## Need More Help?

If this doesn't work:

1. Run diagnostic: `node tests/diagnose-missing-tokens.js`
2. Share the output
3. Check browser console for errors
4. Verify you're on the latest extension version

---

**TL;DR**: Your code is fine. Token extraction just isn't running. Reload extension, capture ONE expanded position, and data will appear.
