// Dashboard V2 - Mobile-First Collapsible Cards
// Global state
let clmPositions = [];
let hedgePositions = [];
let collateralPositions = [];

// Format timestamp as "X min/hours/days ago"
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = new Date();
  const capturedAt = new Date(timestamp);
  const diffMs = now - capturedAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

// Token normalization mapping - synchronized with background.js
const TOKEN_NORMALIZATION = {
  // BTC variants
  'WBTC': 'BTC', 'wBTC': 'BTC', 'xBTC': 'BTC', 'cbBTC': 'BTC', 'CBBTC': 'BTC',
  // ETH variants
  'WETH': 'ETH', 'wETH': 'ETH', 'whETH': 'ETH', 'WHETH': 'ETH', 'stETH': 'ETH',
  'STETH': 'ETH', 'wstETH': 'ETH', 'WSTETH': 'ETH',
  // USDC variants
  'USDC.e': 'USDC', 'USDC.E': 'USDC', 'USDbC': 'USDC',
  // Orca-specific "0" suffixes
  'USDC0': 'USDC', 'SOL0': 'SOL', 'USDT0': 'USDT', 'BTC0': 'BTC', 'ETH0': 'ETH',
  // Common OCR/extraction errors
  'JPL': 'JLP', 'JLF': 'JLP'
};

function normalizeToken(token) {
  if (!token) return token;

  // Remove whitespace and convert to uppercase for comparison
  let normalized = token.trim().toUpperCase();

  // Remove trailing "0" suffix (Orca adds these)
  normalized = normalized.replace(/0+$/, '');

  // Apply token normalization mapping
  normalized = TOKEN_NORMALIZATION[normalized] || normalized;

  return normalized;
}

// Toggle card expansion
function toggleCard(cardId) {
  const card = document.getElementById(cardId);
  const isExpanded = card.classList.contains('expanded');

  if (isExpanded) {
    card.classList.remove('expanded');
    card.querySelector('.toggle-text').textContent = 'Expand';
  } else {
    card.classList.add('expanded');
    card.querySelector('.toggle-text').textContent = 'Collapse';
  }
}

// Initialize dashboard
async function initDashboard() {
  console.log('🚀 Initializing Dashboard V2...');

  try {
    // Attach CSP-safe click handlers for card toggles
    document.querySelectorAll('.card-header[data-target]')
      .forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-target');
          if (id) toggleCard(id);
        });
      });

    // Check if we have cached data - if yes, use it immediately for instant load
    const hasCached = typeof window.hasCachedData === 'function' && window.hasCachedData();
    if (hasCached) {
      console.log('⚡ Loading from persistent cache (instant load)');
    } else {
      console.log('🔍 No cache available, fetching from database (first load)');
    }

    await loadAllPositions();
    updateUnifiedSummary();
  } catch (error) {
    console.error('❌ Error initializing dashboard:', error);
  }

  // Listen for new captures to auto-refresh dashboard
  try {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && request.action === 'captureComplete') {
          console.log('🔄 New capture detected, refreshing affected positions only');

          // Specific positions will have been invalidated by saveCapture()
          // We just need to reload to get the fresh data
          loadAllPositions().then(() => {
            updateUnifiedSummary();
            sendResponse && sendResponse({ success: true });
          });
          return true; // keep channel open
        }
      });
    }
  } catch (e) {
    console.warn('Dashboard: could not attach runtime message listener', e);
  }
}

// Load all position types
async function loadAllPositions() {
  console.log('📊 Loading all positions...');

  try {
    // Load CLM positions first (from positions table with cache)
    await loadCLMPositions();

    // ALWAYS fetch captures for hedge/collateral positions
    // The captures are cached for 5 minutes, so this is fast on subsequent loads
    let captures = [];
    try {
      captures = await window.getCaptures({ limit: 100 });
      console.log(`📦 Loaded ${captures?.length || 0} captures (cached for hedge/collateral data)`);
    } catch (e) {
      console.warn('⚠️ Failed to load captures, continuing with CLM positions only:', e?.message || e);
      captures = [];
    }

    // Load Hedge positions (from captures)
    if (captures && captures.length > 0) {
      await loadHedgePositions(captures);
    } else {
      hedgePositions = [];
      renderHedgePositions();
    }

    // Load Collateral positions (from captures)
    if (captures && captures.length > 0) {
      await loadCollateralPositions(captures);
    } else {
      collateralPositions = [];
      renderCollateralPositions();
    }

  } catch (error) {
    console.error('Error loading positions:', error);
    showEmptyStates();
  }
}

// Load CLM Positions
async function loadCLMPositions() {
  console.log('💎 Loading CLM positions...');

  try {
    // Load from positions table to get all latest positions (with cache support)
    if (typeof window.getLatestPositions === 'function') {
      const allPositions = await window.getLatestPositions();

      // Check if this was cached (getLatestPositions logs this internally)
      const wasCached = typeof window.hasCachedData === 'function' && window.hasCachedData();
      if (wasCached) {
        console.log('📊 Loaded', allPositions.length, 'positions from cache (instant)');
      } else {
        console.log('📊 Loaded', allPositions.length, 'positions from database');
      }

      // CRITICAL FIX: Filter for CLM protocols only
      // Exclude hedge protocols like Hyperliquid, Morpho, Aave
      const CLM_PROTOCOLS = ['Orca', 'Raydium', 'Aerodrome', 'Cetus', 'Hyperion', 'PancakeSwap', 'Uniswap', 'Ekubo', 'Beefy'];
      const positions = allPositions.filter(pos => CLM_PROTOCOLS.includes(pos.protocol));

      console.log(`Filtered to ${positions.length} CLM positions (excluded ${allPositions.length - positions.length} hedge/collateral positions)`);

      clmPositions = positions.map(pos => ({
        pair: pos.pair,
        protocol: pos.protocol,
        token0: pos.token0,
        token1: pos.token1,
        token0Amount: pos.token0_amount,
        token1Amount: pos.token1_amount,
        token0Value: pos.token0_value,
        token1Value: pos.token1_value,
        token0Percentage: pos.token0_percentage,
        token1Percentage: pos.token1_percentage,
        balance: pos.balance,
        pendingYield: pos.pending_yield,
        apy: pos.apy,
        rangeMin: pos.range_min,
        rangeMax: pos.range_max,
        currentPrice: pos.current_price,
        inRange: pos.in_range,
        rangeStatus: pos.range_status,
        capturedAt: pos.captured_at
      }));
    } else {
      console.error('⚠️ getLatestPositions not available - cannot load positions');
      clmPositions = [];
    }

    console.log(`Found ${clmPositions.length} CLM positions`);
    renderCLMPositions();
  } catch (error) {
    console.error('Error loading CLM positions:', error);
    clmPositions = [];
    renderCLMPositions();
  }
}

// Load Hedge Positions
async function loadHedgePositions(captures) {
  console.log('🛡️ Loading hedge positions...');

  const hedgeCaptures = captures
    .filter(c => c.protocol === 'Hyperliquid' && c.data?.content?.hyperliquidPositions)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (hedgeCaptures.length === 0) {
    console.log('No hedge positions found');
    hedgePositions = [];
    renderHedgePositions();
    return;
  }

  const latestCapture = hedgeCaptures[0];
  hedgePositions = latestCapture.data.content.hyperliquidPositions.positions || [];

  console.log(`Found ${hedgePositions.length} hedge positions`);
  renderHedgePositions();
}

// Load Collateral Positions
async function loadCollateralPositions(captures) {
  console.log('🏦 Loading collateral positions...');

  collateralPositions = [];

  // Get latest Aave capture with detailed logging
  const aaveCaptures = captures
    .filter(c => c.protocol === 'Aave' && c.data?.content?.aavePositions)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  console.log(`Found ${aaveCaptures.length} Aave captures`);

  if (aaveCaptures.length > 0) {
    const aaveData = aaveCaptures[0].data.content.aavePositions;
    console.log('Aave data structure:', aaveData);
    console.log('Aave positions count:', aaveData.positions?.length || 0);

    const aavePositions = (aaveData.positions || []).map(p => ({
      ...p,
      protocol: 'Aave',
      healthFactor: aaveData.summary?.healthFactor || 'N/A'
    }));
    collateralPositions.push(...aavePositions);
    console.log('Added', aavePositions.length, 'Aave positions');
  }

  // Get latest Morpho capture with detailed logging
  const morphoCaptures = captures
    .filter(c => c.protocol === 'Morpho' && c.data?.content?.morphoPositions)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  console.log(`Found ${morphoCaptures.length} Morpho captures`);

  if (morphoCaptures.length > 0) {
    const morphoData = morphoCaptures[0].data.content.morphoPositions;
    console.log('Morpho data structure:', morphoData);
    console.log('Morpho positions count:', morphoData.positions?.length || 0);

    const morphoPositions = (morphoData.positions || []).map(p => ({
      ...p,
      protocol: 'Morpho'
    }));
    collateralPositions.push(...morphoPositions);
    console.log('Added', morphoPositions.length, 'Morpho positions');
  }

  console.log(`Total collateral positions: ${collateralPositions.length}`);
  renderCollateralPositions();
}

// Render CLM Positions
function renderCLMPositions() {
  const list = document.getElementById('clmPositionList');

  if (clmPositions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No CLM positions</div><div class="empty-state-subtext">Capture data from supported protocols</div></div>';
    updateCLMMetrics();
    return;
  }

  // IMPORTANT: Filter out positions under $1,000 for display only
  // Total value calculations should still include all positions
  const displayPositions = clmPositions.filter(pos => parseFloat(pos.balance) >= 1000);

  if (displayPositions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">No positions >= $1,000</div><div class="empty-state-subtext">All positions are below the display threshold</div></div>';
    updateCLMMetrics();
    return;
  }

  // Create header row
  const headerRow = `
    <div class="position-header-row">
      <div class="position-header">
        <span class="header-label">Pair</span>
      </div>
      <div class="position-details">
        <div class="position-detail balance">
          <span class="header-label">Balance</span>
        </div>
        <div class="position-detail token">
          <span class="header-label">Token 0</span>
        </div>
        <div class="position-detail token">
          <span class="header-label">Token 1</span>
        </div>
        <div class="position-detail yield">
          <span class="header-label">Yield</span>
        </div>
        <div class="position-detail apy">
          <span class="header-label">APY</span>
        </div>
      </div>
      <div class="price-range-container">
        <span class="header-label">Price Range</span>
      </div>
    </div>
  `;

  const positionRows = displayPositions.map(pos => {
    const inRange = pos.inRange;
    const rangeStatus = inRange ? 'in-range' : 'out-of-range';
    const rangeText = inRange ? '✓ In Range' : '✗ Out of Range';
    const balance = parseFloat(pos.balance) || 0;
    const pendingYield = parseFloat(pos.pendingYield) || 0;
    const apy = parseFloat(pos.apy) || 0;

    // Calculate position of current price within range
    const minPrice = parseFloat(pos.rangeMin) || 0;
    const maxPrice = parseFloat(pos.rangeMax) || 0;
    const currentPrice = parseFloat(pos.currentPrice) || 0;

    let tickPosition = 50; // default to middle
    if (minPrice && maxPrice && currentPrice) {
      const range = maxPrice - minPrice;
      const priceFromMin = currentPrice - minPrice;
      tickPosition = (priceFromMin / range) * 100;
      // Clamp between 0 and 100
      tickPosition = Math.max(0, Math.min(100, tickPosition));
    }

    // Format token amounts
    const token0Amount = parseFloat(pos.token0Amount) || 0;
    const token1Amount = parseFloat(pos.token1Amount) || 0;
    let token0Value = parseFloat(pos.token0Value) || 0;
    let token1Value = parseFloat(pos.token1Value) || 0;

    // Derive value split from amounts + current price if USD values are missing or inconsistent
    let token0Pct = 0, token1Pct = 0;
    const sumTokenUsd = (token0Value || 0) + (token1Value || 0);
    const hasInconsistentUsd = balance > 0 && sumTokenUsd > balance * 1.2; // clearly off

    if ((sumTokenUsd === 0 || hasInconsistentUsd) && token0Amount && token1Amount && currentPrice) {
      // Assume currentPrice is token1 per token0 (e.g., USDC per ARB, STRK per ETH)
      const t0_in_t1_units = token0Amount * currentPrice;
      const total_in_t1_units = t0_in_t1_units + token1Amount;
      if (total_in_t1_units > 0) {
        token0Pct = (t0_in_t1_units / total_in_t1_units) * 100;
        token1Pct = 100 - token0Pct;
        // Allocate USD values proportionally
        token0Value = balance * (token0Pct / 100);
        token1Value = balance * (token1Pct / 100);
      } else {
        token0Pct = token1Pct = 50;
      }
    } else {
      // Use provided USD values to compute percentages
      if (balance > 0 && sumTokenUsd > 0) {
        token0Pct = (token0Value / balance) * 100;
        token1Pct = (token1Value / balance) * 100;
      } else {
        token0Pct = token1Pct = 50;
      }
    }

    // Normalize token names for display
    const token0Display = normalizeToken(pos.token0) || pos.token0 || 'Token 0';
    const token1Display = normalizeToken(pos.token1) || pos.token1 || 'Token 1';
    const pairDisplay = `${token0Display}/${token1Display}`;

    const timeAgo = formatTimeAgo(pos.capturedAt);

    return `
      <div class="position-item">
        <div class="position-header">
          <div class="position-pair">${pairDisplay} <span style="color: var(--text-muted); font-weight: 400; font-size: 0.625rem;">· ${pos.protocol} · ${timeAgo}</span></div>
          <span class="position-badge ${rangeStatus}">${inRange ? '✓' : '✗'}</span>
        </div>
        <div class="position-details">
          <div class="position-detail balance">
            <span class="detail-value">$${Math.round(balance).toLocaleString('en-US')}</span>
          </div>
          <div class="position-detail token">
            <span class="detail-value">${formatTokenAmount(token0Amount)} <span style="color: var(--text-muted); font-size: 0.625rem;">($${Math.round(token0Value).toLocaleString('en-US')} • ${token0Pct.toFixed(0)}%)</span></span>
          </div>
          <div class="position-detail token">
            <span class="detail-value">${formatTokenAmount(token1Amount)} <span style="color: var(--text-muted); font-size: 0.625rem;">($${Math.round(token1Value).toLocaleString('en-US')} • ${token1Pct.toFixed(0)}%)</span></span>
          </div>
          <div class="position-detail yield">
            <span class="detail-value">$${Math.round(pendingYield).toLocaleString('en-US')}</span>
          </div>
          <div class="position-detail apy">
            <span class="detail-value">${apy.toFixed(1)}%</span>
          </div>
        </div>
        <div class="price-range-container">
          <span class="current-price-label"><span class="current-price-value">${formatNumber(pos.currentPrice)}</span></span>
          <div class="price-range-slider">
            <span class="price-label">${formatNumber(pos.rangeMin)}</span>
            <div class="slider-track">
              <div class="slider-fill" style="width: 100%;"></div>
              <div class="slider-tick ${rangeStatus}" style="left: ${tickPosition}%;"></div>
            </div>
            <span class="price-label">${formatNumber(pos.rangeMax)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = headerRow + positionRows;

  updateCLMMetrics();
}

// Helper function to format numbers
function formatNumber(num) {
  if (!num || num === 'N/A') return 'N/A';
  const n = parseFloat(num);
  if (isNaN(n)) return 'N/A';

  // For large numbers, use compact notation
  if (n >= 10000) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  // For small numbers, show more decimals
  if (n < 1) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  // Default formatting
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// Helper function to format token amounts
function formatTokenAmount(amount) {
  if (!amount || amount === 0) return '0';
  const n = parseFloat(amount);
  if (isNaN(n)) return '0';

  // For very small amounts, show up to 8 decimals
  if (n < 0.01) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  }
  // For small amounts, show up to 6 decimals
  if (n < 1) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }
  // For normal amounts, show up to 4 decimals
  if (n < 1000) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  // For large amounts, show 2 decimals
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Render Hedge Positions
function renderHedgePositions() {
  const list = document.getElementById('hedgesPositionList');

  if (hedgePositions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hedge positions</div><div class="empty-state-subtext">Capture data from Hyperliquid</div></div>';
    updateHedgeMetrics();
    return;
  }

  // Create header row
  const headerRow = `
    <div class="position-header-row">
      <div class="position-header" style="flex: 0 0 200px;">
        <span class="header-label">Symbol</span>
      </div>
      <div class="position-details">
        <div class="position-detail" style="flex: 0 0 120px;">
          <span class="header-label">Size</span>
        </div>
        <div class="position-detail" style="flex: 0 0 120px;">
          <span class="header-label">Value</span>
        </div>
        <div class="position-detail" style="flex: 0 0 140px;">
          <span class="header-label">PnL</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Entry</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Mark</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Liq.</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Margin</span>
        </div>
        <div class="position-detail" style="flex: 0 0 100px;">
          <span class="header-label">Funding</span>
        </div>
      </div>
    </div>
  `;

  const positionRows = hedgePositions.map(pos => {
    const pnlValue = parseFloat(pos.pnl?.replace(/[$,]/g, '')) || 0;
    const pnlClass = pnlValue >= 0 ? 'positive' : 'negative';

    return `
      <div class="position-item">
        <div class="position-header" style="flex: 0 0 200px;">
          <div class="position-pair">${pos.symbol} <span style="color: var(--text-muted); font-weight: 400; font-size: 0.625rem;">· Hyperliquid</span></div>
          <span class="position-badge" style="background: #fef3c7; color: #92400e; font-size: 0.625rem; padding: 2px 6px;">${pos.leverage}</span>
        </div>
        <div class="position-details">
          <div class="position-detail" style="flex: 0 0 120px;">
            <span class="detail-value">${pos.size} ${pos.symbol}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 120px;">
            <span class="detail-value">$${(pos.usdValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 140px;">
            <span class="detail-value ${pnlClass}">${pos.pnl || '$0'} <span style="color: var(--text-muted); font-size: 0.625rem;">(${pos.pnlPercent || '0'}%)</span></span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">${(pos.entryPrice || 0).toLocaleString()}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">${(pos.markPrice || 0).toLocaleString()}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">${(pos.liquidationPrice || 0).toLocaleString()}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">$${(pos.margin || 0).toLocaleString()}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 100px;">
            <span class="detail-value">${pos.fundingRate || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = headerRow + positionRows;
  updateHedgeMetrics();
}

// Render Collateral Positions
function renderCollateralPositions() {
  const list = document.getElementById('collateralPositionList');

  if (collateralPositions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No collateral positions</div><div class="empty-state-subtext">Capture data from Aave or Morpho</div></div>';
    updateCollateralMetrics();
    return;
  }

  // Create header row
  const headerRow = `
    <div class="position-header-row">
      <div class="position-header" style="flex: 0 0 200px;">
        <span class="header-label">Asset</span>
      </div>
      <div class="position-details">
        <div class="position-detail" style="flex: 0 0 140px;">
          <span class="header-label">Amount</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Value</span>
        </div>
        <div class="position-detail" style="flex: 0 0 90px;">
          <span class="header-label">Rate</span>
        </div>
        <div class="position-detail" style="flex: 0 0 130px;">
          <span class="header-label">Loan</span>
        </div>
        <div class="position-detail" style="flex: 0 0 80px;">
          <span class="header-label">LTV</span>
        </div>
        <div class="position-detail" style="flex: 0 0 90px;">
          <span class="header-label">Health</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Liq. Price</span>
        </div>
        <div class="position-detail" style="flex: 0 0 80px;">
          <span class="header-label">Liq. LTV</span>
        </div>
      </div>
    </div>
  `;

  const positionRows = collateralPositions.map(pos => {
    const healthValue = parseFloat(pos.healthFactor);
    let healthClass = '';
    if (!isNaN(healthValue)) {
      if (healthValue < 1.2) healthClass = 'negative';
      else if (healthValue < 1.5) healthClass = 'warning';
      else healthClass = 'positive';
    }

    // Handle different data structures for Aave vs Morpho
    const asset = pos.asset || pos.collateralAsset;
    const amount = pos.amount || pos.collateralAmount;
    const usdValue = pos.usdValue || pos.collateralValue;
    const parsedValue = parseFloat(usdValue?.replace(/[k$,]/g, '') || 0) * (usdValue?.includes('k') ? 1000 : 1);

    // Format rate/APY with proper % sign
    const rate = pos.rate ? `${pos.rate}%` : (pos.apy ? `${pos.apy}%` : '-');

    // Format health factor with color coding
    const healthDisplay = pos.healthFactor ?
      `<span class="${healthClass === 'positive' ? 'positive' : healthClass === 'negative' ? 'negative' : 'warning'}">${pos.healthFactor}</span>`
      : '-';

    // Format liquidation price with proper formatting
    const liqPrice = pos.liquidationPrice ?
      (parseFloat(pos.liquidationPrice) > 1000 ?
        `$${parseFloat(pos.liquidationPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : `$${parseFloat(pos.liquidationPrice).toFixed(2)}`)
      : '-';

    return `
      <div class="position-item">
        <div class="position-header" style="flex: 0 0 200px;">
          <div class="position-pair">${asset} <span style="color: var(--text-muted); font-weight: 400; font-size: 0.625rem;">· ${pos.protocol}</span></div>
        </div>
        <div class="position-details">
          <div class="position-detail" style="flex: 0 0 140px;">
            <span class="detail-value">${amount} ${asset}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">$${parsedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 90px;">
            <span class="detail-value">${rate}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 130px;">
            <span class="detail-value">${pos.loanAsset ? `${pos.loanAmount} ${pos.loanAsset}` : '-'}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 80px;">
            <span class="detail-value">${pos.ltv ? pos.ltv + '%' : '-'}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 90px;">
            <span class="detail-value">${healthDisplay}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">${liqPrice}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 80px;">
            <span class="detail-value">${pos.liquidationLTV ? pos.liquidationLTV + '%' : '-'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = headerRow + positionRows;
  updateCollateralMetrics();
}

// Update CLM Metrics
function updateCLMMetrics() {
  // Calculate metrics on ALL positions (including < $1,000)
  const totalValue = clmPositions.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
  const inRangeCount = clmPositions.filter(p => p.inRange).length;
  const totalPending = clmPositions.reduce((sum, p) => sum + (parseFloat(p.pendingYield) || 0), 0);
  const weightedAPY = totalValue > 0
    ? clmPositions.reduce((sum, p) => sum + ((parseFloat(p.apy) || 0) * (parseFloat(p.balance) || 0)), 0) / totalValue
    : 0;

  // Count how many are displayed (>= $1,000)
  const displayCount = clmPositions.filter(pos => parseFloat(pos.balance) >= 1000).length;
  const hiddenCount = clmPositions.length - displayCount;

  document.getElementById('clmTotalValue').textContent = '$' + Math.round(totalValue).toLocaleString('en-US');
  document.getElementById('clmPositionCount').textContent = displayCount;
  document.getElementById('clmInRangeText').textContent = hiddenCount > 0
    ? `${inRangeCount} in range (${hiddenCount} hidden)`
    : `${inRangeCount} in range`;
  document.getElementById('clmPendingYield').textContent = '$' + Math.round(totalPending).toLocaleString('en-US');
  document.getElementById('clmWeightedAPY').textContent = weightedAPY.toFixed(1) + '%';
}

// Update Hedge Metrics
function updateHedgeMetrics() {
  const totalValue = hedgePositions.reduce((sum, p) => sum + (p.usdValue || 0), 0);
  const totalPnL = hedgePositions.reduce((sum, p) => sum + (parseFloat(p.pnl?.replace(/[$,]/g, '')) || 0), 0);
  const avgLeverage = hedgePositions.length > 0
    ? hedgePositions.reduce((sum, p) => sum + (parseInt(p.leverage?.replace('x', '')) || 0), 0) / hedgePositions.length
    : 0;

  document.getElementById('hedgesTotalValue').textContent = '$' + Math.round(totalValue).toLocaleString('en-US');
  document.getElementById('hedgesPositionCount').textContent = hedgePositions.length;
  document.getElementById('hedgesTotalPnL').textContent = '$' + Math.round(totalPnL).toLocaleString('en-US');

  const pnlElement = document.getElementById('hedgesTotalPnL');
  if (totalPnL > 0) {
    pnlElement.classList.add('positive');
    pnlElement.classList.remove('negative');
  } else if (totalPnL < 0) {
    pnlElement.classList.add('negative');
    pnlElement.classList.remove('positive');
  }

  document.getElementById('hedgesAvgLeverage').textContent = avgLeverage.toFixed(1) + 'x';
}

// Update Collateral Metrics
function updateCollateralMetrics() {
  const totalValue = collateralPositions.reduce((sum, p) => {
    let value = 0;
    const usdValue = p.usdValue || p.collateralValue;
    if (usdValue) {
      value = parseFloat(usdValue.replace(/[k$,]/g, ''));
      if (usdValue.includes('k')) value *= 1000;
    }
    return sum + value;
  }, 0);

  const healthFactors = collateralPositions
    .map(p => parseFloat(p.healthFactor))
    .filter(h => !isNaN(h) && h > 0);
  const avgHealth = healthFactors.length > 0
    ? (healthFactors.reduce((sum, h) => sum + h, 0) / healthFactors.length)
    : 0;

  document.getElementById('collateralTotalValue').textContent = '$' + Math.round(totalValue).toLocaleString('en-US');
  document.getElementById('collateralPositionCount').textContent = collateralPositions.length;
  document.getElementById('collateralAvgHealth').textContent = avgHealth > 0 ? avgHealth.toFixed(2) : '-';

  const healthElement = document.getElementById('collateralAvgHealth');
  if (avgHealth >= 2.0) {
    healthElement.classList.add('positive');
  } else if (avgHealth >= 1.5) {
    healthElement.classList.add('warning');
  } else if (avgHealth > 0) {
    healthElement.classList.add('negative');
  }

  // Calculate net APY (simplified - just show rate if available)
  const avgRate = collateralPositions
    .map(p => parseFloat(p.rate) || 0)
    .reduce((sum, r) => sum + r, 0) / (collateralPositions.length || 1);
  document.getElementById('collateralNetAPY').textContent = avgRate.toFixed(1) + '%';
}

// Update Unified Summary
function updateUnifiedSummary() {
  // Total CLM value
  const clmValue = clmPositions.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);

  // Total Collateral value
  const collateralValue = collateralPositions.reduce((sum, p) => {
    let value = 0;
    const usdValue = p.usdValue || p.collateralValue;
    if (usdValue) {
      value = parseFloat(usdValue.replace(/[k$,]/g, ''));
      if (usdValue.includes('k')) value *= 1000;
    }
    return sum + value;
  }, 0);

  // Total value
  const totalValue = clmValue + collateralValue;

  // Hedge notional
  const hedgeNotional = hedgePositions.reduce((sum, p) => sum + (p.usdValue || 0), 0);

  // Net exposure (total - hedge notional)
  const netExposure = totalValue - hedgeNotional;

  // Hedge PnL
  const hedgePnL = hedgePositions.reduce((sum, p) => sum + (parseFloat(p.pnl?.replace(/[$,]/g, '')) || 0), 0);

  // Total yield (CLM pending + daily)
  const totalPending = clmPositions.reduce((sum, p) => sum + (parseFloat(p.pendingYield || p.pending_yield) || 0), 0);
  const totalYield = totalPending; // Simplified for now

  // Average health factor
  const healthFactors = collateralPositions
    .map(p => parseFloat(p.healthFactor))
    .filter(h => !isNaN(h) && h > 0);
  const avgHealth = healthFactors.length > 0
    ? (healthFactors.reduce((sum, h) => sum + h, 0) / healthFactors.length)
    : 0;

  // Protocols count
  const protocols = new Set();
  clmPositions.forEach(p => protocols.add(p.protocol));
  collateralPositions.forEach(p => protocols.add(p.protocol));
  if (hedgePositions.length > 0) protocols.add('Hyperliquid');

  // Update UI (guard if unified summary elements are absent)
  const tv = document.getElementById('portfolioTotalValue');
  const net = document.getElementById('portfolioNetExposure');
  const pnlEl = document.getElementById('portfolioHedgePnL');
  const ty = document.getElementById('portfolioTotalYield');
  const hf = document.getElementById('portfolioHealthFactor');
  const prot = document.getElementById('portfolioProtocols');

  if (tv) tv.textContent = '$' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (net) net.textContent = '$' + netExposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (pnlEl) {
    pnlEl.textContent = '$' + hedgePnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (hedgePnL > 0) pnlEl.classList.add('positive');
    else if (hedgePnL < 0) pnlEl.classList.add('negative');
  }
  if (ty) ty.textContent = '$' + totalYield.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (hf) hf.textContent = avgHealth > 0 ? avgHealth.toFixed(2) : '-';
  if (prot) prot.textContent = protocols.size;
}

// Show empty states
function showEmptyStates() {
  renderCLMPositions();
  renderHedgePositions();
  renderCollateralPositions();
  updateUnifiedSummary();
}

// Export functionality
document.getElementById('exportBtn')?.addEventListener('click', async () => {
  const portfolioData = {
    exportedAt: new Date().toISOString(),
    clmPositions,
    hedgePositions,
    collateralPositions
  };

  // Create JSON blob
  const jsonBlob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);

  // Download JSON
  const jsonLink = document.createElement('a');
  jsonLink.href = jsonUrl;
  jsonLink.download = `portfolio-${new Date().toISOString().split('T')[0]}.json`;
  jsonLink.click();

  alert('✅ Portfolio exported successfully!');
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
