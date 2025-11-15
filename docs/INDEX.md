# Documentation Index

**Project:** Brave Capture - CLM Position Tracker
**Version:** 1.4.0
**Last Updated:** 2025-11-15

---

## 🎯 Quick Navigation

### 📍 Start Here

| Document | Purpose | Audience |
|----------|---------|----------|
| **[README.md](README.md)** | Project overview and features | Users, Developers |
| **[LLM_CONTEXT.md](LLM_CONTEXT.md)** | Complete LLM/AI agent instructions | 🤖 LLMs, AI Agents |
| **[QUICK-START.md](QUICK-START.md)** | Get started in 5 minutes | New Users |

### 🤖 For LLMs/AI Agents

**Essential Reading (in order):**
1. **[LLM_CONTEXT.md](LLM_CONTEXT.md)** - Architecture, workflows, critical patterns
2. **[CLAUDE.md](CLAUDE.md)** - Orca rotation capture workflow (CRITICAL)
3. **[AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md)** - Quality control system
4. **[PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md)** - Protocol-specific parsing strategies

**When working on specific tasks:**
- Adding protocol → [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md)
- Fixing bugs → [LLM_CONTEXT.md](LLM_CONTEXT.md) Common Tasks
- Data quality → [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md)
- Testing → [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md)

---

## 📚 Documentation by Category

### User Guides

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main project documentation |
| [QUICK-START.md](QUICK-START.md) | Quick installation and usage guide |
| [USER_GUIDE_AUTO_EXTRACTION.md](USER_GUIDE_AUTO_EXTRACTION.md) | How to use AI extraction features |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Detailed setup instructions |

### Developer Guides

| Document | Description |
|----------|-------------|
| [LLM_CONTEXT.md](LLM_CONTEXT.md) | **⚡ START HERE** - Complete context for LLMs |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Architecture and development guide |
| [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md) | Protocol parsing strategies (600+ lines) |
| [CLAUDE.md](CLAUDE.md) | Orca rotation workflow pattern |

### System Architecture

| Document | Description |
|----------|-------------|
| [AUTO_EXTRACTION_FLOW.md](AUTO_EXTRACTION_FLOW.md) | AI extraction workflow |
| [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md) | Quality control system (v1.4.0) |
| [FLOW-DIAGRAM.md](FLOW-DIAGRAM.md) | Data flow diagrams |
| [PERSISTENT_CACHE.md](PERSISTENT_CACHE.md) | Caching strategy |
| [SMART_WAITING_SYSTEM.md](SMART_WAITING_SYSTEM.md) | Wait-for-data implementation |

### Feature Documentation

| Document | Description |
|----------|-------------|
| [AI-VISION-COMPLETE.md](AI-VISION-COMPLETE.md) | AI vision extraction feature |
| [AUTOMATIC_TOKEN_EXTRACTION.md](AUTOMATIC_TOKEN_EXTRACTION.md) | Token data extraction |
| [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md) | Dashboard functionality |
| [FILE_STORAGE.md](FILE_STORAGE.md) | Screenshot storage system |
| [TIMESTAMP_FEATURE.md](TIMESTAMP_FEATURE.md) | Timestamp tracking |

### Setup & Configuration

| Document | Description |
|----------|-------------|
| [ENV_SETUP.md](ENV_SETUP.md) | Environment configuration |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | Database setup guide |
| [SECURE_RLS.md](SECURE_RLS.md) | Row-level security config |
| [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) | Production deployment |

### Testing & Verification

| Document | Description |
|----------|-------------|
| [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md) | Complete test results (v1.3.2) |
| [../tests/HOW_TO_VERIFY.md](../tests/HOW_TO_VERIFY.md) | Manual verification steps |
| [../tests/TOKEN_BALANCE_TEST_REPORT.md](../tests/TOKEN_BALANCE_TEST_REPORT.md) | Token balance testing |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | General testing guide |
| [TEST-RESULTS.md](TEST-RESULTS.md) | Historical test results |

### Changelogs & Release Notes

| Document | Description |
|----------|-------------|
| [CHANGELOG-v1.4.0.md](CHANGELOG-v1.4.0.md) | **Latest:** v1.4.0 release (QC system) |
| [CHANGELOG-v1.3.1.md](CHANGELOG-v1.3.1.md) | v1.3.1 release (Capture ID fix) |
| [CHANGELOG.md](CHANGELOG.md) | Historical changelog |
| [CHANGES.md](CHANGES.md) | Recent changes summary |

### Troubleshooting & Fixes

| Document | Description |
|----------|-------------|
| [FIX-SUMMARY.md](FIX-SUMMARY.md) | Recent fixes summary |
| [TOKEN_EXTRACTION_FIX.md](TOKEN_EXTRACTION_FIX.md) | Token extraction fixes |
| [table-alignment-fix.md](table-alignment-fix.md) | Dashboard table alignment |
| [FIX-DASHBOARD-CACHE.md](FIX-DASHBOARD-CACHE.md) | Cache invalidation fixes |
| [DEBUG_NOW.md](DEBUG_NOW.md) | Debugging guide |

### Historical/Archive

| Document | Description |
|----------|-------------|
| [BATCH-EXTRACTION-GUIDE.md](BATCH-EXTRACTION-GUIDE.md) | Batch extraction (legacy) |
| [AUTO_CAPTURE_SETUP.md](AUTO_CAPTURE_SETUP.md) | Auto capture (legacy) |
| [before-after-comparison.md](before-after-comparison.md) | Query logic comparison |
| [TOKEN-BALANCE-ANALYSIS.md](TOKEN-BALANCE-ANALYSIS.md) | Token balance investigation |

---

## 🗂️ Documentation by Use Case

### "I want to understand the project"
1. [README.md](README.md) - Overview
2. [DEVELOPMENT.md](DEVELOPMENT.md) - Architecture
3. [LLM_CONTEXT.md](LLM_CONTEXT.md) - Complete context

### "I want to use the extension"
1. [QUICK-START.md](QUICK-START.md) - Installation
2. [USER_GUIDE_AUTO_EXTRACTION.md](USER_GUIDE_AUTO_EXTRACTION.md) - Features
3. [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md) - Dashboard

### "I want to add a new protocol"
1. [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md) - Parsing strategies
2. [LLM_CONTEXT.md](LLM_CONTEXT.md) - Task 1: Add Protocol
3. [DEVELOPMENT.md](DEVELOPMENT.md) - Code structure

### "I'm an LLM working on this codebase"
1. **[LLM_CONTEXT.md](LLM_CONTEXT.md)** - START HERE ⚡
2. [CLAUDE.md](CLAUDE.md) - Orca patterns
3. [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md) - QC system
4. [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md) - Parsers

### "I need to debug an issue"
1. [LLM_CONTEXT.md](LLM_CONTEXT.md) - Common Issues
2. [DEBUG_NOW.md](DEBUG_NOW.md) - Debugging guide
3. [FIX-SUMMARY.md](FIX-SUMMARY.md) - Known fixes
4. [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md) - Test results

### "I want to understand the QC system"
1. [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md) - Complete docs
2. [CHANGELOG-v1.4.0.md](CHANGELOG-v1.4.0.md) - Release notes
3. [LLM_CONTEXT.md](LLM_CONTEXT.md) - QC workflow section

### "I want to test the extension"
1. [../tests/HOW_TO_VERIFY.md](../tests/HOW_TO_VERIFY.md) - Manual verification
2. [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md) - Test results
3. [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing procedures

---

## 📊 Document Status

### Current (v1.4.0)
- ✅ LLM_CONTEXT.md
- ✅ AUTOMATED_QC_SYSTEM.md
- ✅ CHANGELOG-v1.4.0.md
- ✅ README.md
- ✅ CLAUDE.md
- ✅ PROTOCOL_PARSERS.md

### Up-to-Date (v1.3.x)
- ✅ FINAL_VERIFICATION_REPORT.md
- ✅ TOKEN_BALANCE_TEST_REPORT.md
- ✅ HOW_TO_VERIFY.md
- ✅ DEVELOPMENT.md

### Historical (For Reference)
- 📚 BATCH-EXTRACTION-*.md
- 📚 AUTO_CAPTURE_SETUP.md
- 📚 TOKEN-BALANCE-ANALYSIS.md

---

## 🔍 Finding Information

### By Keyword

**AI / Machine Learning:**
- [AI-VISION-COMPLETE.md](AI-VISION-COMPLETE.md)
- [AUTOMATIC_TOKEN_EXTRACTION.md](AUTOMATIC_TOKEN_EXTRACTION.md)
- [AUTO_EXTRACTION_FLOW.md](AUTO_EXTRACTION_FLOW.md)

**Quality Control:**
- [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md)
- [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md)

**Protocols:**
- [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md)
- [CLAUDE.md](CLAUDE.md) (Orca specifically)

**Database:**
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- [SECURE_RLS.md](SECURE_RLS.md)
- [PERSISTENT_CACHE.md](PERSISTENT_CACHE.md)

**Dashboard:**
- [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md)
- [table-alignment-fix.md](table-alignment-fix.md)
- [FIX-DASHBOARD-CACHE.md](FIX-DASHBOARD-CACHE.md)

**Performance:**
- [PERFORMANCE-OPTIMIZATION.md](PERFORMANCE-OPTIMIZATION.md)
- [PERSISTENT_CACHE.md](PERSISTENT_CACHE.md)
- [CACHE_QUICK_START.md](CACHE_QUICK_START.md)

---

## 📝 Contributing to Documentation

### Adding New Documentation

1. **Create the file** in appropriate location:
   - User guides → `/docs`
   - Technical docs → `/docs`
   - Test reports → `/tests`

2. **Add to this index** in relevant sections

3. **Update cross-references** in related docs

4. **Follow naming convention:**
   - User guides: `FEATURE_NAME.md`
   - Technical: `TECHNICAL_TOPIC.md`
   - Changelogs: `CHANGELOG-vX.Y.Z.md`
   - Tests: `TEST_REPORT_NAME.md`

### Updating Existing Documentation

1. **Update the document**
2. **Update "Last Updated" date**
3. **Update version if applicable**
4. **Update this index if category/status changed**

---

## 🏷️ Document Tags

**Essential Documents:**
- 🤖 [LLM_CONTEXT.md](LLM_CONTEXT.md)
- 📘 [README.md](README.md)
- 🚀 [QUICK-START.md](QUICK-START.md)

**Technical Deep Dives:**
- 🔧 [DEVELOPMENT.md](DEVELOPMENT.md)
- 🔧 [PROTOCOL_PARSERS.md](PROTOCOL_PARSERS.md)
- 🔧 [AUTOMATED_QC_SYSTEM.md](AUTOMATED_QC_SYSTEM.md)

**Testing & Verification:**
- ✅ [../tests/FINAL_VERIFICATION_REPORT.md](../tests/FINAL_VERIFICATION_REPORT.md)
- ✅ [../tests/HOW_TO_VERIFY.md](../tests/HOW_TO_VERIFY.md)

**Release Notes:**
- 📋 [CHANGELOG-v1.4.0.md](CHANGELOG-v1.4.0.md)
- 📋 [CHANGELOG-v1.3.1.md](CHANGELOG-v1.3.1.md)

---

**Total Documents:** 90+
**Categories:** 10
**Status:** Maintained and Up-to-Date

**Last Index Update:** 2025-11-15
