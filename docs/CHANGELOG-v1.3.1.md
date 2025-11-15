# Changelog v1.3.1 - Critical Bug Fixes & Orca Workflow Documentation

## 🐛 Critical Fixes

### 1. Fixed Database Constraint Violation (capture_id)
**Problem:** AI extraction was failing with database error:
```
null value in column "capture_id" of relation "positions" violates not-null constraint
```

**Root Cause:**
- The `positions` table requires `capture_id` as a foreign key
- AI extraction function wasn't receiving or including this field in database inserts

**Fix:**
- ✅ `popup.js`: Pass `capture.id` to background worker
- ✅ `background.js`: Accept `captureId` parameter in message handler
- ✅ `background.js`: Include `capture_id` in database insert statement

**Files Changed:**
- `popup.js:194` - Added `captureId: capture.id` to message
- `background.js:91` - Pass `request.captureId` to function
- `background.js:521` - Added `captureId` parameter to function signature
- `background.js:636` - Added `capture_id: captureId` to insert

### 2. Fixed Duplicate Position Records
**Problem:** Each capture created duplicate positions in database:
- "SOL/USDC" (from AI extraction)
- "SOL/USDC0" (from DOM parser)

**Root Cause:**
- Both `supabase-client.js` AND `background.js` were inserting positions
- DOM parser added "0" suffix to token names
- AI extraction didn't have "0" suffix
- Result: 2 separate position records per position per capture

**Fix:**
- ✅ Disabled DOM-based position insertion in `supabase-client.js`
- ✅ AI extraction now handles ALL position saving
- ✅ Cleared 417 duplicate positions from database

**Files Changed:**
- `supabase-client.js:95-134` - Commented out position insertion code
- `scripts/clear-positions.js` - Created cleanup script

### 3. Enhanced AI Prompt for Orca Side Panel Pattern
**Problem:** AI wasn't consistently recognizing which position had the expanded side panel

**Fix:**
- ✅ Added explicit "IMPORTANT - Orca UI Pattern" section to AI prompt
- ✅ Explained left/main list vs right side panel structure
- ✅ Clarified that only ONE position has expanded panel at a time
- ✅ Required AI to identify which position and only extract token data for that one

**Files Changed:**
- `background.js:525-559` - Updated AI prompt with detailed Orca UI explanation

## 📚 Documentation Added

### Comprehensive Orca Workflow Documentation
Created extensive documentation in `docs/CLAUDE.md` explaining:

1. **Orca UI Structure:**
   - Main list (left): Shows all positions with basic data
   - Side panel (right): Shows detailed token breakdown for ONE position
   - Visual ASCII diagram of the layout

2. **Rotation Capture Workflow:**
   - User takes N captures for N positions
   - Each capture has ONE position expanded
   - Example walkthrough with 5 positions
   - Database behavior after multiple captures

3. **Expected AI Behavior:**
   - Extract complete token data for expanded position
   - Set token data to null for all other positions
   - Example JSON output showing correct pattern

4. **Common Mistakes to Avoid:**
   - Why null token data is expected (not a bug)
   - Why we can't extract all token data in one screenshot
   - Understanding the rotation workflow

**Files Changed:**
- `docs/CLAUDE.md:5-132` - Added comprehensive Orca section
- `background.js:506-519` - Added inline code comments explaining workflow

## 🧪 Testing

### Verification Script
Created `scripts/verify-ai-extraction.js` to check:
- ✅ Latest capture has positions saved
- ✅ Positions have correct capture_id
- ✅ Token data presence/absence
- ✅ Summary statistics

**Usage:**
```bash
node scripts/verify-ai-extraction.js
```

### Expected Behavior After Fix

**Single Capture (e.g., SOL/USDC expanded):**
```
✅ Found 5 positions from AI extraction:

1. SOL/USDC
   Token 0 Amount: 96.796    ✅ Complete data
   Token 1 Amount: 5028.69   ✅ Complete data
   Token Breakdown: 73% / 27%

2. PUMP/SOL
   Token 0 Amount: N/A       ✅ Expected (not expanded)
   Token 1 Amount: N/A

3. JLP/USDC
   Token 0 Amount: N/A       ✅ Expected (not expanded)
   ...

📊 Summary:
   Total positions: 5
   With complete token data: 1    ✅ Correct (only expanded position)
   Missing token data: 4          ✅ Correct (not expanded)
```

**After 5 Rotation Captures:**
All 5 positions should have at least one record with complete token data in database.

## 🔄 Migration Required

If you have existing data with duplicate positions:

```bash
# Clear all positions
node scripts/clear-positions.js

# Reload extension
# chrome://extensions/ → Click reload

# Take fresh captures
```

## 📝 Version History

- **v1.3.0** - AI Vision token extraction implementation
- **v1.3.1** - Critical fixes: capture_id constraint, duplicate positions, enhanced Orca documentation

## 🎯 Next Steps

After reloading the extension and taking fresh captures:

1. Verify no capture_id errors in console
2. Verify no duplicate positions in database
3. Verify exactly ONE position per capture has token data
4. After N captures of N positions, verify all have complete data

## 📖 References

- Full workflow documentation: `docs/CLAUDE.md`
- AI extraction function: `background.js:extractAllPositionsFromScreenshot()`
- Verification script: `scripts/verify-ai-extraction.js`
