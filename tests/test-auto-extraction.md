# Auto-Extraction Test Checklist

## Prerequisites
- [ ] Extension loaded in Chrome
- [ ] Navigated to Orca portfolio page (https://www.orca.so/pools)
- [ ] At least 5 positions visible
- [ ] API key configured in .env.local

## Test 1: List View Auto-Extraction (Primary Use Case)

### Steps
1. [ ] Open Orca portfolio page with 10+ positions
2. [ ] Click extension icon
3. [ ] Click "Capture Page Data"
4. [ ] Wait for capture to complete (~2 seconds)

### Expected Results
- [ ] Success message: "✅ Captured! File: [filename] + Screenshot"
- [ ] After 0.5 seconds, confirmation dialog appears:
  ```
  Extract token data automatically?

  Positions: [N]
  Estimated cost: $[X]
  Time: ~[Y] seconds

  This will expand each position, capture token data, and save to database.

  Click OK to start automatic extraction.
  ```
- [ ] Dialog shows correct number of positions
- [ ] Cost estimate is reasonable ($0.0005 per position)

### Steps (continued)
5. [ ] Click OK in confirmation dialog

### Expected Results (continued)
- [ ] Progress bar appears showing:
  - [ ] "Expanding [pair]... (1/N)"
  - [ ] "Capturing [pair]... (1/N)"
  - [ ] "Analyzing [pair]... (1/N)"
  - [ ] Progress percentage increases (0% → 100%)
  - [ ] Success count increments
- [ ] Positions expand/close automatically
- [ ] After completion:
  - [ ] "Batch complete! Success: N/N | Failed: 0 | Time: [X]s"
  - [ ] Progress bar disappears after 3 seconds

### Verification
```sql
-- Check if token data was saved
SELECT pair, token0_amount, token1_amount, token0_percentage, token1_percentage
FROM positions
WHERE captured_at > NOW() - INTERVAL '5 minutes'
ORDER BY captured_at DESC;
```
- [ ] All positions have non-null token amounts
- [ ] Percentages add up to 100% for each position
- [ ] Token names match pair names

## Test 2: Detail View Auto-Extraction (Single Position)

### Steps
1. [ ] Open Orca portfolio page
2. [ ] Click ONE position to expand drawer (shows token breakdown)
3. [ ] Verify token amounts visible in drawer
4. [ ] Click extension icon
5. [ ] Click "Capture Page Data"

### Expected Results
- [ ] Capture completes successfully
- [ ] NO confirmation dialog appears
- [ ] Success message: "✅ Token data extracted for [pair]"
- [ ] No manual batch extraction needed

### Verification
```sql
-- Check if single position was saved with token data
SELECT pair, token0_amount, token1_amount, token0_percentage, token1_percentage
FROM positions
ORDER BY captured_at DESC
LIMIT 1;
```
- [ ] Position has complete token data
- [ ] Data matches what was visible in drawer

## Test 3: User Declines Auto-Extraction

### Steps
1. [ ] Capture from list view (10+ positions)
2. [ ] Wait for confirmation dialog
3. [ ] Click "Cancel"

### Expected Results
- [ ] Message appears: "Token data extraction skipped. Click 'Extract Token Data' button to extract later."
- [ ] No extraction happens
- [ ] "Extract Token Data" button is still available
- [ ] User can click it manually later

## Test 4: Positions Already Have Data

### Steps
1. [ ] Capture from list view and auto-extract (complete Test 1)
2. [ ] Wait for extraction to finish
3. [ ] Capture AGAIN from same page

### Expected Results
- [ ] Confirmation dialog shows FEWER positions:
  ```
  Extract token data automatically?

  Positions: 0  <-- or very few if some failed
  ```
- [ ] OR message: "All positions already have token data"

## Test 5: AI Vision Extraction Failure (Error Handling)

### Steps
1. [ ] Temporarily disable API key (rename .env.local)
2. [ ] Rebuild extension: `npm run build:config`
3. [ ] Reload extension
4. [ ] Capture from list view
5. [ ] Confirm auto-extraction

### Expected Results
- [ ] Progress bar shows extraction attempt
- [ ] Each position shows error (not crash)
- [ ] Final message: "Batch complete! Success: 0/N | Failed: N"
- [ ] Extension doesn't crash
- [ ] Console shows clear error: "AI Vision disabled: missing ANTHROPIC_API_KEY"

### Cleanup
6. [ ] Restore .env.local
7. [ ] Rebuild: `npm run build:config`
8. [ ] Reload extension

## Test 6: Manual Button Still Works (Backward Compatibility)

### Steps
1. [ ] Capture from list view
2. [ ] Click "Cancel" on auto-extract confirmation
3. [ ] Click "Extract Token Data" button manually

### Expected Results
- [ ] Confirmation dialog appears (same as before)
- [ ] Batch extraction works normally
- [ ] Progress bar shows same UI
- [ ] All positions extracted successfully

## Console Log Checklist

During auto-extraction, console should show:

```
📊 List view detected: N positions need token data
   Will automatically extract after user confirmation

🚀 User confirmed auto-extraction, starting batch process...
📊 Getting batch positions list...
Expanding position 0 for Orca...
📸 Capturing screenshot...
🤖 Background: Analyzing screenshot to find expanded position
✅ Found expanded position: SOL/USDC
🎯 Matched SOL/USDC to SOL/USDC
✅✅ Successfully saved SOL/USDC to database!
[... repeat for each position ...]
Batch complete! Success: N/N | Failed: 0 | Time: Xs
```

## Performance Benchmarks

| Positions | Expected Time | Expected Cost |
|-----------|--------------|---------------|
| 5         | ~8 seconds   | $0.0025      |
| 10        | ~15 seconds  | $0.0050      |
| 30        | ~45 seconds  | $0.0150      |
| 50        | ~75 seconds  | $0.0250      |
| 100       | ~150 seconds | $0.0500      |

- [ ] Actual time matches expected (±20%)
- [ ] No significant slowdown during extraction

## Edge Cases

### Empty Portfolio
- [ ] Capture page with 0 positions
- [ ] No error occurs
- [ ] No auto-extract prompt

### Single Position Portfolio
- [ ] Capture page with exactly 1 position (not expanded)
- [ ] System treats as detail view
- [ ] Extraction attempted from screenshot
- [ ] If screenshot doesn't show details, fallback to batch extraction

### Very Large Portfolio (100+ positions)
- [ ] Capture shows correct count and cost
- [ ] User can decide if cost is acceptable
- [ ] Extraction completes without timeout

### Network Error During Extraction
- [ ] Disconnect network mid-extraction
- [ ] Extension handles error gracefully
- [ ] Shows which positions failed
- [ ] Can retry failed positions

## Completion Criteria

All tests must pass with:
- ✅ No JavaScript errors in console
- ✅ No crashes or freezes
- ✅ Data saved correctly to database
- ✅ UI shows appropriate feedback
- ✅ Completion rate > 95%

## Known Issues to Watch For

1. **Popup closes during extraction**: Chrome may close popup after 30s of inactivity
   - Workaround: Keep popup open manually
   - Future: Move extraction to background worker

2. **Position drawer doesn't open**: Some positions may fail to expand
   - Check: Is position clickable?
   - Check: Is there a loading state?
   - Solution: Add retry logic

3. **AI Vision misidentifies pair**: Token names don't match database
   - Check: Token normalization working?
   - Check: Fuzzy matching enabled?
   - Solution: Verify TOKEN_NORMALIZATION map in background.js

4. **Cost higher than expected**: API usage exceeds estimate
   - Check: Are we using Haiku model?
   - Check: Are we sending full screenshots?
   - Solution: Verify model parameter in extractAndSaveBalance call
