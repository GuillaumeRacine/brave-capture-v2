# Batch Extraction Flow Diagram

## High-Level Flow

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │ Clicks "Extract Token Data"
       ↓
┌─────────────────────────────────────────┐
│            POPUP.JS                     │
│  ┌───────────────────────────────────┐  │
│  │ 1. Check protocol page            │  │
│  │ 2. Get batch positions list ────────────→ CONTENT.JS
│  │ 3. Filter positions needing data  │  │
│  │ 4. Calculate cost estimate        │  │
│  │ 5. Show confirmation dialog       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
       │ User clicks OK
       ↓
┌─────────────────────────────────────────┐
│      BATCH EXTRACTION LOOP              │
│  (FOR EACH POSITION)                    │
│  ┌───────────────────────────────────┐  │
│  │ Step 1: Expand Position           │  │
│  │ popup.js → content.js ───────────────────→ CONTENT.JS
│  │                                   │  │     │
│  │ Step 2: Wait for drawer           │  │     │ Click row
│  │ (800ms)                           │  │     │ Wait for animation
│  │                                   │  │     │
│  │ Step 3: Capture screenshot        │  │     │
│  │ popup.js → Chrome API             │  │     │
│  │                                   │  │     │
│  │ Step 4: Extract with AI           │  │     │
│  │ popup.js → background.js ─────────────────→ BACKGROUND.JS
│  │                                   │  │          │
│  │ Step 5: Save to database          │  │          │ Claude API
│  │ background.js → Supabase          │  │          │ Supabase
│  │                                   │  │          │
│  │ Step 6: Close position            │  │          │
│  │ popup.js → content.js ───────────────────→ CONTENT.JS
│  │                                   │  │     │
│  │ Step 7: Update progress UI        │  │     │ Close drawer
│  │ (progress bar, counts)            │  │     │
│  │                                   │  │     │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
       │ All positions processed
       ↓
┌─────────────────────────────────────────┐
│      COMPLETION                         │
│  - Show success/fail summary            │
│  - Display total time                   │
│  - Log results to console               │
└─────────────────────────────────────────┘
```

## Detailed Component Flow

### 1. Initialization Phase

```
USER
  │
  ↓ Click "Extract Token Data"
POPUP.JS
  │
  ├→ Check: Is this Orca or Uniswap page?
  │   ├→ YES: Continue
  │   └→ NO: Show error "Batch extraction only works on..."
  │
  ├→ Send message: "getBatchPositions"
  │   ↓
  │  CONTENT.JS
  │   ├→ detectProtocol()
  │   ├→ getOrcaBatchPositions() or getUniswapBatchPositions()
  │   │   └→ Query DOM for position rows/cards
  │   │   └→ Extract pair names
  │   │   └→ Mark needsExtraction: true
  │   └→ Return list of positions
  │
  ├→ Filter positions where needsExtraction = true
  │
  ├→ Calculate cost: count × $0.002
  │
  └→ Show confirmation dialog
       "Extract token data for N positions?"
       "Estimated cost: $X"
       "Time: ~Y seconds"
       │
       ↓ User clicks OK
      START EXTRACTION
```

### 2. Extraction Loop Phase

```
FOR EACH POSITION (i = 0 to N-1):
  │
  ├→ Update UI: "Extracting {i+1}/{N}: {pair}"
  │
  ├→ EXPAND POSITION
  │   │
  │   POPUP.JS → CONTENT.JS
  │   Message: "expandPosition", index: i, protocol: "Orca"
  │   │
  │   CONTENT.JS
  │   ├→ expandOrcaPosition(i)
  │   │   ├→ Find row: document.querySelectorAll('table tbody tr')[i]
  │   │   ├→ Click row: row.click()
  │   │   └→ Wait for drawer: waitForOrcaDrawer()
  │   │       └→ Poll for: document.querySelector('[role="dialog"]')
  │   │       └→ Wait 300ms for content to load
  │   │       └→ Return success
  │   │
  │   └→ Return: {success: true}
  │
  ├→ WAIT: 800ms (drawer animation)
  │
  ├→ CAPTURE SCREENSHOT
  │   │
  │   POPUP.JS
  │   └→ chrome.tabs.captureVisibleTab()
  │       └→ Format: PNG, Quality: 90
  │       └→ Returns: base64 data URL
  │
  ├→ EXTRACT WITH AI
  │   │
  │   POPUP.JS → BACKGROUND.JS
  │   Message: "extractBalanceFromScreenshot"
  │   Data: {screenshot, captureTimestamp, allPositions, model}
  │   │
  │   BACKGROUND.JS
  │   ├→ extractBalanceFromScreenshot()
  │   │   ├→ Prepare prompt for Claude
  │   │   ├→ Send to Anthropic API
  │   │   │   Model: claude-3-haiku-20240307
  │   │   │   Input: base64 image + prompt
  │   │   │   Output: JSON with token data
  │   │   └→ Parse response
  │   │       {pair, token0Amount, token1Amount, ...}
  │   │
  │   └→ extractAndSaveBalance()
  │       ├→ Match extracted pair to database position
  │       └→ Save to Supabase
  │           UPDATE positions
  │           SET token0_amount = X,
  │               token1_amount = Y,
  │               token0_percentage = P1,
  │               token1_percentage = P2
  │           WHERE pair = "{pair}"
  │             AND captured_at BETWEEN t-5s AND t+5s
  │       └→ Return: {success: true, pair: "..."}
  │
  ├→ CHECK RESULT
  │   ├→ SUCCESS: successCount++
  │   └→ FAILURE: failedCount++, log error
  │
  ├→ CLOSE POSITION
  │   │
  │   POPUP.JS → CONTENT.JS
  │   Message: "closePosition", protocol: "Orca"
  │   │
  │   CONTENT.JS
  │   └→ closeOrcaPosition()
  │       ├→ Find close button: [aria-label*="close"]
  │       ├→ Click button OR press Escape
  │       └→ Wait 300ms for close animation
  │
  ├→ UPDATE UI
  │   ├→ Progress bar: {i+1}/{N} × 100%
  │   └→ Stats: "Success: X | Failed: Y"
  │
  └→ WAIT: 300ms (before next position)
```

### 3. Completion Phase

```
ALL POSITIONS PROCESSED
  │
  POPUP.JS
  ├→ Calculate duration: (endTime - startTime) / 1000
  │
  ├→ Show completion message
  │   "Batch complete!"
  │   "Success: {successCount}/{total}"
  │   "Failed: {failedCount}"
  │   "Time: {duration}s"
  │
  ├→ Update progress UI
  │   └→ Final stats displayed
  │
  ├→ Log to console
  │   ├→ Successful positions
  │   └→ Failed positions with errors
  │
  └→ Auto-hide progress bar after 3 seconds
```

## Error Handling Flow

```
AT ANY STEP:
  │
  ├→ TRY operation
  │
  └→ CATCH error
      │
      ├→ Log error to console
      │   console.error(`Error processing {pair}:`, error)
      │
      ├→ Increment failedCount
      │
      ├→ Try to close drawer
      │   (cleanup before next position)
      │
      └→ CONTINUE to next position
          (DON'T fail entire batch)

NETWORK TIMEOUT:
  │
  └→ After 10 seconds
      ├→ Log timeout
      ├→ Mark as failed
      └→ Continue to next

DATABASE SAVE FAILED:
  │
  └→ Retry once
      ├→ SUCCESS: Mark as success
      └→ FAILURE: Log error, mark as failed, continue

USER CLOSES PAGE:
  │
  └→ Extension context lost
      └→ Gracefully stop
          └→ Save progress so far
```

## Message Passing Architecture

```
POPUP.JS (UI Context)
    ↕ chrome.tabs.sendMessage()
CONTENT.JS (Page Context)

POPUP.JS (UI Context)
    ↕ chrome.runtime.sendMessage()
BACKGROUND.JS (Service Worker)

BACKGROUND.JS (Service Worker)
    ↕ fetch()
ANTHROPIC API

BACKGROUND.JS (Service Worker)
    ↕ supabase client
SUPABASE DATABASE
```

## Data Flow

```
DOM (Orca Page)
    ↓ User clicks row
Drawer opens with token data
    ↓ Screenshot
Base64 image
    ↓ Send to Background
Claude API
    ↓ AI Vision
Extracted JSON
    ↓ Parse and match
Database record
    ↓ UPDATE query
Supabase
    ↓ Confirmation
User sees success
```

## Timing Diagram

```
Time (ms)   Action                          Context
────────────────────────────────────────────────────────
0           User clicks "Extract Token Data" POPUP.JS
50          Get positions from page         CONTENT.JS
100         Show confirmation dialog        POPUP.JS
[User delay]
0           User confirms                   POPUP.JS
50          Expand position 1               CONTENT.JS
100         Click row                       CONTENT.JS
800         Wait for drawer                 CONTENT.JS
900         Drawer fully open               CONTENT.JS
1000        Capture screenshot              POPUP.JS
1100        Send to background              BACKGROUND.JS
1200        Call Claude API                 ANTHROPIC
1700        Receive response                ANTHROPIC
1800        Parse JSON                      BACKGROUND.JS
1900        Save to database                SUPABASE
2000        Close drawer                    CONTENT.JS
2300        Drawer closed                   CONTENT.JS
2400        Update UI                       POPUP.JS
───────────────────────────────────────────────────────
2400        Total time for 1 position

× N positions = ~2400ms × N total time
```

## Success Path (Happy Case)

```
1. User on Orca positions page ✅
2. Extension loaded ✅
3. Positions visible in table ✅
4. User clicks "Extract Token Data" ✅
5. Positions detected (N positions) ✅
6. Cost calculated ($X) ✅
7. User confirms ✅
8. FOR EACH POSITION:
   a. Row clicked ✅
   b. Drawer opens ✅
   c. Screenshot captured ✅
   d. AI extracts data ✅
   e. Database updated ✅
   f. Drawer closed ✅
   g. Progress shown ✅
9. All positions complete ✅
10. Summary displayed ✅
11. Success rate: 90%+ ✅
```

## Failure Paths

```
CASE 1: Wrong page
  User not on Orca/Uniswap
  ↓
  Show error message
  ↓
  STOP

CASE 2: No positions found
  DOM query returns empty
  ↓
  Show "No positions found"
  ↓
  STOP

CASE 3: User cancels
  User clicks Cancel in confirmation
  ↓
  STOP

CASE 4: Position won't expand
  Row click doesn't open drawer
  ↓
  Wait timeout (2s)
  ↓
  Mark as failed
  ↓
  SKIP to next position

CASE 5: AI extraction fails
  Claude API error or can't parse
  ↓
  Log error
  ↓
  Mark as failed
  ↓
  SKIP to next position

CASE 6: Database save fails
  Supabase error
  ↓
  Retry once
  ↓
  If still fails: Log error, mark as failed
  ↓
  SKIP to next position

CASE 7: User closes page
  Tab closed during extraction
  ↓
  Extension context lost
  ↓
  STOP gracefully
  ↓
  Already-extracted positions saved ✅
```

## Protocol-Specific Flows

### Orca Flow
```
Position Expansion:
  1. Find: document.querySelectorAll('table tbody tr')
  2. Click: row[index].click()
  3. Wait: document.querySelector('[role="dialog"]')
  4. Verify: Drawer contains token percentages

Position Closing:
  1. Find: button[aria-label*="close"]
  2. Click: closeButton.click()
  3. Fallback: Press Escape key
  4. Wait: 300ms
```

### Uniswap Flow
```
Position Expansion:
  1. Find: document.querySelectorAll('.position-card')
  2. Click: card[index].click()
  3. Wait: 500ms
  4. Verify: Details panel visible

Position Closing:
  1. Find: button[aria-label*="close"]
  2. Click: closeButton.click()
  3. Fallback: Press Escape key
  4. Wait: 300ms
```

## Summary

The batch extraction system is designed with:
- **Robustness:** Error recovery at every step
- **Transparency:** Real-time progress feedback
- **Efficiency:** Optimized timing and cost
- **Reliability:** 90%+ success rate
- **Usability:** Simple one-click operation

All components work together through well-defined message passing and error handling to provide a seamless user experience.
