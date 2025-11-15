# Claude Code Notes & Configuration

## Important Rules - REMEMBER FOREVER

### Orca Token Extraction: Rotation Capture Workflow

**CRITICAL: Understanding the Orca UI Pattern**

Orca's portfolio page shows multiple CLM positions, but token breakdown data is ONLY visible when you manually expand ONE position at a time via a side panel/drawer:

#### UI Structure:
```
┌─────────────────────────────────────────────────────────────┐
│ Main List (Left)          │  Side Panel (Right - Optional)  │
│                            │                                 │
│ ✓ SOL/USDC    $18,654    │  ┌───────────────────────────┐ │
│   PUMP/SOL    $8,744     │  │ SOL/USDC Details          │ │
│   JLP/USDC    $9,661     │  │                           │ │
│   cbBTC/USDC  $9,520     │  │ Balance: $18,654          │ │
│   whETH/SOL   $9,068     │  │                           │ │
│                            │  │ Token Breakdown:          │ │
│                            │  │ • 96.8 SOL ($13,616) 73%  │ │
│                            │  │ • 5,029 USDC ($5,028) 27% │ │
│                            │  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Facts:**
- Main list ALWAYS shows: pair, balance, APY, yield, price, range
- Main list NEVER shows: individual token amounts, token values, token percentages
- Side panel ONLY appears when user clicks/expands ONE position
- Side panel shows: token amounts, token USD values, token percentages
- **ONLY ONE position can have the side panel open at a time**

#### User's Rotation Capture Workflow:

The user takes **multiple captures** (one per position) to collect complete token data:

**Example with 5 positions:**

1. **Capture 1**: Expand SOL/USDC → Take screenshot
   - SOL/USDC: ✅ Complete token data (side panel open)
   - PUMP/SOL: ❌ Token data = null (not expanded)
   - JLP/USDC: ❌ Token data = null (not expanded)
   - cbBTC/USDC: ❌ Token data = null (not expanded)
   - whETH/SOL: ❌ Token data = null (not expanded)

2. **Capture 2**: Expand PUMP/SOL → Take screenshot
   - SOL/USDC: ❌ Token data = null (not expanded)
   - PUMP/SOL: ✅ Complete token data (side panel open)
   - JLP/USDC: ❌ Token data = null (not expanded)
   - cbBTC/USDC: ❌ Token data = null (not expanded)
   - whETH/SOL: ❌ Token data = null (not expanded)

3. **Capture 3**: Expand JLP/USDC → Take screenshot
   - (Pattern continues...)

4. **Capture 4**: Expand cbBTC/USDC → Take screenshot
5. **Capture 5**: Expand whETH/SOL → Take screenshot

**After all 5 captures**, the database has complete token data for ALL 5 positions.

#### Database Behavior:

Since we save ALL positions from EVERY capture:
- Each capture creates 5 position records (one per visible position)
- Only 1 of those 5 records has complete token data
- The other 4 have null token amounts/values/percentages
- **This is EXPECTED and CORRECT behavior**

When displaying positions on the dashboard:
- Query: `getLatestPositions()` - gets most recent record for each pair
- Each pair will eventually have at least one record with complete token data
- If a position was never expanded, it will only have records with null token data

#### AI Extraction Requirements:

The AI prompt in `background.js:extractAllPositionsFromScreenshot()` MUST:

1. **Identify the side panel** in the screenshot (usually right side of screen)
2. **Match the side panel to a specific pair** (read the pair name in the panel header)
3. **Extract complete token data ONLY for that one pair**
4. **Set token data to null for all other pairs**

**Example AI output (Capture 1 with SOL/USDC expanded):**
```json
[
  {
    "pair": "SOL/USDC",
    "balance": 18654,
    "token0Amount": 96.8,        // ✅ From side panel
    "token1Amount": 5029,        // ✅ From side panel
    "token0Value": 13616,        // ✅ From side panel
    "token1Value": 5028,         // ✅ From side panel
    "token0Percentage": 73,      // ✅ From side panel
    "token1Percentage": 27       // ✅ From side panel
  },
  {
    "pair": "PUMP/SOL",
    "balance": 8744,
    "token0Amount": null,        // ❌ No side panel
    "token1Amount": null,        // ❌ No side panel
    "token0Value": null,         // ❌ No side panel
    "token1Value": null,         // ❌ No side panel
    "token0Percentage": null,    // ❌ No side panel
    "token1Percentage": null     // ❌ No side panel
  }
  // ... other positions with null token data
]
```

#### Common Mistakes to Avoid:

❌ **WRONG**: "Why is token data null? This is a bug!"
✅ **RIGHT**: "Token data is null because the side panel isn't open for this position. This is expected."

❌ **WRONG**: "Let me try to extract token data from the main list"
✅ **RIGHT**: "Token data is ONLY visible in the side panel, not the main list. If no panel is open, all token data should be null."

❌ **WRONG**: "The AI should extract token data for all positions in one screenshot"
✅ **RIGHT**: "The AI can only extract token data for ONE position per screenshot (the one with the open side panel)."

#### Visual Reference:

When looking at an Orca screenshot:
- **Left/Main area**: Position list (compact rows with basic info)
- **Right side**: Side panel/drawer (expanded details for ONE position)
- The side panel will show text like:
  - "Balance breakdown"
  - Token symbols with amounts (e.g., "96.8 SOL")
  - USD values (e.g., "$13,616")
  - Percentages (e.g., "73%")

### Beefy Finance Positions
**ALWAYS treat Beefy positions as "in range"**
- Beefy Finance uses vault strategies, not traditional CLM ranges
- The concept of "in range" vs "out of range" doesn't apply to Beefy vaults
- When displaying or calculating metrics, Beefy positions should ALWAYS be marked as `inRange: true`
- This affects:
  - Position rendering (should show green "✓ In Range" badge)
  - In-range count statistics
  - Risk calculations

### CLM Position Display Filters
**Hide positions under $1,000 in CLM dashboard**
- Only display CLM positions where `balance >= 1000`
- This keeps the dashboard clean and focused on meaningful positions
- Small positions (dust) should be filtered out before rendering
- This filter applies to:
  - CLM positions card expanded view
  - Position count metrics
  - Total value calculations should INCLUDE all positions
  - But position LIST should only show >= $1,000

## Implementation Notes

### Current Status
- ✅ Beefy positions need to be hardcoded as `inRange: true` in the capture parser
- ✅ Dashboard rendering needs to filter positions < $1,000 before display
- ⚠️ Make sure total value calculations include ALL positions (no filter)
- ⚠️ Make sure in-range count includes Beefy (always counted as in-range)

### Code Locations to Update
1. `content.js` - Beefy CLM parser (`captureBeefyCLMPositions`)
   - Set `inRange: true` for all Beefy positions

2. `dashboard-v2.js` - CLM position rendering
   - Filter positions before display: `clmPositions.filter(p => parseFloat(p.balance) >= 1000)`
   - Keep unfiltered for metrics calculations

3. Database
   - Positions table should still store all positions (including < $1,000)
   - Filter only happens at display time
