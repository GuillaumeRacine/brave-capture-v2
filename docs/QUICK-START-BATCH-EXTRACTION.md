# Quick Start: Batch Token Extraction

## What It Does

Automatically extract token breakdown data for ALL your positions with ONE click.

## 3-Step Process

### 1. Navigate to Orca
Go to: https://www.orca.so/positions

Make sure you're logged in and can see your positions.

### 2. Open Extension
Click the Brave Capture extension icon in your browser toolbar.

### 3. Click "Extract Token Data"
- Green button in the popup
- Review the confirmation (shows cost and time)
- Click OK
- Wait for completion (don't close the tab!)

## What Happens

```
For each position:
1. Opens position drawer    [0.8s]
2. Takes screenshot         [0.1s]
3. AI extracts token data   [0.5s]
4. Saves to database        [0.1s]
5. Closes drawer            [0.3s]
-----------------------------------
Total: ~1.5 seconds per position
```

## Cost

Using Claude Haiku model (default):
- **1 position:** $0.0004 (less than a penny)
- **10 positions:** $0.004 (less than half a cent)
- **100 positions:** $0.04 (4 cents)

## Success Rate

Expected: **90%+**

Failed positions are logged in console. You can retry them later.

## What Gets Saved

For each position:
```json
{
  "token0Amount": 5.234,
  "token1Amount": 1043.21,
  "token0Percentage": 45.2,
  "token1Percentage": 54.8
}
```

## Progress Tracking

Real-time UI shows:
- Current position being processed
- Progress bar (e.g., "5/10")
- Success/failure counts
- Time elapsed

## Common Issues

### "Batch extraction only works on Orca or Uniswap pages"
**Fix:** Make sure you're on the positions page (not liquidity or swap page)

### High failure rate (>20% failed)
**Fix:** Refresh the page and try again. Check internet connection.

### "All positions already have token data"
**Good news!** This means your positions are already extracted. No action needed.

## Tips

1. **Run weekly** - Extract new positions as you add them
2. **Stable connection** - Use good internet for best results
3. **Don't close tab** - Keep the page open during extraction
4. **Check console** - Open DevTools (F12) to see detailed logs

## Need Help?

See full guide: [BATCH-EXTRACTION-GUIDE.md](BATCH-EXTRACTION-GUIDE.md)

Run tests: Copy [test-batch-extraction.js](../tests/test-batch-extraction.js) into console

## That's It!

One click. A few seconds. All your token data extracted.
