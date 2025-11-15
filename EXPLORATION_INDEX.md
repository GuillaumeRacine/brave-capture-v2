# Token Balance Display Exploration - Document Index

**Exploration Date:** November 15, 2025  
**Focus:** How token balances are displayed in Dashboard & Popup UIs  
**Status:** COMPLETE - 3 comprehensive documents generated

---

## Documents Generated

### 1. TOKEN_BALANCE_EXPLORATION.md (26KB - Main Report)
**Location:** `/Users/gui/Brave-Capture/TOKEN_BALANCE_EXPLORATION.md`

**Contents:**
- Executive summary
- Current state analysis (Dashboard & Popup implementations)
- Data layer review (getLatestPositions() function)
- Data flow diagram (text format)
- Detailed token rendering analysis (4 scenarios)
- 5 identified gaps & concerns
- Complete testing strategy
- Files requiring changes
- Implementation priority (3 phases)
- Key observations about the fix
- Summary table

**Best For:** Deep technical understanding, implementation planning, code review

---

### 2. EXPLORATION_REPORT_SUMMARY.md (14KB - Executive Summary)
**Location:** `/Users/gui/Brave-Capture/EXPLORATION_REPORT_SUMMARY.md`

**Contents:**
- Overview and key files
- Current state analysis (what works, what needs work)
- Data flow diagram
- Testing strategy
- Implementation roadmap (with time estimates)
- Code snippets for required changes
- Potential edge cases
- Conclusions

**Best For:** Quick understanding, management review, implementation planning

---

### 3. This Index Document (EXPLORATION_INDEX.md)
**Location:** `/Users/gui/Brave-Capture/EXPLORATION_INDEX.md`

**Contents:**
- Document navigation guide
- File structure reference
- Quick lookup tables

**Best For:** Finding what you need quickly

---

## Quick Reference: File Locations

### Files Analyzed

| Component | File | Key Functions | Lines |
|-----------|------|---------------|-------|
| **Dashboard** | dashboard.js | renderCLMPositions() | 300-452 |
| | | loadCLMPositions() | 175-224 |
| | | Null handling | 370-402 |
| **Popup** | popup.js | checkForMissingBalances() | 616-719 |
| | | parseBalanceText() | 722-810 |
| | | updatePositionBalance() | 813-846 |
| **Data Layer** | supabase-client.js | getLatestPositions() | 284-345 |
| | | invalidatePositionCache() | 48-54 |
| **Background** | background.js | extractAllPositionsFromScreenshot() | 521-699 |
| | | extractBalanceFromScreenshot() | 701+ |

---

## Key Findings Summary

### What Works (✅)
- Data layer correctly prioritizes positions WITH token data
- Dashboard gracefully handles NULL token data
- AI extraction properly sets null for non-expanded positions
- Popup can parse token text from pasted balance breakdowns
- Database schema supports partial data collection

### What Needs Work (❌)
- **CRITICAL:** Manual balance update doesn't save USD values
- **CRITICAL:** Cache not invalidated after manual popup updates
- **IMPORTANT:** Dashboard shows silent fallback (no visual indicator)
- **NICE-TO-HAVE:** No data quality metrics or diagnostics

---

## Implementation Checklist

### Phase 1: Critical Fixes (30 min)
- [ ] popup.js: Add token value calculation in updatePositionBalance()
- [ ] popup.js: Add cache invalidation calls after manual update
- [ ] Test with manual balance parse workflow

### Phase 2: User Clarity (45 min)
- [ ] dashboard.js: Add visual indicator for fallback 50/50 split
- [ ] dashboard.js: Add tooltip explaining missing data
- [ ] Test dashboard rendering with mixed data

### Phase 3: Diagnostics (30 min)
- [ ] Create /scripts/check-token-display.js
- [ ] Add data quality metrics to dashboard
- [ ] Add cache state debugging tools

---

## Code Locations by Function

### Token Amount Display
```
File: dashboard.js
Function: renderCLMPositions()
Location: Lines 300-452
Key Code:
  - Line 371: Token0Amount parsing
  - Line 372: Token1Amount parsing
  - Lines 370-402: Null handling logic
  - Lines 421-426: HTML rendering
```

### Manual Token Entry
```
File: popup.js
Function: checkForMissingBalances() → parseBalanceText() → updatePositionBalance()
Location: Lines 616-846
Key Code:
  - Lines 623-626: Null detection
  - Lines 741-746: Pattern matching
  - Lines 820-824: Database update (INCOMPLETE)
  - Line 826: Missing cache invalidation
```

### Data Prioritization
```
File: supabase-client.js
Function: getLatestPositions()
Location: Lines 284-345
Key Code:
  - Lines 304-305: Check for token data
  - Lines 313-315: Prefer position WITH data
  - Lines 286-293: Persistent cache
  - Lines 48-54: Cache invalidation
```

---

## Testing Quick Start

### In Extension Console (Dashboard)
```javascript
// Check what data dashboard receives
window.getLatestPositions().then(pos => {
  console.table(pos.map(p => ({
    pair: p.pair,
    hasTokenData: p.token0_amount !== null
  })));
});
```

### In Extension Console (Popup)
```javascript
// Check if manual update saved values
window.supabase
  .from('positions')
  .select('*')
  .eq('pair', 'SOL/USDC')
  .limit(1)
  .then(res => console.log(res.data[0]));
```

### HTTP Server Test
```bash
cd /Users/gui/Brave-Capture
python3 -m http.server 8000
# Visit: http://localhost:8000/dashboard.html
# Limited by: Supabase CORS restrictions
```

---

## Gap Analysis Reference

| Gap | Location | Issue | Fix | Priority |
|-----|----------|-------|-----|----------|
| Silent Fallback | dashboard.js:370-402 | No indicator when using 50/50 | Add visual cue | IMPORTANT |
| Missing Values | popup.js:820-824 | USD values not saved | Calculate & save | CRITICAL |
| Cache Not Cleared | popup.js:826 | Dashboard shows stale data | Call invalidate() | CRITICAL |
| No Diagnostics | renderCLMPositions() | Can't see data coverage | Add metrics | NICE-TO-HAVE |

---

## Code Change Summary

### popup.js Changes Required
**Location:** updatePositionBalance() [Lines 813-846]

**Add Lines:**
```javascript
token0_value: balance * (token0Pct / 100),
token1_value: balance * (token1Pct / 100),
```

**Add Calls:**
```javascript
if (window.invalidatePositionCache) window.invalidatePositionCache(...);
if (window.clearCache) window.clearCache();
```

**Impact:** Dashboard will show consistent data after manual updates

### dashboard.js Changes Recommended
**Location:** renderCLMPositions() [Lines 300-452]

**Add:**
```javascript
const hasTokenData = pos.token0Amount !== null && pos.token1Amount !== null;
```

**In HTML:**
```javascript
${!hasTokenData ? '<span title="Estimated split">⚠️</span>' : ''}
```

**Impact:** Users can distinguish real data from fallback

---

## Related Documentation

- **AI Extraction Logic:** See background.js lines 521-699
- **Database Schema:** Positions table with nullable token fields
- **Cache Strategy:** supabase-client.js lines 19-41
- **Token Normalization:** dashboard.js lines 27-55

---

## Document Navigation

**Start Here:**
- First time? Read EXPLORATION_REPORT_SUMMARY.md
- Need details? Read TOKEN_BALANCE_EXPLORATION.md
- Looking for specific code? Use EXPLORATION_INDEX.md (this document)

**For Implementation:**
- Phase 1 code changes → EXPLORATION_REPORT_SUMMARY.md section "Files Requiring Changes"
- Testing steps → Both reports have "Testing Strategy" sections
- Edge cases → TOKEN_BALANCE_EXPLORATION.md section 5

**For Review:**
- What's working → Both reports "Current State Analysis"
- What's broken → Both reports section on "What Needs Work"
- Priority → EXPLORATION_REPORT_SUMMARY.md "Implementation Roadmap"

---

## FAQ

**Q: Does the getLatestPositions() fix work correctly?**
A: YES - fully verified. It correctly prioritizes positions with token data. No changes needed.

**Q: Why doesn't manual popup update reflect in dashboard?**
A: Two issues: (1) USD values not saved, (2) cache not invalidated. Both need fixes.

**Q: Can I test dashboard without the extension?**
A: Partially - use HTTP server but Supabase API will be CORS-blocked.

**Q: What's the scope of changes needed?**
A: Phase 1 (critical): ~30 min. Phase 2 (quality): ~45 min. Phase 3 (diagnostics): ~30 min.

**Q: Are there any risks with the current implementation?**
A: Low risk. Dashboard has good fallbacks. Main issue is user confusion about data origin.

---

## Version History

| Date | Status | Key Findings |
|------|--------|--------------|
| Nov 15, 2025 | COMPLETE | 3 gaps identified, 2 critical fixes needed |

---

**Generated by:** Claude Code - Brave Capture Exploration Task  
**Files Provided:** 3 comprehensive reports + this index  
**Total Analysis Time:** Comprehensive (all files analyzed, all flows traced)
