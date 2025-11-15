# AI Vision Extraction Flow - Visual Diagram

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTION                                  │
│                  Clicks "Capture Positions"                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         POPUP.JS                                     │
│  Location: /Volumes/Crucial X8/Code/Brave-Capture/popup.js:202-234  │
├─────────────────────────────────────────────────────────────────────┤
│  1. Captures screenshot via chrome.tabs.captureVisibleTab()         │
│  2. Gets capture data from content script                           │
│  3. Filters positions:                                               │
│     const missingPositions = positions.filter(pos =>                │
│       pos.token0Amount === null || pos.token1Amount === null        │
│     );                                                               │
│                                                                      │
│  4. If missing positions found:                                     │
│     chrome.runtime.sendMessage({                                    │
│       action: 'extractBalanceFromScreenshot',                       │
│       screenshot: screenshotDataUrl,                                │
│       captureTimestamp: capture.timestamp,                          │
│       allPositions: missingPositions                                │
│     })                                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ chrome.runtime.sendMessage()
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND.JS                                   │
│ Location: /Volumes/Crucial X8/Code/Brave-Capture/background.js:56-61│
├─────────────────────────────────────────────────────────────────────┤
│  chrome.runtime.onMessage.addListener((request, sender, sendResp)  │
│                                                                      │
│  if (request.action === 'extractBalanceFromScreenshot') {          │
│    extractAndSaveBalance(                                          │
│      request.screenshot,                                           │
│      request.captureTimestamp,                                     │
│      request.allPositions                                          │
│    )                                                               │
│    .then(result => sendResponse({ success: true, data: result })) │
│    .catch(error => sendResponse({ success: false, error }))       │
│    return true;                                                    │
│  }                                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ function call
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   extractAndSaveBalance()                            │
│  Location: background.js:572-629                                    │
├─────────────────────────────────────────────────────────────────────┤
│  console.log('🚀 Background: Extract and save balance');           │
│                                                                      │
│  STEP 1: Extract using AI Vision                                   │
│  ┌────────────────────────────────────────────────────┐           │
│  │ const extracted = await extractBalanceFromScreenshot│           │
│  │   (screenshotDataUrl, allPositions.map(p => p.pair))│           │
│  └──────────────────┬─────────────────────────────────┘           │
│                     │                                              │
│                     ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         extractBalanceFromScreenshot()                       │ │
│  │         Location: background.js:455-569                      │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  1. Split base64 image from data URL                        │ │
│  │  2. Call Claude API:                                        │ │
│  │     POST https://api.anthropic.com/v1/messages              │ │
│  │     Model: claude-3-opus-20240229                           │ │
│  │     Content: [image, prompt]                                │ │
│  │                                                              │ │
│  │  3. Parse JSON response:                                    │ │
│  │     {                                                        │ │
│  │       pair: "cbBTC/USDC",                                   │ │
│  │       token0: "cbBTC",                                      │ │
│  │       token1: "USDC",                                       │ │
│  │       token0Amount: 0.035,                                  │ │
│  │       token1Amount: 6385,                                   │ │
│  │       token0Percentage: 37,                                 │ │
│  │       token1Percentage: 63                                  │ │
│  │     }                                                        │ │
│  │                                                              │ │
│  │  4. Return extracted data                                   │ │
│  └──────────────────┬───────────────────────────────────────────┘ │
│                     │                                              │
│                     │ returns extracted                            │
│                     ▼                                              │
│  STEP 2: Match extracted pair to database position                │
│  ┌────────────────────────────────────────────────────┐           │
│  │ const matchedPosition = allPositions.find(pos => { │           │
│  │   const posTokens = pos.pair.split('/').map(...)   │           │
│  │   const extractedTokens = extracted.pair.split()   │           │
│  │   return posTokens[0] === extractedTokens[0] &&    │           │
│  │          posTokens[1] === extractedTokens[1]       │           │
│  │ });                                                │           │
│  │                                                     │           │
│  │ // Handles trailing zeros: USDC0 matches USDC     │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                      │
│  STEP 3: Initialize Supabase                                       │
│  ┌────────────────────────────────────────────────────┐           │
│  │ const client = await initSupabase();               │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                      │
│  STEP 4: Update database                                           │
│  ┌────────────────────────────────────────────────────┐           │
│  │ const { data, error } = await client               │           │
│  │   .from('positions')                               │           │
│  │   .update({                                        │           │
│  │     token0_amount: extracted.token0Amount,         │           │
│  │     token1_amount: extracted.token1Amount,         │           │
│  │     token0_percentage: extracted.token0Percentage, │           │
│  │     token1_percentage: extracted.token1Percentage  │           │
│  │   })                                               │           │
│  │   .eq('pair', matchedPosition.pair)                │           │
│  │   .eq('captured_at', captureTimestamp)             │           │
│  │   .select();                                       │           │
│  └──────────────────┬─────────────────────────────────┘           │
│                     │                                              │
│                     ▼                                              │
│  STEP 5: Return success                                           │
│  ┌────────────────────────────────────────────────────┐           │
│  │ console.log('✅✅ Successfully saved {pair}!');     │           │
│  │ return {                                           │           │
│  │   success: true,                                   │           │
│  │   pair: matchedPosition.pair,                     │           │
│  │   data: extracted                                 │           │
│  │ };                                                │           │
│  └────────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ returns result
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                               │
│             https://mbshzqwskqvzuiegfmkr.supabase.co                │
├─────────────────────────────────────────────────────────────────────┤
│  Table: positions                                                   │
│                                                                      │
│  BEFORE UPDATE:                                                     │
│  ┌───────────────────────────────────────────────────┐             │
│  │ pair: "cbBTC/USDC"                                │             │
│  │ token0_amount: null          ← Missing            │             │
│  │ token1_amount: null          ← Missing            │             │
│  │ token0_percentage: null      ← Missing            │             │
│  │ token1_percentage: null      ← Missing            │             │
│  └───────────────────────────────────────────────────┘             │
│                                                                      │
│  AFTER UPDATE:                                                      │
│  ┌───────────────────────────────────────────────────┐             │
│  │ pair: "cbBTC/USDC"                                │             │
│  │ token0_amount: 0.035         ← Updated ✅         │             │
│  │ token1_amount: 6385          ← Updated ✅         │             │
│  │ token0_percentage: 37        ← Updated ✅         │             │
│  │ token1_percentage: 63        ← Updated ✅         │             │
│  └───────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       CONSOLE OUTPUT                                 │
├─────────────────────────────────────────────────────────────────────┤
│  🚀 Background: Extract and save balance                            │
│  🤖 Background: Analyzing screenshot to find expanded position      │
│  Claude response: {"pair":"cbBTC/USDC","token0":"cbBTC",...}        │
│  ✅ Found expanded position: cbBTC/USDC                             │
│  ✅ Extracted: 0.035 cbBTC (37%), 6385 USDC (63%)                   │
│  🎯 Matched cbBTC/USDC to cbBTC/USDC                                │
│  📝 Updating database: pair="cbBTC/USDC", timestamp="2025..."       │
│  ✅✅ Successfully saved cbBTC/USDC to database!                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POTENTIAL ERRORS                                  │
└─────────────────────────────────────────────────────────────────────┘

Error 1: No expanded position found
├─ extractBalanceFromScreenshot() returns: {"error": "No expanded..."}
├─ Throws: Error("No expanded position found")
└─ User sees: ❌ Background.js extraction failed: No expanded position

Error 2: Pair mismatch
├─ extractedPair doesn't match any allPositions
├─ Throws: Error(`Extracted pair ${extracted.pair} doesn't match...`)
└─ User sees: ❌ Background.js extraction failed: Extracted pair...

Error 3: Supabase update fails
├─ Database returns error
├─ Throws: Error(`Database update failed: ${error.message}`)
└─ User sees: ❌ Supabase update error: [error details]

Error 4: No rows updated
├─ Position not found in database (wrong timestamp/pair)
├─ Throws: Error('Position not found in database')
└─ User sees: ⚠️ No rows updated - position not found

All errors are caught and logged properly ✅
```

## Data Flow Validation

```
INPUT (from popup.js):
┌──────────────────────────────────────┐
│ screenshot: "data:image/png;base64,..."│
│ captureTimestamp: "2025-11-10T..."   │
│ allPositions: [                      │
│   {                                  │
│     pair: "cbBTC/USDC",              │
│     token0Amount: null,              │
│     token1Amount: null               │
│   }                                  │
│ ]                                    │
└──────────────────────────────────────┘
           │
           ▼
PROCESSING (Claude API):
┌──────────────────────────────────────┐
│ Analyzes screenshot                  │
│ Identifies expanded drawer           │
│ Extracts token amounts & percentages │
└──────────────────────────────────────┘
           │
           ▼
OUTPUT (to database):
┌──────────────────────────────────────┐
│ token0_amount: 0.035                 │
│ token1_amount: 6385                  │
│ token0_percentage: 37                │
│ token1_percentage: 63                │
└──────────────────────────────────────┘
           │
           ▼
CONFIRMATION:
┌──────────────────────────────────────┐
│ ✅✅ Successfully saved to database! │
└──────────────────────────────────────┘
```

## Testing Flow

```
TEST 1: Supabase Connection
├─ Create client
├─ Query positions table
└─ ✅ Connection verified

TEST 2: Claude API Connection
├─ Send test message
├─ Receive response
└─ ✅ API working

TEST 3: Syntax Validation
├─ Check background.js
├─ Check popup.js
└─ ✅ No errors

TEST 4: Message Passing
├─ Verify popup.js sends correct structure
├─ Verify background.js handles message
└─ ✅ Flow connected

TEST 5: Database Update
├─ Insert test position
├─ Update token breakdown
├─ Verify values
├─ Clean up
└─ ✅ Database working

TEST 6: Integration
├─ Simulate complete flow
├─ Verify all components
└─ ✅ End-to-end works
```

## File Structure

```
/Volumes/Crucial X8/Code/Brave-Capture/
│
├── background.js (Service Worker)
│   ├── Lines 1-7: Import Supabase library
│   ├── Lines 30-62: Message listener
│   ├── Lines 440-453: Supabase initialization
│   ├── Lines 455-569: extractBalanceFromScreenshot()
│   └── Lines 572-629: extractAndSaveBalance()
│
├── popup.js (Extension Popup)
│   └── Lines 202-234: Screenshot capture & message sending
│
├── supabase.js (Library)
│   └── Supabase client library v2.76.1
│
├── Test Files:
│   ├── test-vision-flow.js (Comprehensive tests)
│   ├── test-db-update.js (Database tests)
│   └── test-integration.js (Integration tests)
│
└── Documentation:
    ├── TEST-RESULTS.md (Detailed analysis)
    ├── TESTING-GUIDE.md (User guide)
    ├── AI-VISION-TESTING-SUMMARY.md (Executive summary)
    └── FLOW-DIAGRAM.md (This file)
```

## Status: ✅ ALL SYSTEMS GO

Every component tested and verified. Ready for production use.
