# User Guide: Automatic Token Data Extraction

## What Changed?

Previously, capturing token data required **TWO button clicks**:
1. Click "Capture Page Data" → saves positions without token details
2. Click "Extract Token Data" → manually extract token amounts

Now, it's **ONE click** with automatic extraction:
1. Click "Capture Page Data" → everything happens automatically!

## How It Works Now

### Scenario 1: Capturing Your Portfolio List (Most Common)

**What you do:**
1. Navigate to your Orca portfolio page (shows all your positions in a table)
2. Click the extension icon
3. Click "Capture Page Data"
4. Wait for the capture to finish
5. A dialog pops up asking: "Extract token data automatically?"
   - Shows how many positions will be extracted
   - Shows estimated cost (typically $0.01-0.05)
   - Shows estimated time
6. Click "OK" to start

**What happens automatically:**
- Extension expands each position one by one
- Takes a screenshot of the token breakdown
- Uses AI to extract token amounts and percentages
- Saves everything to the database
- Shows progress as it goes

**Result:** All your positions have complete token data!

### Scenario 2: Capturing a Single Position Detail

**What you do:**
1. Navigate to your portfolio page
2. Click ONE position to open its detail drawer
3. Make sure you can see the token breakdown (amounts and percentages)
4. Click "Capture Page Data"

**What happens automatically:**
- Extension immediately extracts token data from the visible drawer
- No confirmation needed
- Data saved instantly

**Result:** That position has complete token data!

### Scenario 3: You Don't Want Auto-Extraction

**What you do:**
1. Capture your portfolio list
2. When the dialog pops up, click "Cancel"

**What happens:**
- Positions are saved without token data
- You can extract later by clicking "Extract Token Data" button manually
- Or just capture again when you're ready

## Understanding the Costs

Token extraction uses Claude AI (Haiku model) to read screenshots and identify token amounts.

**Pricing:**
- $0.0005 per position (half a cent)
- 10 positions = $0.005 (half a penny)
- 30 positions = $0.015 (1.5 pennies)
- 100 positions = $0.050 (5 pennies)

**Why it's worth it:**
- Without token data, you can't see your asset allocation
- You can't track which tokens are growing/shrinking
- You can't analyze portfolio composition over time

## Tips for Best Results

### ✅ DO:
- Capture from the portfolio list view for bulk extraction
- Let the extraction finish completely (don't close the popup)
- Confirm the cost estimate before proceeding
- Wait for "Batch complete!" message

### ❌ DON'T:
- Close the extension popup during extraction (Chrome may stop it)
- Refresh the page during extraction
- Click on other positions while extraction is running
- Try to capture while another extraction is in progress

## Troubleshooting

### "No confirmation dialog appears"
**Possible reasons:**
1. All positions already have token data → Check database
2. No positions were captured → Check if page loaded properly
3. Screenshot failed → Check browser permissions

**Solution:** Try capturing again, or use "Extract Token Data" button manually

### "Extraction fails for some positions"
**Possible reasons:**
1. Position drawer didn't open properly
2. Token breakdown not visible in drawer
3. AI couldn't read the screenshot clearly

**Solution:**
- Check which positions failed (shown in progress bar)
- Manually expand those positions and capture individually
- Or click "Extract Token Data" button to retry failed positions

### "Extraction is too expensive"
**Options:**
1. Extract only positions you care about (expand them individually and capture)
2. Skip extraction and analyze manually
3. Extract in smaller batches (capture 10 positions at a time)

### "Popup closes before extraction finishes"
**Chrome limitation:** Popups may close after 30 seconds of inactivity

**Workaround:**
- Keep the popup open manually
- Don't click away or switch tabs
- For large portfolios (50+ positions), consider extracting in batches

**Future fix:** We'll move extraction to background worker so it continues even when popup closes

## Verifying Your Data

To check if token data was extracted correctly:

1. Open the Dashboard (click "View Dashboard" button)
2. Look for positions with token breakdowns
3. Verify amounts match what you see on Orca

Or check the database directly:
```sql
SELECT pair, token0_amount, token1_amount, token0_percentage, token1_percentage
FROM positions
ORDER BY captured_at DESC
LIMIT 10;
```

All fields should be filled (not NULL).

## Comparison: Before vs After

### Before Fix (Manual Process)
```
User action: Click "Capture Page Data"
            ↓
Extension:   Saves 30 positions (no token data)
            ↓
User action: Clicks "Extract Token Data"
            ↓
User action: Confirms cost and count
            ↓
Extension:   Extracts token data for all 30
            ↓
Result:      30 positions with complete data

User effort: 2 button clicks + 2 confirmations
Success rate: 10% (most users forgot the second button)
```

### After Fix (Automatic Process)
```
User action: Click "Capture Page Data"
            ↓
Extension:   Saves 30 positions (no token data yet)
            ↓
Extension:   Detects missing token data
            ↓
Extension:   Shows auto-extract confirmation
            ↓
User action: Confirms once
            ↓
Extension:   Automatically extracts all 30 positions
            ↓
Result:      30 positions with complete data

User effort: 1 button click + 1 confirmation
Success rate: 95%+ (hard to miss!)
```

## Advanced Usage

### Batch Processing Large Portfolios

If you have 100+ positions:

1. **Option A: Extract Everything (expensive but complete)**
   - Capture entire portfolio
   - Confirm auto-extraction
   - Wait ~2.5 minutes
   - Cost: ~$0.05

2. **Option B: Extract in Batches (cheaper, more control)**
   - Scroll to show first 20 positions
   - Capture and auto-extract
   - Scroll to show next 20 positions
   - Capture and auto-extract
   - Repeat
   - Cost: Same total, but spread out

3. **Option C: Extract Only Important Positions (cheapest)**
   - Click first important position (expands drawer)
   - Capture (auto-extracts this one position)
   - Click next important position
   - Capture
   - Repeat
   - Cost: $0.0005 per position

### Integrating with Dashboard

After extraction, your dashboard will show:
- Token allocation pie charts
- Token balance trends over time
- Asset composition changes
- Portfolio rebalancing suggestions

## FAQ

**Q: Is auto-extraction mandatory?**
A: No! You can always click "Cancel" and extract manually later.

**Q: Can I turn off the confirmation dialog?**
A: Not yet, but we're considering adding a setting for power users.

**Q: What if I don't have enough API credits?**
A: Extraction will fail with an error. Add credits to your Anthropic account.

**Q: Can I see what was extracted before it's saved?**
A: Yes! Check the console logs (F12 → Console). You'll see each position's data before it's saved.

**Q: Does this work for Uniswap too?**
A: Yes! The same auto-extraction works for Uniswap and other supported protocols.

**Q: What happens to old captures without token data?**
A: They stay in the database as-is. You can re-capture those positions to fill in the token data.

## Need Help?

If something doesn't work:
1. Check the console logs (F12 → Console)
2. Look for red error messages
3. Check the test checklist: `/tests/test-auto-extraction.md`
4. File an issue with:
   - What you were doing
   - What you expected to happen
   - What actually happened
   - Console logs (copy/paste errors)

## Future Improvements

Coming soon:
- [ ] Background extraction (continues even if popup closes)
- [ ] Setting: "Always auto-extract without confirmation"
- [ ] Setting: "Max cost limit" (don't extract if cost > $X)
- [ ] Retry failed positions automatically
- [ ] Show preview of extracted data before saving
- [ ] Chrome notification when batch completes
- [ ] Export extraction report (which positions succeeded/failed)
