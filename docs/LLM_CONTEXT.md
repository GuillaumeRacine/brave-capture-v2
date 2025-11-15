# LLM Context & Instructions for Brave Capture

**Project:** Brave Capture - CLM Position Tracker
**Version:** 1.4.0
**Last Updated:** 2025-11-15

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Critical Workflows](#critical-workflows)
4. [Data Quality & QC](#data-quality--qc)
5. [Protocol-Specific Rules](#protocol-specific-rules)
6. [Database Schema](#database-schema)
7. [Common Tasks](#common-tasks)
8. [Debugging](#debugging)
9. [Key Files](#key-files)
10. [Testing](#testing)

---

## Project Overview

**Purpose:** Chrome extension that captures DeFi CLM (Concentrated Liquidity Market Maker) positions from 9 protocols across 6+ blockchains.

**Key Features:**
- Multi-protocol support (Orca, Raydium, Aerodrome, Cetus, Hyperion, Beefy, PancakeSwap, Uniswap, Ekubo)
- AI-powered data extraction using Claude Sonnet 4.5
- Automated quality control system
- Historical tracking with Supabase database
- Dashboard with real-time metrics

**Tech Stack:**
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Backend:** Chrome Extension APIs (Manifest V3)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API (Sonnet 4.5)
- **Build:** Node.js scripts

---

## Architecture

### Extension Components

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface                        │
├─────────────────────────────────────────────────────────┤
│  popup.html/js     │  Dashboard (dashboard.html/js)     │
│  (Capture trigger) │  (Position visualization)          │
└──────────┬──────────┴────────────────┬──────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│              Content Scripts (content.js)               │
│  - DOM parsing                                          │
│  - Protocol detection                                   │
│  - Data extraction                                      │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│          Background Worker (background.js)              │
│  - Screenshot capture                                   │
│  - AI vision extraction                                 │
│  - Automated QC                                         │
│  - Database operations                                  │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│         Database Layer (supabase-client.js)             │
│  - Query logic                                          │
│  - Caching (persistent)                                 │
│  - Cache invalidation                                   │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Database                          │
│  Tables: captures, positions                            │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Capture Workflow:**
```
User clicks "Capture" → content.js parses DOM → background.js captures screenshot
→ AI extracts data → Auto QC runs → Save to database → Cache invalidated
→ Dashboard fetches latest → Display updated positions
```

---

## Critical Workflows

### 1. Orca Rotation Capture Workflow ⚠️ CRITICAL

**IMPORTANT:** Orca's UI only shows token breakdown for ONE position at a time via a side panel.

**UI Structure:**
```
Main List (Left)          Side Panel (Right - ONE position)
├─ SOL/USDC    $18,654   ┌──────────────────────────┐
├─ PUMP/SOL    $8,744    │ SOL/USDC Details         │
├─ JLP/USDC    $9,661    │ Token Breakdown:         │
├─ cbBTC/USDC  $9,520    │ • 96.8 SOL  ($13,616)    │
└─ whETH/SOL   $9,068    │ • 5,029 USDC ($5,028)    │
                         └──────────────────────────┘
```

**Rotation Capture Strategy:**
1. User takes 5 separate captures (one per position)
2. Each capture has ONE position expanded with side panel
3. Each capture saves 5 positions to database:
   - 1 position with complete token data (side panel open)
   - 4 positions with null token data (not expanded)
4. After 5 captures, database has complete data for all positions

**AI Extraction Rules:**
- ✅ Extract token data ONLY from the side panel
- ✅ Identify which position has the side panel open
- ✅ Set token data to null for all other positions
- ❌ NEVER try to extract token data from the main list

**Expected Behavior:**
- It's NORMAL for 4 out of 5 positions to have null token data per capture
- This is NOT a bug - it's the intended workflow

### 2. Automated Quality Control (Auto QC)

**Runs automatically after EVERY capture** (background.js:719-813)

**QC Checks:**
1. **MISSING_TOKEN_NAMES** → Auto-fix by splitting pair string
2. **INVALID_PERCENTAGES** → Auto-fix by recalculating from token values
3. **BALANCE_MISMATCH** → Warning only (investigate data quality)
4. **WRONG_CATEGORY** → Fixed by dashboard filter (CLM protocols only)

**Console Output:**
```
🔍 Running Automated QC...
✅ QC: Fixed missing token names for SOL/USDC → "SOL", "USDC"
📊 QC Summary: 5 issues detected, 5 auto-fixed
```

**Manual QC Tool:**
```bash
node scripts/auto-qc-workflow.js --all 10  # Check 10 recent captures
```

### 3. Cache Invalidation Strategy

**Persistent Cache:**
- Dashboard loads positions from cache for instant display
- Cache persists until new capture for that position arrives
- Cache invalidation triggers on `saveCapture()` call

**Implementation:** (supabase-client.js:48-62)
```javascript
function invalidatePositionCache(protocol, pair) {
  cache.latestPositionsMap.delete(`${protocol}-${pair}`);
  cache.latestPositions = null;  // CRITICAL: Clear array cache too
}
```

---

## Data Quality & QC

### Auto-Fixable Issues

| Issue | Detection | Fix Method |
|-------|-----------|------------|
| Missing token0/token1 | `!pos.token0 \|\| !pos.token1` | Split `pos.pair` string |
| Invalid percentages | `Math.abs(sum - 100) > 0.5` | Recalculate from token values |

### Non-Fixable Issues (Manual)

| Issue | Why Not Fixable | Resolution |
|-------|----------------|------------|
| Missing token amounts | No data source | Requires AI re-extraction with expanded position |
| Balance mismatch | Data quality issue | Investigate capture data |

### Quality Control Script

**Location:** `scripts/auto-qc-workflow.js`

**4-Agent Workflow:**
1. **AGENT 1: Validate** - Check capture data integrity
2. **AGENT 2: Detect** - Find data quality issues
3. **AGENT 3: Auto-Fix** - Apply fixes for known issues
4. **AGENT 4: Verify** - Confirm all issues resolved

**Usage:**
```bash
# Check specific capture
node scripts/auto-qc-workflow.js capture_1763235363579_qhmr843vw

# Check 5 most recent
node scripts/auto-qc-workflow.js --all

# Check 20 most recent
node scripts/auto-qc-workflow.js --all 20
```

---

## Protocol-Specific Rules

### Orca (Solana)
- **Rotation Capture Required:** Token data only visible in side panel
- **AI Extraction:** Match side panel to specific pair, null for others
- **Query Logic:** `getLatestPositions()` prioritizes positions WITH token data

### Beefy Finance (Multi-chain)
- **Always In-Range:** Vault strategies don't have traditional ranges
- **Set `inRange: true`** for all Beefy positions (no range concept)
- **Filter:** Display positions >= $1,000 only

### Hyperliquid (Perpetuals)
- **NOT CLM:** This is a hedge/collateral protocol
- **Filter:** Excluded from CLM section via protocol filter
- **Dashboard:** Should appear in "Hedges/Collateral" section

### Morpho (Lending)
- **NOT CLM:** This is a hedge/collateral protocol
- **Filter:** Excluded from CLM section via protocol filter

---

## Database Schema

### Tables

**captures:**
```sql
- id (text, primary key)
- url (text)
- title (text)
- timestamp (timestamptz)
- protocol (text)
- data (jsonb)
- screenshot (text, base64)
```

**positions:**
```sql
- id (serial, primary key)
- capture_id (text, foreign key → captures.id)
- protocol (text)
- pair (text)
- token0 (text)           -- Individual token names
- token1 (text)
- token0_amount (numeric)
- token1_amount (numeric)
- token0_value (numeric)
- token1_value (numeric)
- token0_percentage (numeric)
- token1_percentage (numeric)
- balance (numeric)
- pending_yield (numeric)
- apy (numeric)
- current_price (numeric)
- range_min (numeric)
- range_max (numeric)
- in_range (boolean)
- captured_at (timestamptz)
```

### Key Queries

**Get Latest Positions (with token data prioritization):**
```javascript
// supabase-client.js:292-353
// Logic: Prioritize positions WITH token data when available
// If no token data exists, fall back to most recent position
```

---

## Common Tasks

### Task 1: Add New Protocol Support

**Files to modify:**
1. `content.js` - Add protocol detection and parser function
2. `manifest.json` - Add URL permissions and content script matches
3. `docs/PROTOCOL_PARSERS.md` - Document parsing strategy

**Steps:**
1. Identify protocol URL pattern
2. Analyze DOM structure
3. Write parser function following existing patterns
4. Add to `captureCurrentPage()` switch statement
5. Test with real positions
6. Document in PROTOCOL_PARSERS.md

### Task 2: Fix Data Quality Issue

**Steps:**
1. Run QC script to identify issue: `node scripts/auto-qc-workflow.js --all 10`
2. Check if issue is auto-fixable (see QC checks above)
3. If auto-fixable:
   - Issue is likely already fixed by inline QC
   - Verify in dashboard
4. If not auto-fixable:
   - Investigate root cause in capture data
   - May require AI extraction fix or manual cleanup

### Task 3: Debug AI Extraction

**Files to check:**
1. `background.js:525-650` - AI extraction function
2. Console logs - Look for "🤖 AI Vision" messages
3. Database - Check `positions` table for saved data

**Common issues:**
- **Token data null:** Expected for Orca unless side panel is open
- **Wrong token names:** Check AI prompt in background.js
- **Missing positions:** Check AI response parsing

**Debug commands:**
```bash
# Check last 5 captures
node scripts/check-last-5-captures.js

# Verify AI extraction results
node scripts/verify-ai-extraction.js
```

### Task 4: Update Dashboard Display

**Files to modify:**
1. `dashboard.html` - Structure and CSS
2. `dashboard.js` - Data loading and rendering

**Remember:**
- Filter CLM positions by protocol (lines 191-196)
- Apply $1,000 minimum balance filter for display
- Don't filter for metrics calculations
- Clear cache after changes: `window.clearCache()`

---

## Debugging

### Console Logs

**Extension popup:**
```javascript
// Check what data was captured
console.log('Captured positions:', positions);
```

**Background worker:**
```javascript
// Check AI extraction
console.log('AI extracted:', extractedPositions);
// Check QC results
console.log('QC Summary:', issuesDetected, issuesFixed);
```

**Dashboard:**
```javascript
// Check loaded data
window.getLatestPositions().then(console.table);
// Check cache status
window.hasCachedData(); // true/false
// Clear cache
window.clearCache();
```

### Common Issues

**Issue:** Dashboard shows "Token 0/Token 1"
**Fix:** Auto QC should fix this. If not, run: `node scripts/auto-qc-workflow.js --all`

**Issue:** Hyperliquid in CLM section
**Fix:** Already fixed in v1.4.0 with protocol filter (dashboard.js:193)

**Issue:** Stale data after new capture
**Fix:** Cache invalidation bug - fixed in v1.4.0 (supabase-client.js:58-60)

**Issue:** Percentages don't sum to 100%
**Fix:** Auto QC recalculates from token values

---

## Key Files

### Core Extension Files

| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| popup.js | Capture trigger UI | 200 | `captureCurrentPage()` |
| content.js | Protocol parsers | 1500 | `captureOrcaCLM()`, etc. |
| background.js | AI + QC + DB | 900 | `extractAllPositionsFromScreenshot()`, `runAutoQC()` |
| supabase-client.js | Data layer | 460 | `getLatestPositions()`, `invalidatePositionCache()` |
| dashboard.js | Position display | 600 | `loadCLMPositions()`, `renderCLMPositions()` |

### Configuration Files

| File | Purpose |
|------|---------|
| manifest.json | Extension config, permissions, version |
| config.js | Supabase credentials |
| .env.local | Environment variables (Supabase + Anthropic API keys) |

### Documentation Files

| File | Purpose |
|------|---------|
| docs/AUTOMATED_QC_SYSTEM.md | QC architecture and usage |
| docs/CHANGELOG-v1.4.0.md | v1.4.0 release notes |
| docs/PROTOCOL_PARSERS.md | Protocol parsing strategies |
| docs/CLAUDE.md | Orca workflow pattern for LLMs |
| tests/FINAL_VERIFICATION_REPORT.md | Testing results |

### Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| scripts/auto-qc-workflow.js | Automated QC | `node scripts/auto-qc-workflow.js --all 10` |
| scripts/check-last-5-captures.js | Verify rotation workflow | `node scripts/check-last-5-captures.js` |
| scripts/test-latest-positions-query.js | Test query logic | `node scripts/test-latest-positions-query.js` |

---

## Testing

### Manual Testing

**1. Capture Test:**
```
1. Navigate to Orca portfolio
2. Expand one position (side panel opens)
3. Click extension icon → "Capture Current Page"
4. Check console for:
   - ✅ "Extracted & saved 5 positions"
   - ✅ "Running Automated QC"
   - ✅ "QC Summary: X issues detected, Y auto-fixed"
5. Open dashboard
6. Verify position shows correct token names
```

**2. QC Test:**
```bash
node scripts/auto-qc-workflow.js --all 3
```

**Expected output:**
```
📊 Batch Summary:
   Total captures processed: 3
   Passed QC: 3
   Total issues fixed: 15
```

### Automated Tests

**Token Balance Display:**
```bash
node scripts/test-token-balance-display.js
```

**Query Logic:**
```bash
node scripts/test-latest-positions-query.js
```

---

## Subagent Workflow

**When working on this codebase as a subagent:**

1. **Read Context First:**
   - Read this file (LLM_CONTEXT.md)
   - Read relevant protocol docs (PROTOCOL_PARSERS.md)
   - Read CLAUDE.md for Orca-specific patterns

2. **Understand the Task:**
   - Is it a bug fix? Check QC system first
   - Is it a new feature? Check existing patterns
   - Is it a protocol addition? Follow Task 1 above

3. **Make Changes:**
   - Follow existing code patterns
   - Add console.log statements for debugging
   - Update relevant documentation

4. **Test Autonomously:**
   - Run QC script if data-related
   - Use node scripts for verification
   - Only request user test if browser action needed

5. **Document:**
   - Update CHANGELOG if significant change
   - Update protocol docs if parser changed
   - Update this file if workflow changed

---

## Version History

**v1.4.0 (Current)** - 2025-11-15
- Automated QC system
- Token name extraction fix
- Protocol filtering
- Cache invalidation fix

**v1.3.2** - Token balance display improvements
**v1.3.1** - Capture ID foreign key fix
**v1.3.0** - AI vision token extraction
**v1.2.0** - Performance optimization
**v1.1.0** - Initial multi-protocol support

---

## Quick Reference Commands

```bash
# QC - Check data quality
node scripts/auto-qc-workflow.js --all 10

# Verification - Check captures
node scripts/check-last-5-captures.js

# Testing - Query logic
node scripts/test-latest-positions-query.js

# Build - Generate config
node build-config.js

# Dashboard - Clear cache (in browser console)
window.clearCache()
```

---

**For detailed information, see:**
- Architecture: `/docs/DEVELOPMENT.md`
- Protocol Parsers: `/docs/PROTOCOL_PARSERS.md`
- QC System: `/docs/AUTOMATED_QC_SYSTEM.md`
- Testing: `/tests/FINAL_VERIFICATION_REPORT.md`
