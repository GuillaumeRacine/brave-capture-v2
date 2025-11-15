# How to Use the Subagent Workflow - Quick Guide

## 🎯 Purpose

This document shows you how to kick off the autonomous LLM workflow that will research, implement, test, debug, and document changes WITHOUT constant back-and-forth with you.

---

## ⚡ Quick Start (Easiest Way)

Just use the `/sub` slash command:

```
/sub add batch screenshot processing that captures all visible positions at once
```

### What Happens:

**Step 0 - Clarification (if needed):**
If your request is ambiguous, I'll ask you questions FIRST:
```
Before launching subagents, I need to clarify:
1. Should batch processing happen sequentially or in parallel?
2. Which protocols should support batch mode? (All, or just Orca?)
3. How should errors be handled? (Fail all, or continue on error?)
```

You answer → I launch subagents with complete instructions.

**Steps 1-7 - Autonomous Execution:**
- Explore the codebase
- Plan the implementation
- Implement the code
- Test autonomously
- Debug if needed
- Document everything
- Present you with simple verification steps

**Why this matters:** Subagents can't ask questions mid-execution. They're stateless and return a single report. So I gather all info FIRST, then they execute autonomously.

---

## 💬 How Questions Work

### Important: Subagents Can't Ask Questions

**Technical Reality:**
- Subagents are **stateless** - they run once and return a report
- They **cannot** interact with you during execution
- They **cannot** ask clarifying questions mid-task
- They complete autonomously and return results

**Solution: Two-Phase Approach**

**Phase 1 - Main Agent Clarifies (Interactive):**
```
You → "/sub add Uniswap V3 support"

Main Agent (me) → "I need to clarify before launching subagents:
1. Which networks? (Ethereum, Arbitrum, Optimism, Base?)
2. Track LP positions only, or also staking rewards?
3. Priority: Fee tiers or APY tracking?"

You → [Answer questions]

Main Agent → [Documents decisions]
```

**Phase 2 - Subagents Execute (Autonomous):**
```
Main Agent → [Launches Explore subagent with complete context]
Explore Subagent → [Works autonomously, returns findings]

Main Agent → [Reviews findings, launches Plan subagent]
Plan Subagent → [Creates plan, documents assumptions]

Main Agent → [If Plan found issues, asks you for guidance]
Main Agent → [Once confirmed, launches Implementation]
... continues through all steps
```

### When Will You Be Asked Questions?

**Before subagents launch:**
- ✅ Ambiguous requirements
- ✅ Multiple valid implementation approaches
- ✅ Technical choices (which library, API version, etc.)
- ✅ Feature scope or priority

**During subagent execution (rare):**
- ✅ Subagent discovers unexpected blocker
- ✅ Subagent finds multiple architectural options
- ✅ Critical information turns out to be missing

**You will NOT be asked:**
- ❌ To run tests (automated)
- ❌ To check syntax (automated)
- ❌ To verify files exist (automated)
- ❌ For progress updates (autonomous)

---

## 📋 The Master Prompt (Manual Alternative)

```
I need you to implement [YOUR FEATURE/FIX] using the subagent workflow.

CRITICAL REQUIREMENTS:
1. Use subagents to research, implement, test, debug, and document autonomously
2. Chain subagents in sequence: Explore → Plan → Implement → Test → Debug → Document
3. NEVER ask user to test - test autonomously first
4. ONLY involve user when testing is impossible without their environment
5. Minimize user effort - they should only reload/verify at the very end

WORKFLOW:
1. EXPLORE (subagent_type=Explore, thoroughness=very thorough)
   - Understand existing codebase
   - Identify all files that need changes
   - Map dependencies and integration points

2. PLAN (subagent_type=Plan, thoroughness=medium)
   - Create detailed implementation plan
   - Identify test requirements
   - Plan validation strategy

3. IMPLEMENT (subagent_type=general-purpose)
   - Write/modify code
   - Update all references
   - Ensure consistency across files

4. TEST (subagent_type=general-purpose)
   - Create automated test scripts
   - Run tests autonomously
   - Validate changes work as expected

5. DEBUG (subagent_type=general-purpose, only if tests fail)
   - Analyze test failures
   - Fix issues found
   - Re-run tests until passing

6. DOCUMENT (subagent_type=general-purpose)
   - Update all .md files
   - Document changes in CHANGELOG.md
   - Add troubleshooting guide
   - Update quick-start guides

7. VERIFY (subagent_type=general-purpose)
   - Final comprehensive verification
   - Check all references updated
   - Confirm no broken links
   - Validate documentation accuracy

DELIVERABLE:
Present user with:
- Summary of what was done
- Test results showing everything works
- Simple 1-2 step instructions for final verification (e.g., "reload extension")
- Documentation references

Feature/Fix to implement: [DESCRIBE YOUR TASK HERE]
```

---

## 🚀 Example Usage

### Example 1: Add a New Feature

```
/sub add batch screenshot processing that captures all visible positions at once and processes them in parallel
```

### Example 2: Fix a Bug

```
/sub fix dashboard not refreshing automatically when new positions are captured
```

### Example 3: Refactor Code

```
/sub refactor Claude API integration to support multiple AI models (Opus/Sonnet/Haiku) with automatic fallback
```

### Example 4: Add Protocol Support

```
/sub add support for Uniswap V3 protocol with position tracking and fee tier detection
```

---

## ✅ What You'll Get Back

Instead of:
```
❌ AI: "Can you check if the file exists?"
❌ AI: "Can you run this command and tell me the output?"
❌ AI: "Can you test this change?"
❌ AI: "Did it work?"
```

You'll get:
```
✅ AI: "Fixed! Here's what I did:

1. EXPLORED: Found 3 files that needed changes
2. PLANNED: Created implementation strategy
3. IMPLEMENTED: Updated background.js, popup.js, dashboard.js
4. TESTED: Created test-batch-capture.js - all tests passing
5. DEBUGGED: Fixed timing issue in batch processing
6. DOCUMENTED: Updated CHANGELOG.md, added BATCH-CAPTURE.md
7. VERIFIED: All references correct, no console errors

Test results:
✅ Syntax validation passed (node --check)
✅ File references verified (grep test passed)
✅ Database tests passed (test-batch-capture.js)
✅ Integration tests passed

To verify: Reload extension in brave://extensions/"
```

---

## 🔑 Key Benefits

1. **Save Your Time**
   - No back-and-forth testing
   - No manual verification steps
   - You only reload/verify at the end

2. **Higher Quality**
   - Automated testing catches issues early
   - Comprehensive documentation
   - All references verified

3. **Faster Development**
   - Parallel subagent execution
   - Systematic debugging
   - No waiting for your responses

4. **Complete Documentation**
   - CHANGELOG.md updated
   - Troubleshooting guides created
   - Quick-start references added

---

## 📚 Related Files

- `SUBAGENT-WORKFLOW-PROMPT.md` - Complete technical reference
- `AI-VISION-COMPLETE.md` - Implementation guide with testing requirements
- `QUICK-START.md` - Quick reference with workflow reminder
- `CHANGELOG.md` - Version history

---

## 💡 Tips

### DO:
✅ Copy the full master prompt template
✅ Be specific about what you want
✅ Let the LLM work through all steps autonomously
✅ Only respond when asked for final verification

### DON'T:
❌ Break the task into manual steps
❌ Ask for intermediate progress updates
❌ Test manually before LLM has finished
❌ Skip the CRITICAL REQUIREMENTS section

---

## 🎯 The Big Idea

**Old way (frustrating):**
```
You → "Fix dashboard"
AI → "Can you check the console?"
You → [checks console, reports error]
AI → "Can you run this command?"
You → [runs command, reports output]
AI → "Can you test this change?"
You → "ok this is really a big waste of my time"
```

**New way (efficient):**
```
You → "/sub fix dashboard"
[LLM works autonomously for 5-10 minutes]
AI → "Fixed! Reload extension to verify."
You → [reloads, done in 10 seconds]
```

---

**Remember:** The goal is to minimize YOUR effort. The LLM should do ALL the testing and verification work autonomously, and you should only be needed for the final "reload and verify" step.

---

**Version:** 1.0
**Created:** 2025-11-11
**Purpose:** Enable efficient autonomous development with minimal user interruption
