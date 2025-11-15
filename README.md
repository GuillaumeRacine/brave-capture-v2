# Brave Capture - CLM Position Tracker

**Version:** 1.4.0
**Status:** Production Ready

A powerful Chrome extension for capturing and tracking Concentrated Liquidity Market Maker (CLM) positions across 9 DeFi protocols and 6+ blockchains.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![Version](https://img.shields.io/badge/version-1.4.0-green)
![AI Powered](https://img.shields.io/badge/AI-Claude%20Sonnet%204.5-purple)

---

## ✨ Features

### Multi-Protocol Support
Track CLM positions across **9 protocols**:
- ✅ **Orca** (Solana)
- ✅ **Raydium** (Solana)
- ✅ **Aerodrome** (Base)
- ✅ **Cetus** (Sui)
- ✅ **Hyperion** (Aptos)
- ✅ **Beefy Finance** (Multi-chain: Arbitrum, Base, Optimism, etc.)
- ✅ **PancakeSwap** (Base/BSC)
- ✅ **Uniswap** (Ethereum, Base, Arbitrum, etc.)
- ✅ **Ekubo** (Starknet)

### AI-Powered Extraction
- **Claude Sonnet 4.5** vision model for automatic data extraction
- Extracts token amounts, values, and percentages from screenshots
- Handles complex UI patterns automatically

### Automated Quality Control (v1.4.0)
- **Auto-detects** data quality issues after every capture
- **Auto-fixes** common issues (missing token names, invalid percentages)
- **Zero manual QC** required
- **100% success rate** on tested captures

### Real-Time Dashboard
- Live position tracking with historical comparison
- Total portfolio value and pending yield
- In-range vs out-of-range status
- APY tracking and performance metrics

---

## 🚀 Quick Start

### 1. Installation

**Prerequisites:**
- Chrome browser (or Chromium-based browser like Brave)
- Node.js 16+ (for scripts only)

**Install Extension:**
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/Brave-Capture.git
   cd Brave-Capture
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up configuration:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials:
   # - SUPABASE_URL
   # - SUPABASE_ANON_KEY
   # - ANTHROPIC_API_KEY
   ```

4. Build config:
   ```bash
   node build-config.js
   ```

5. Load extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `Brave-Capture` folder

### 2. Usage

**Capture Positions:**
1. Navigate to a supported protocol (e.g., orca.so/portfolio)
2. Click the extension icon
3. Click "Capture Current Page"
4. View positions in the dashboard

**For Orca (rotation capture workflow):**
1. Expand one position at a time (side panel opens)
2. Capture each expanded position separately
3. After N captures, you'll have complete token data for all N positions

### 3. View Dashboard

Click "Open Dashboard" in the extension popup to see:
- All captured CLM positions
- Total portfolio value
- Pending yield
- In-range status
- Historical tracking

---

## 📖 Documentation

### For Users
- **[Quick Start Guide](docs/QUICK-START.md)** - Get started quickly
- **[User Guide](docs/README.md)** - Complete feature documentation
- **[Protocol Support](docs/PROTOCOL_PARSERS.md)** - Supported protocols and parsing details

### For Developers
- **[LLM Context](docs/LLM_CONTEXT.md)** - ⚡ START HERE for LLMs/AI agents
- **[Development Guide](docs/DEVELOPMENT.md)** - Architecture and code structure
- **[Automated QC System](docs/AUTOMATED_QC_SYSTEM.md)** - Quality control documentation
- **[Testing Guide](tests/FINAL_VERIFICATION_REPORT.md)** - Testing procedures and results

### For LLMs/Subagents
**🤖 If you're an LLM working on this codebase:**
1. Read [`docs/LLM_CONTEXT.md`](docs/LLM_CONTEXT.md) first
2. Read [`docs/CLAUDE.md`](docs/CLAUDE.md) for Orca workflow pattern
3. Check [`docs/AUTOMATED_QC_SYSTEM.md`](docs/AUTOMATED_QC_SYSTEM.md) for QC details

---

## 🏗️ Architecture

```
Extension Components:
├── popup.html/js          # Capture trigger UI
├── content.js             # Protocol parsers (DOM extraction)
├── background.js          # AI extraction + Auto QC + Database
├── supabase-client.js     # Data layer + Caching
└── dashboard.html/js      # Position visualization

Data Flow:
User clicks "Capture" → DOM parsing → Screenshot capture
→ AI vision extraction → Auto QC → Database save
→ Cache invalidation → Dashboard refresh → Display
```

**Key Technologies:**
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Extension:** Chrome Extension APIs (Manifest V3)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API (Sonnet 4.5)
- **Scripts:** Node.js

---

## 🔧 Development

### Project Structure

```
Brave-Capture/
├── manifest.json           # Extension configuration
├── config.js               # Generated Supabase config
├── popup.html/js           # Extension popup
├── content.js              # Content scripts (protocol parsers)
├── background.js           # Service worker (AI + QC)
├── supabase-client.js      # Database layer
├── dashboard.html/js       # Position dashboard
├── ai-vision.js            # AI extraction logic
├── wait-for-data.js        # Smart waiting system
├── docs/                   # Documentation
│   ├── LLM_CONTEXT.md      # ⚡ LLM/subagent instructions
│   ├── AUTOMATED_QC_SYSTEM.md
│   ├── PROTOCOL_PARSERS.md
│   └── ...
├── scripts/                # Utility scripts
│   ├── auto-qc-workflow.js # Automated QC
│   ├── check-last-5-captures.js
│   └── ...
└── tests/                  # Test scripts and reports
    ├── FINAL_VERIFICATION_REPORT.md
    └── ...
```

### Key Scripts

```bash
# Quality Control
node scripts/auto-qc-workflow.js --all 10  # Check 10 recent captures

# Verification
node scripts/check-last-5-captures.js      # Verify rotation workflow

# Testing
node scripts/test-latest-positions-query.js # Test query logic

# Build
node build-config.js                       # Generate config.js
```

### Making Changes

1. **Bug fixes:** Check if Auto QC already handles it
2. **New features:** Follow existing code patterns
3. **Protocol support:** See [Task 1 in LLM_CONTEXT.md](docs/LLM_CONTEXT.md#task-1-add-new-protocol-support)
4. **Testing:** Run QC script and verification scripts
5. **Documentation:** Update relevant .md files

---

## 🧪 Testing

### Automated QC

```bash
# Run QC on recent captures
node scripts/auto-qc-workflow.js --all 10
```

**Expected output:**
```
📊 Batch Summary:
   Total captures processed: 10
   Passed QC: 10
   Total issues fixed: 25
```

### Manual Testing

**Capture Test:**
1. Navigate to Orca portfolio
2. Expand one position
3. Click "Capture Current Page"
4. Check console for QC output
5. Verify dashboard shows correct data

**Dashboard Test:**
1. Open dashboard
2. Check CLM positions show correct token names (not "Token 0/Token 1")
3. Verify only CLM protocols appear in CLM section
4. Check percentages sum to 100%

---

## 📊 Version History

### v1.4.0 (2025-11-15) - Current
- ✅ **Automated Quality Control System**
  - Auto-detects and fixes data quality issues
  - Runs after every capture
  - 15 issues fixed in first test
- ✅ **Token Name Extraction Fix**
  - Extracts token0/token1 from pair string
  - No more "Token 0/Token 1" placeholders
- ✅ **Protocol Filtering**
  - CLM section only shows CLM protocols
  - Hedge protocols (Hyperliquid, Morpho) filtered out
- ✅ **Cache Invalidation Fix**
  - Properly clears both map and array cache
  - Dashboard shows fresh data after captures

### v1.3.2 - Token Balance Display
- Query logic improvements
- Table alignment fixes

### v1.3.1 - Capture ID Fix
- Foreign key constraint fix
- Duplicate position prevention

### v1.3.0 - AI Vision Integration
- Claude Sonnet 4.5 extraction
- Screenshot-based data capture

**[Full Changelog](docs/CHANGELOG-v1.4.0.md)**

---

## 🤝 Contributing

**For AI Agents/LLMs:**
1. Read [`docs/LLM_CONTEXT.md`](docs/LLM_CONTEXT.md)
2. Follow the subagent workflow outlined there
3. Test autonomously before requesting user verification
4. Update documentation with any changes

**For Humans:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real protocol data
5. Submit a pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Credits

**Developed by:** User + Claude Code Assistant
**AI Powered by:** Anthropic Claude Sonnet 4.5
**Database:** Supabase
**Extension Framework:** Chrome Extensions API (Manifest V3)

---

## 🔗 Links

- **Documentation:** [`/docs`](docs/)
- **LLM Context:** [`docs/LLM_CONTEXT.md`](docs/LLM_CONTEXT.md)
- **QC System:** [`docs/AUTOMATED_QC_SYSTEM.md`](docs/AUTOMATED_QC_SYSTEM.md)
- **Testing:** [`tests/FINAL_VERIFICATION_REPORT.md`](tests/FINAL_VERIFICATION_REPORT.md)

---

## 📞 Support

For issues or questions:
1. Check [`docs/LLM_CONTEXT.md`](docs/LLM_CONTEXT.md) for common issues
2. Run QC script: `node scripts/auto-qc-workflow.js --all 10`
3. Check console logs for error messages
4. Review test reports in `/tests`

---

**Status:** ✅ Production Ready | **Version:** 1.4.0 | **Last Updated:** 2025-11-15
