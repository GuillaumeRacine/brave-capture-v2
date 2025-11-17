// Dashboard V2 - Mobile-First Collapsible Cards
// Global state
let clmPositions = [];
let hedgePositions = [];
let collateralPositions = [];
let aaveSummary = null;  // Store Aave global data (health factor, total borrowed, etc.)

// Cache configuration
const CACHE_KEYS = {
  HEDGE_POSITIONS: 'hedgePositions_cache',
  COLLATERAL_POSITIONS: 'collateralPositions_cache',
  AAVE_SUMMARY: 'aaveSummary_cache',
  LAST_CAPTURE_ID: 'lastCaptureId_cache'
};

// Cache helpers
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return parsed;
  } catch (e) {
    console.warn(`Failed to get cached data for ${key}:`, e);
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`✅ Cached ${key}:`, data?.length || 'data');
  } catch (e) {
    console.warn(`Failed to cache data for ${key}:`, e);
  }
}

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

    // Try to load cached hedge/collateral data first
    const cachedHedge = getCachedData(CACHE_KEYS.HEDGE_POSITIONS);
    const cachedCollateral = getCachedData(CACHE_KEYS.COLLATERAL_POSITIONS);
    const cachedAave = getCachedData(CACHE_KEYS.AAVE_SUMMARY);
    const lastCaptureId = getCachedData(CACHE_KEYS.LAST_CAPTURE_ID);

    // ✅ PERFORMANCE: Early exit if we have all cached data
    // This skips the getCaptures() call entirely, saving 50-100ms
    if (cachedHedge && cachedCollateral && lastCaptureId) {
      console.log('⚡ Lightning-fast load: Using all cached hedge/collateral data (instant)');
      hedgePositions = cachedHedge;
      collateralPositions = cachedCollateral;
      aaveSummary = cachedAave || null;
      renderHedgePositions();
      renderCollateralPositions();

      // Initialize token exposure card
      await initTokenExposure();

      // Schedule background check for new captures (non-blocking)
      setTimeout(async () => {
        try {
          const captures = await window.getCaptures({ limit: 1 }); // Only get latest
          const latestCaptureId = captures?.[0]?.id;

          if (latestCaptureId && latestCaptureId !== lastCaptureId) {
            console.log('🔄 New capture detected in background, reloading...');
            // Reload positions if new capture found
            await loadAllPositions();
          }
        } catch (e) {
          // Silent fail - user already has cached data
        }
      }, 100); // Check after 100ms delay

      return; // Exit early - no need to fetch captures now!
    }

    // Only reach here if cache is missing or incomplete
    console.log('🔍 No complete cache found, fetching fresh data from database');

    // Check if we have new captures
    let captures = [];
    let hasNewCaptures = false;

    try {
      captures = await window.getCaptures({ limit: 100 });
      const latestCaptureId = captures?.[0]?.id;

      hasNewCaptures = latestCaptureId && latestCaptureId !== lastCaptureId;

      if (hasNewCaptures) {
        console.log(`🆕 New capture detected: ${latestCaptureId} (previous: ${lastCaptureId || 'none'})`);
        setCachedData(CACHE_KEYS.LAST_CAPTURE_ID, latestCaptureId);
      } else {
        console.log(`📦 No new captures, using cached data (${captures?.length || 0} total captures)`);
      }
    } catch (e) {
      console.warn('⚠️ Failed to load captures:', e?.message || e);
      captures = [];
    }

    // Load hedge positions (use cache if no new captures)
    if (hasNewCaptures && captures.length > 0) {
      await loadHedgePositions(captures);
      setCachedData(CACHE_KEYS.HEDGE_POSITIONS, hedgePositions);
    } else if (cachedHedge) {
      console.log('⚡ Using cached hedge positions:', cachedHedge.length);
      hedgePositions = cachedHedge;
      renderHedgePositions();
    } else {
      hedgePositions = [];
      renderHedgePositions();
    }

    // Load collateral positions (use cache if no new captures)
    if (hasNewCaptures && captures.length > 0) {
      await loadCollateralPositions(captures);
      setCachedData(CACHE_KEYS.COLLATERAL_POSITIONS, collateralPositions);
      setCachedData(CACHE_KEYS.AAVE_SUMMARY, aaveSummary);
    } else if (cachedCollateral) {
      console.log('⚡ Using cached collateral positions:', cachedCollateral.length);
      collateralPositions = cachedCollateral;
      aaveSummary = cachedAave;
      renderCollateralPositions();
    } else {
      collateralPositions = [];
      aaveSummary = null;
      renderCollateralPositions();
    }

    // Initialize token exposure card
    await initTokenExposure();

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

    // Store Aave summary for metrics
    aaveSummary = {
      healthFactor: aaveData.summary?.healthFactor || 'N/A',
      totalBorrowed: aaveData.summary?.totalBorrowed || '0',
      netAPY: aaveData.summary?.netAPY || '0',
      netWorth: aaveData.summary?.netWorth || '0',
      supplies: aaveData.supplies || [],
      borrows: aaveData.borrows || []
    };

    // Only show supply positions in collateral table (Aave is cross-collateralized)
    const aaveSupplies = (aaveData.positions || [])
      .filter(p => p.type === 'supply')
      .map(p => ({
        ...p,
        protocol: 'Aave'
      }));
    collateralPositions.push(...aaveSupplies);
    console.log('Added', aaveSupplies.length, 'Aave supply positions (filtered from', aaveData.positions?.length || 0, 'total)');
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

// Calculate price slider position for hedge positions
function calculateSliderPosition(pos) {
  const entry = parseFloat(pos.entryPrice) || 0;
  const mark = parseFloat(pos.markPrice) || 0;
  const liq = parseFloat(pos.liquidationPrice) || 0;

  if (!entry || !mark || !liq) return { position: 50, health: 'safe', fillWidth: 50 };

  // Determine if long or short based on entry vs liq price
  // Long: liq < entry < mark (price goes up)
  // Short: liq > entry > mark (price goes down)
  const isLong = liq < entry;

  let position, fillWidth, health;

  if (isLong) {
    // For longs: slider goes liq (0%) → entry (50%) → current mark
    const range = (entry - liq) * 2; // Double range for visual clarity
    position = ((mark - liq) / range) * 100;
    fillWidth = position;

    // Health: distance from liquidation
    const distToLiq = ((mark - liq) / (entry - liq)) * 100;
    if (distToLiq > 100) health = 'safe';
    else if (distToLiq > 50) health = 'warning';
    else health = 'critical';

  } else {
    // For shorts: slider goes current mark → entry (50%) → liq (100%)
    const range = (liq - entry) * 2;
    position = 100 - ((liq - mark) / range) * 100;
    fillWidth = 100 - position;

    // Health: distance from liquidation
    const distToLiq = ((liq - mark) / (liq - entry)) * 100;
    if (distToLiq > 100) health = 'safe';
    else if (distToLiq > 50) health = 'warning';
    else health = 'critical';
  }

  return {
    position: Math.max(0, Math.min(100, position)),
    fillWidth: Math.max(0, Math.min(100, fillWidth)),
    health
  };
}

// Format price for display
function formatPrice(price) {
  if (!price) return '0';
  const num = parseFloat(price);
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (num >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
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
      <div class="position-header" style="flex: 0 0 180px;">
        <span class="header-label">Symbol</span>
      </div>
      <div class="position-details">
        <div class="position-detail" style="flex: 0 0 60px;">
          <span class="header-label">Lev.</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Size</span>
        </div>
        <div class="position-detail" style="flex: 0 0 110px;">
          <span class="header-label">Value</span>
        </div>
        <div class="position-detail" style="flex: 0 0 140px;">
          <span class="header-label">PnL</span>
        </div>
        <div class="position-detail" style="flex: 0 0 100px;">
          <span class="header-label">Entry</span>
        </div>
        <div class="position-detail" style="flex: 0 0 100px;">
          <span class="header-label">Mark</span>
        </div>
        <div class="position-detail" style="flex: 0 0 100px;">
          <span class="header-label">Liq.</span>
        </div>
        <div class="position-detail" style="flex: 0 0 100px;">
          <span class="header-label">Margin</span>
        </div>
        <div class="position-detail" style="flex: 0 0 90px;">
          <span class="header-label">Funding</span>
        </div>
      </div>
    </div>
  `;

  const positionRows = hedgePositions.map(pos => {
    const pnlValue = parseFloat(pos.pnl?.replace(/[$,]/g, '')) || 0;
    const pnlClass = pnlValue >= 0 ? 'positive' : 'negative';
    const sliderData = calculateSliderPosition(pos);

    // Determine slider color based on health
    const sliderColor = sliderData.health === 'safe'
      ? 'linear-gradient(90deg, #10b981, #34d399)'
      : sliderData.health === 'warning'
      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
      : 'linear-gradient(90deg, #ef4444, #f87171)';

    return `
      <div class="position-item">
        <div class="position-header" style="flex: 0 0 180px;">
          <div class="position-pair">${pos.symbol} <span style="color: var(--text-muted); font-weight: 400; font-size: 0.625rem;">· Hyperliquid</span></div>
        </div>
        <div class="position-details">
          <div class="position-detail" style="flex: 0 0 60px;">
            <span class="detail-value" style="color: var(--text-muted); font-size: 0.75rem;">${pos.leverage || '-'}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">${pos.size} ${pos.symbol}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 110px;">
            <span class="detail-value">$${(pos.usdValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 140px;">
            <span class="detail-value ${pnlClass}">${pos.pnl || '$0'} <span style="color: var(--text-muted); font-size: 0.625rem;">(${pos.pnlPercent || '0'}%)</span></span>
          </div>
          <div class="position-detail" style="flex: 0 0 100px;">
            <span class="detail-value">${formatPrice(pos.entryPrice)}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 100px;">
            <span class="detail-value">${formatPrice(pos.markPrice)}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 100px;">
            <span class="detail-value">${formatPrice(pos.liquidationPrice)}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 100px;">
            <span class="detail-value">$${(pos.margin || 0).toLocaleString()}</span>
          </div>
          <div class="position-detail" style="flex: 0 0 90px;">
            <span class="detail-value">${pos.fundingRate || 'N/A'}</span>
          </div>
        </div>
        <!-- Price Range Slider -->
        <div class="price-range-container" style="margin-top: 0.75rem; padding: 0 1rem;">
          <div style="position: relative; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${sliderData.fillWidth}%; background: ${sliderColor}; border-radius: 4px;"></div>
            <div style="position: absolute; left: ${sliderData.position}%; top: 50%; width: 14px; height: 14px; background: white; border: 2px solid #3b82f6; border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.625rem; margin-top: 0.5rem; color: var(--text-muted);">
            <span>${formatPrice(pos.entryPrice)}</span>
            <span style="font-weight: 600; color: #3b82f6;">${formatPrice(pos.markPrice)}</span>
            <span>${formatPrice(pos.liquidationPrice)}</span>
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

  if (collateralPositions.length === 0 && (!aaveSummary || aaveSummary.borrows.length === 0)) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No collateral positions</div><div class="empty-state-subtext">Capture data from Aave or Morpho</div></div>';
    updateCollateralMetrics();
    return;
  }

  let html = '';

  // Separate Aave and Morpho positions
  const aavePositions = collateralPositions.filter(p => p.protocol === 'Aave');
  const morphoPositions = collateralPositions.filter(p => p.protocol === 'Morpho');

  // Render Aave Supplies (simplified columns)
  if (aavePositions.length > 0) {
    html += `
      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Aave Supplies</div>
        <div class="position-header-row">
          <div class="position-header" style="flex: 0 0 200px;">
            <span class="header-label">Asset</span>
          </div>
          <div class="position-details">
            <div class="position-detail" style="flex: 0 0 140px;">
              <span class="header-label">Amount</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="header-label">Value</span>
            </div>
            <div class="position-detail" style="flex: 0 0 100px;">
              <span class="header-label">Supply APY</span>
            </div>
          </div>
        </div>
    `;

    aavePositions.forEach(pos => {
      const parsedValue = parseFloat(pos.usdValue || 0);
      html += `
        <div class="position-item">
          <div class="position-header" style="flex: 0 0 200px;">
            <div class="position-pair">${pos.asset}</div>
          </div>
          <div class="position-details">
            <div class="position-detail" style="flex: 0 0 140px;">
              <span class="detail-value">${pos.amount} ${pos.asset}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="detail-value">$${parsedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 100px;">
              <span class="detail-value">${pos.apy || '0'}%</span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
  }

  // Render Aave Borrows (if any)
  if (aaveSummary && aaveSummary.borrows && aaveSummary.borrows.length > 0) {
    html += `
      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Aave Borrows</div>
        <div class="position-header-row">
          <div class="position-header" style="flex: 0 0 200px;">
            <span class="header-label">Asset</span>
          </div>
          <div class="position-details">
            <div class="position-detail" style="flex: 0 0 140px;">
              <span class="header-label">Amount</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="header-label">Value</span>
            </div>
            <div class="position-detail" style="flex: 0 0 100px;">
              <span class="header-label">Borrow APY</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="header-label">Annual Cost</span>
            </div>
          </div>
        </div>
    `;

    aaveSummary.borrows.forEach(borrow => {
      const parsedValue = parseFloat(borrow.usdValue || 0);
      const annualCost = parsedValue * (parseFloat(borrow.apy || 0) / 100);
      html += `
        <div class="position-item">
          <div class="position-header" style="flex: 0 0 200px;">
            <div class="position-pair">${borrow.asset}</div>
          </div>
          <div class="position-details">
            <div class="position-detail" style="flex: 0 0 140px;">
              <span class="detail-value">${borrow.amount} ${borrow.asset}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="detail-value">$${parsedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 100px;">
              <span class="detail-value negative">${borrow.apy || '0'}%</span>
            </div>
            <div class="position-detail" style="flex: 0 0 120px;">
              <span class="detail-value negative">-$${annualCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
  }

  // Render Morpho Positions (full columns)
  if (morphoPositions.length > 0) {
    html += `
      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Morpho Positions</div>
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
            <div class="position-detail" style="flex: 0 0 110px;">
              <span class="header-label">Liq. Price</span>
            </div>
            <div class="position-detail" style="flex: 0 0 80px;">
              <span class="header-label">Liq. LTV</span>
            </div>
          </div>
        </div>
    `;

    morphoPositions.forEach(pos => {
      const parsedValue = parseFloat(pos.collateralValue?.replace(/[k$,]/g, '') || 0) * (pos.collateralValue?.includes('k') ? 1000 : 1);
      const liqPrice = pos.liquidationPrice ?
        (parseFloat(pos.liquidationPrice) > 1000 ?
          `$${parseFloat(pos.liquidationPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : `$${parseFloat(pos.liquidationPrice).toFixed(2)}`)
        : '-';

      html += `
        <div class="position-item">
          <div class="position-header" style="flex: 0 0 200px;">
            <div class="position-pair">${pos.collateralAsset}</div>
          </div>
          <div class="position-details">
            <div class="position-detail" style="flex: 0 0 140px;">
              <span class="detail-value">${pos.collateralAmount} ${pos.collateralAsset}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 110px;">
              <span class="detail-value">$${parsedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 90px;">
              <span class="detail-value">${pos.rate || '0'}%</span>
            </div>
            <div class="position-detail" style="flex: 0 0 130px;">
              <span class="detail-value">${pos.loanAmount} ${pos.loanAsset}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 80px;">
              <span class="detail-value">${pos.ltv || '0'}%</span>
            </div>
            <div class="position-detail" style="flex: 0 0 110px;">
              <span class="detail-value">${liqPrice}</span>
            </div>
            <div class="position-detail" style="flex: 0 0 80px;">
              <span class="detail-value">${pos.liquidationLTV || '0'}%</span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
  }

  list.innerHTML = html;
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
  // Calculate total collateral value
  const totalValue = collateralPositions.reduce((sum, p) => {
    let value = 0;
    const usdValue = p.usdValue || p.collateralValue;
    if (usdValue) {
      value = parseFloat(usdValue.replace(/[k$,]/g, ''));
      if (usdValue.includes('k')) value *= 1000;
    }
    return sum + value;
  }, 0);

  // Use Aave global health factor if available, otherwise calculate from Morpho positions
  let healthFactor = '-';
  if (aaveSummary && aaveSummary.healthFactor && aaveSummary.healthFactor !== 'N/A') {
    healthFactor = aaveSummary.healthFactor;
  } else {
    const healthFactors = collateralPositions
      .map(p => parseFloat(p.healthFactor))
      .filter(h => !isNaN(h) && h > 0);
    if (healthFactors.length > 0) {
      healthFactor = (healthFactors.reduce((sum, h) => sum + h, 0) / healthFactors.length).toFixed(2);
    }
  }

  // Calculate total borrowed (Aave + Morpho)
  let totalBorrowed = 0;
  if (aaveSummary && aaveSummary.totalBorrowed) {
    totalBorrowed += parseFloat(aaveSummary.totalBorrowed);
  }
  // Add Morpho borrows
  totalBorrowed += collateralPositions
    .filter(p => p.protocol === 'Morpho')
    .reduce((sum, p) => {
      let value = 0;
      const loanValue = p.loanValue;
      if (loanValue) {
        value = parseFloat(loanValue.replace(/[k$,]/g, ''));
        if (loanValue.includes('k')) value *= 1000;
      }
      return sum + value;
    }, 0);

  // Calculate weighted supply APY (only for supply positions)
  let totalSupplyValue = 0;
  let weightedAPY = 0;

  // Aave supplies
  if (aaveSummary && aaveSummary.supplies) {
    aaveSummary.supplies.forEach(supply => {
      const value = parseFloat(supply.usdValue || 0);
      totalSupplyValue += value;
      weightedAPY += value * (parseFloat(supply.apy || 0));
    });
  }

  if (totalSupplyValue > 0) {
    weightedAPY = (weightedAPY / totalSupplyValue).toFixed(2);
  } else {
    weightedAPY = '0.00';
  }

  document.getElementById('collateralTotalValue').textContent = '$' + Math.round(totalValue).toLocaleString('en-US');
  document.getElementById('collateralPositionCount').textContent = (collateralPositions.length + (aaveSummary?.borrows?.length || 0));
  document.getElementById('collateralAvgHealth').textContent = healthFactor;

  const healthElement = document.getElementById('collateralAvgHealth');
  const hf = parseFloat(healthFactor);
  healthElement.classList.remove('positive', 'warning', 'negative');
  if (hf >= 2.0) {
    healthElement.classList.add('positive');
  } else if (hf >= 1.5) {
    healthElement.classList.add('warning');
  } else if (hf > 0) {
    healthElement.classList.add('negative');
  }

  // Show total borrowed in the Net APY slot for now (we'll add a dedicated slot later)
  document.getElementById('collateralNetAPY').textContent = '$' + Math.round(totalBorrowed).toLocaleString('en-US') + ' borrowed · ' + weightedAPY + '% APY';
}

// =====================================
// TOKEN EXPOSURE CARD - NEW FEATURE
// =====================================

// CoinGecko Token ID Mapping (symbol → CoinGecko ID)
const COINGECKO_TOKEN_MAP = {
  // Major tokens
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'USDC.e': 'usd-coin',
  'DAI': 'dai',
  'WETH': 'ethereum',
  'WBTC': 'wrapped-bitcoin',
  'cbBTC': 'coinbase-wrapped-btc',

  // Popular DeFi tokens
  'AAVE': 'aave',
  'UNI': 'uniswap',
  'LINK': 'chainlink',
  'CRV': 'curve-dao-token',
  'MKR': 'maker',
  'SNX': 'havven',
  'COMP': 'compound-governance-token',
  'SUSHI': 'sushi',
  'YFI': 'yearn-finance',

  // Layer 2 / Alt chains
  'MATIC': 'matic-network',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'AVAX': 'avalanche-2',
  'FTM': 'fantom',
  'ONE': 'harmony',

  // Solana ecosystem
  'JTO': 'jito-governance-token',
  'BONK': 'bonk',
  'JUP': 'jupiter-exchange-solana',
  'ORCA': 'orca',
  'RAY': 'raydium',
  'MNGO': 'mango-markets',
  'SRM': 'serum',
  'FIDA': 'bonfida',
  'SAMO': 'samoyedcoin',
  'COPE': 'cope',
  'STEP': 'step-finance',
  'MEDIA': 'media-network',
  'ROPE': 'rope-token',
  'MER': 'mercurial',
  'PORT': 'port-finance',
  'SBR': 'saber',
  'SLIM': 'solanium',
  'TULIP': 'tulip-protocol',
  'SUNNY': 'sunny-aggregator',
  'GRAPE': 'grape-2',
  'ATLAS': 'star-atlas',
  'POLIS': 'star-atlas-dao',
  'GENE': 'genopets',
  'GST': 'gst',
  'GMT': 'stepn',
  'DUST': 'dust-protocol',
  'FORGE': 'blocksmith-labs-forge',
  'INVICTUS': 'invictus',
  'UXRO': 'uxd-stablecoin',
  'UXP': 'uxp',
  'LDO': 'lido-dao',
  'MSOL': 'msol',
  'STSOL': 'lido-staked-sol',
  'SCNSOL': 'socean-staked-sol',
  'JSOL': 'jpool',
  'WHETH': 'ethereum',
  'PUMP': 'pump',
  'JLP': 'jlp',

  // Base ecosystem
  'AERO': 'aerodrome-finance',
  'WELL': 'moonwell',
  'BALD': 'bald',
  'TOSHI': 'toshi',

  // Stablecoins
  'FRAX': 'frax',
  'LUSD': 'liquity-usd',
  'GUSD': 'gemini-dollar',
  'BUSD': 'binance-usd',
  'TUSD': 'true-usd',
  'USDP': 'paxos-standard',

  // Wrapped assets
  'STETH': 'staked-ether',
  'WSTETH': 'wrapped-steth',
  'RETH': 'rocket-pool-eth',
  'CBETH': 'coinbase-wrapped-staked-eth',

  // Morpho / Lending specific
  'MORPHO': 'morpho',
  'CRV': 'curve-dao-token',
  'CVX': 'convex-finance',

  // Meme coins
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
};

// ============================================================================
// TOKEN CONSOLIDATION (v1.5.1)
// ============================================================================
// Groups similar tokens into unified categories for cleaner exposure tracking
// Example: WBTC, cbBTC, xBTC all show as "BTC" in the table
// This prevents fragmentation and gives true exposure to underlying assets
//
// Supported groups:
//   - BTC: All Bitcoin variants (wrapped, bridged)
//   - ETH: All Ethereum variants (wrapped, staked, liquid staked)
//   - USD: All stablecoins (USDC, USDT, DAI, etc.)
// ============================================================================
const TOKEN_GROUPS = {
  'BTC': ['BTC', 'WBTC', 'CBBTC', 'XBTC', 'RENBTC'],
  'ETH': ['ETH', 'WETH', 'WHETH', 'STETH', 'WSTETH', 'RETH', 'CBETH'],
  'USD': ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'GUSD', 'BUSD', 'TUSD', 'USDP', 'USDC.E']
};

/**
 * Get consolidated token name from symbol
 * @param {string} symbol - Original token symbol (e.g., "WBTC", "cbBTC")
 * @returns {string} - Consolidated group name (e.g., "BTC") or original if not in group
 *
 * Example:
 *   getConsolidatedToken('WBTC')  -> 'BTC'
 *   getConsolidatedToken('STETH') -> 'ETH'
 *   getConsolidatedToken('SOL')   -> 'SOL' (no group, returns as-is)
 */
function getConsolidatedToken(symbol) {
  const upperSymbol = symbol.toUpperCase();
  for (const [group, tokens] of Object.entries(TOKEN_GROUPS)) {
    if (tokens.includes(upperSymbol)) {
      return group;
    }
  }
  return upperSymbol; // Return original if not in any group
}

// ============================================================================
// REMOVED v1.5.1: switchTokenTab() function (lines 1228-1255)
// Reason: Replaced by unified table format in Token Exposure Card
// Previous implementation used dual-tab interface (CLM Tokens / Hedge Tokens)
// New implementation uses single table with 6 columns:
//   - Token | Price | CLM USD | CLM Exposure | Hedge Exposure | Net Exposure
// Migration: No action required - table auto-renders in initTokenExposure()
// ============================================================================

// Fetch token prices from CoinGecko
async function fetchTokenPrices(symbols) {
  try {
    // Check cache first (5-minute TTL)
    const cached = getCachedData(CACHE_KEYS.TOKEN_PRICES);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log('⚡ Using cached token prices');
      return cached.prices;
    }

    // Map symbols to CoinGecko IDs
    const ids = symbols
      .map(symbol => {
        const normalized = normalizeTokenSymbol(symbol);
        return COINGECKO_TOKEN_MAP[normalized];
      })
      .filter(id => id); // Remove undefined

    if (ids.length === 0) {
      console.warn('No valid CoinGecko IDs found for symbols:', symbols);
      return {};
    }

    // Fetch prices from CoinGecko API
    const uniqueIds = [...new Set(ids)];
    const idsParam = uniqueIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;

    console.log('🔄 Fetching token prices from CoinGecko:', uniqueIds.length, 'tokens');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Convert back to symbol → price mapping
    const prices = {};
    symbols.forEach(symbol => {
      const normalized = normalizeTokenSymbol(symbol);
      const id = COINGECKO_TOKEN_MAP[normalized];
      if (id && data[id]) {
        prices[symbol] = data[id].usd;
      }
    });

    // Cache the result
    setCachedData(CACHE_KEYS.TOKEN_PRICES, {
      timestamp: Date.now(),
      prices
    });

    console.log('✅ Fetched prices for', Object.keys(prices).length, 'tokens');
    return prices;

  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    return {};
  }
}

// Normalize token symbols (handle wrapped variants)
function normalizeTokenSymbol(symbol) {
  const upperSymbol = symbol.toUpperCase();

  // Normalize wrapped ETH variants
  if (['WETH', 'WHETH', 'STETH', 'WSTETH', 'RETH', 'CBETH'].includes(upperSymbol)) {
    // Keep original for proper mapping
    return upperSymbol;
  }

  // Normalize wrapped BTC variants
  if (['WBTC', 'CBBTC', 'RENBTC'].includes(upperSymbol)) {
    return upperSymbol;
  }

  // Normalize USDC variants
  if (upperSymbol === 'USDC.E') {
    return 'USDC.e';
  }

  return upperSymbol;
}

/**
 * Aggregate CLM tokens across all positions (with consolidation)
 *
 * Processes all CLM positions and consolidates token exposure.
 *
 * How it works:
 * 1. Split each position pair (e.g., "SOL/USDC") into individual tokens
 * 2. Consolidate similar tokens (e.g., WBTC → BTC, USDC.e → USD)
 * 3. Sum token values across all positions
 * 4. When token data is missing, estimate as balance * 0.5
 *
 * Estimation Strategy (v1.5.1):
 * - Missing data is common (~79% of positions lack token breakdown)
 * - Estimation: Assume 50/50 split → each token = balance * 0.5
 * - Mark token as estimated if ANY position lacks data
 * - Track estimation percentage for transparency
 *
 * @returns {Object} - { tokens: Array, estimationPct: number }
 *
 * Example output:
 * {
 *   tokens: [
 *     { symbol: 'USD', value: 25528, isEstimated: true },
 *     { symbol: 'SOL', value: 17616, isEstimated: true },
 *     { symbol: 'BTC', value: 18000, isEstimated: false }
 *   ],
 *   estimationPct: 25
 * }
 */
function aggregateCLMTokens() {
  const tokenMap = new Map();
  let estimatedCount = 0;
  let totalPositions = 0;

  clmPositions.forEach(pos => {
    totalPositions++;

    // Extract token symbols from pair (e.g., "SOL/USDC" → ["SOL", "USDC"])
    const tokens = pos.pair.split('/').map(t => t.trim());

    // Token 0
    if (tokens[0]) {
      const originalSymbol = tokens[0];
      const consolidatedSymbol = getConsolidatedToken(originalSymbol);
      const key = consolidatedSymbol;

      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          symbol: consolidatedSymbol,
          amount: 0,
          value: 0,
          sources: [],
          isEstimated: false
        });
      }

      const token = tokenMap.get(key);

      // Check if we have actual token data
      if (pos.token0Amount && pos.token0Value) {
        token.amount += parseFloat(pos.token0Amount) || 0;
        token.value += parseFloat(pos.token0Value) || 0;
        token.sources.push(`${pos.protocol} - ${pos.pair}`);
      } else {
        // Estimate: balance * 0.5 for each token
        const estimatedValue = (parseFloat(pos.balance) || 0) * 0.5;
        token.value += estimatedValue;
        token.isEstimated = true;
        token.sources.push(`${pos.protocol} - ${pos.pair} (estimated)`);
        estimatedCount++;
      }
    }

    // Token 1
    if (tokens[1]) {
      const originalSymbol = tokens[1];
      const consolidatedSymbol = getConsolidatedToken(originalSymbol);
      const key = consolidatedSymbol;

      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          symbol: consolidatedSymbol,
          amount: 0,
          value: 0,
          sources: [],
          isEstimated: false
        });
      }

      const token = tokenMap.get(key);

      // Check if we have actual token data
      if (pos.token1Amount && pos.token1Value) {
        token.amount += parseFloat(pos.token1Amount) || 0;
        token.value += parseFloat(pos.token1Value) || 0;
        token.sources.push(`${pos.protocol} - ${pos.pair}`);
      } else {
        // Estimate: balance * 0.5 for each token
        const estimatedValue = (parseFloat(pos.balance) || 0) * 0.5;
        token.value += estimatedValue;
        token.isEstimated = true;
        token.sources.push(`${pos.protocol} - ${pos.pair} (estimated)`);
        estimatedCount++;
      }
    }
  });

  // Convert to array and sort by value
  const tokens = Array.from(tokenMap.values()).sort((a, b) => b.value - a.value);

  // Calculate estimation percentage
  const estimationPct = totalPositions > 0 ? (estimatedCount / (totalPositions * 2)) * 100 : 0;

  return { tokens, estimationPct };
}

/**
 * Aggregate hedge tokens (net exposure: long - short) with consolidation
 *
 * Calculates net directional exposure from perpetual futures hedges.
 *
 * How it works:
 * 1. Group all hedge positions by token (with consolidation)
 * 2. Separate long and short positions
 * 3. Calculate net exposure = long amount - short amount
 * 4. Track position counts for each side
 *
 * Net Exposure Logic (v1.5.1):
 * - Positive net = long bias (more long than short)
 * - Negative net = short bias (more short than long)
 * - Zero net = perfectly hedged
 *
 * Example:
 *   - 10 ETH long + 3 ETH short = +7 ETH net (long bias)
 *   - 0 BTC long + 0.5 BTC short = -0.5 BTC net (short bias)
 *
 * @returns {Array} - Array of token objects with net exposure
 *
 * Example output:
 * [
 *   {
 *     symbol: 'ETH',
 *     longAmount: 10, shortAmount: 3, netAmount: 7,
 *     longValue: 30000, shortValue: 9000, netValue: 21000,
 *     longPositions: 1, shortPositions: 1
 *   }
 * ]
 */
function aggregateHedgeTokens() {
  const tokenMap = new Map();

  hedgePositions.forEach(pos => {
    const originalSymbol = pos.asset || pos.symbol;
    if (!originalSymbol) return;

    const consolidatedSymbol = getConsolidatedToken(originalSymbol);

    if (!tokenMap.has(consolidatedSymbol)) {
      tokenMap.set(consolidatedSymbol, {
        symbol: consolidatedSymbol,
        longAmount: 0,
        shortAmount: 0,
        netAmount: 0,
        longValue: 0,
        shortValue: 0,
        netValue: 0,
        longPositions: 0,
        shortPositions: 0
      });
    }

    const token = tokenMap.get(consolidatedSymbol);
    const size = parseFloat(pos.size) || 0;
    const value = typeof pos.usdValue === 'string'
      ? parseFloat(pos.usdValue.replace(/[$,]/g, ''))
      : parseFloat(pos.usdValue) || 0;
    const isLong = pos.side?.toLowerCase() === 'long';

    if (isLong) {
      token.longAmount += size;
      token.longValue += value;
      token.longPositions++;
    } else {
      token.shortAmount += size;
      token.shortValue += value;
      token.shortPositions++;
    }

    // Calculate net exposure
    token.netAmount = token.longAmount - token.shortAmount;
    token.netValue = token.longValue - token.shortValue;
  });

  // Convert to array and sort by absolute net value
  const tokens = Array.from(tokenMap.values())
    .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue));

  return tokens;
}

/**
 * Format token amount with symbol (for table display)
 *
 * Smart formatting based on amount size:
 * - Tiny amounts (<0.01): 6 decimals (e.g., "0.000123 BTC")
 * - Small amounts (<1): 4 decimals (e.g., "0.5432 ETH")
 * - Medium amounts (<100): 2 decimals (e.g., "42.50 SOL")
 * - Large amounts (>=100): No decimals with commas (e.g., "1,234 USDC")
 *
 * @param {number} amount - Token amount to format
 * @param {string} symbol - Token symbol (e.g., "ETH", "SOL")
 * @param {boolean} showSign - If true, add '+' prefix for positive values
 * @returns {string} - Formatted string (e.g., "+7.00 ETH")
 *
 * Usage:
 *   formatTokenWithSymbol(0.5, 'BTC', false)  -> "0.5000 BTC"
 *   formatTokenWithSymbol(7, 'ETH', true)     -> "+7.00 ETH"
 *   formatTokenWithSymbol(-200, 'SOL', true)  -> "-200 SOL"
 */
function formatTokenWithSymbol(amount, symbol, showSign = false) {
  let formatted;
  const absAmount = Math.abs(amount);

  if (absAmount < 0.01) {
    formatted = amount.toFixed(6);
  } else if (absAmount < 1) {
    formatted = amount.toFixed(4);
  } else if (absAmount < 100) {
    formatted = amount.toFixed(2);
  } else {
    formatted = Math.round(amount).toLocaleString('en-US');
  }

  if (showSign && amount > 0) {
    formatted = '+' + formatted;
  }

  return `${formatted} ${symbol}`;
}

/**
 * Render unified token exposure table (v1.5.1)
 *
 * Displays all token exposure in a single table with 6 columns:
 * 1. Token - Symbol with icon
 * 2. Price - Current USD price from CoinGecko
 * 3. CLM USD - Total USD value from CLM positions
 * 4. CLM Exposure - Token amount in CLM positions
 * 5. Hedge Exposure - Net token amount from hedges (long - short)
 * 6. Net Exposure - Total net exposure (CLM + Hedge)
 *
 * Sorting: By CLM USD value (descending) - shows most valuable holdings first
 *
 * Color coding:
 * - Green: Positive hedge/net exposure (long bias)
 * - Red: Negative hedge/net exposure (short bias)
 * - White: CLM exposure (always positive)
 *
 * @param {Array} clmTokens - Aggregated CLM tokens from aggregateCLMTokens()
 * @param {Array} hedgeTokens - Aggregated hedge tokens from aggregateHedgeTokens()
 * @param {Object} prices - Token prices from fetchTokenPrices()
 */
async function renderTokenExposureTable(clmTokens, hedgeTokens, prices) {
  const container = document.getElementById('tokenExposureTableBody');

  if (!container) {
    console.error('Token exposure table body not found');
    return;
  }

  // Combine all unique tokens from both CLM and hedge positions
  const allTokens = new Set([
    ...clmTokens.map(t => t.symbol),
    ...hedgeTokens.map(t => t.symbol)
  ]);

  // Create row data for each token
  const rows = Array.from(allTokens).map(symbol => {
    const clm = clmTokens.find(t => t.symbol === symbol);
    const hedge = hedgeTokens.find(t => t.symbol === symbol);
    const price = prices[symbol] || 0;

    return {
      symbol,
      price,
      clmAmount: clm ? (price > 0 ? clm.value / price : clm.amount) : 0,
      clmValue: clm?.value || 0,
      hedgeAmount: hedge?.netAmount || 0,
      sortValue: clm?.value || 0  // Sort by CLM USD value
    };
  });

  // Sort by CLM USD value (descending) - most valuable tokens first
  rows.sort((a, b) => b.sortValue - a.sortValue);

  // Generate HTML
  let html = '';
  rows.forEach(row => {
    const priceStr = row.price > 0
      ? `$${row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'N/A';

    // Calculate CLM USD value
    const clmUsdStr = row.clmValue > 0
      ? `$${Math.round(row.clmValue).toLocaleString('en-US')}`
      : '-';

    const clmStr = row.clmAmount > 0
      ? formatTokenWithSymbol(row.clmAmount, row.symbol)
      : '-';

    const hedgeStr = row.hedgeAmount !== 0
      ? formatTokenWithSymbol(row.hedgeAmount, row.symbol, true) // true = show sign
      : '-';

    // Calculate net exposure
    const netAmount = row.clmAmount + row.hedgeAmount;
    const netStr = netAmount !== 0
      ? formatTokenWithSymbol(netAmount, row.symbol, true) // true = show sign
      : '-';

    html += `
      <tr>
        <td class="token-cell">
          <div class="token-icon-small">${row.symbol.substring(0, 2)}</div>
          <span class="token-symbol-text">${row.symbol}</span>
        </td>
        <td class="price-cell">${priceStr}</td>
        <td class="clm-usd-cell">${clmUsdStr}</td>
        <td class="clm-cell">${clmStr}</td>
        <td class="hedge-cell ${row.hedgeAmount > 0 ? 'positive' : row.hedgeAmount < 0 ? 'negative' : ''}">${hedgeStr}</td>
        <td class="net-cell ${netAmount > 0 ? 'positive' : netAmount < 0 ? 'negative' : ''}">${netStr}</td>
      </tr>
    `;
  });

  container.innerHTML = html;
}

// ============================================================================
// REMOVED v1.5.1: renderCLMTokens() function (lines 1583-1650)
// Reason: Replaced by renderTokenExposureTable() unified renderer
// Previous implementation used card-based layout in separate CLM tab
// New implementation uses table format with all tokens in single view
// Replacement function: renderTokenExposureTable() - see line ~1506
// Benefits:
//   - Combined CLM + Hedge exposure in one table
//   - Cleaner UI without tab switching
//   - Net Exposure calculation (CLM + Hedge)
//   - Better sorting (by CLM USD value)
// ============================================================================

// ============================================================================
// REMOVED v1.5.1: renderHedgeTokens() function (lines 1652-1720)
// Reason: Replaced by renderTokenExposureTable() unified renderer
// Previous implementation used card-based layout in separate Hedge tab
// New implementation uses table format showing Hedge Exposure column
// Replacement function: renderTokenExposureTable() - see line ~1506
// Benefits:
//   - Side-by-side comparison with CLM exposure
//   - Net Exposure calculation (CLM + Hedge)
//   - Color-coded positive/negative values
//   - Consolidated view without tab switching
// ============================================================================

// Update token metrics in card header
function updateTokenMetrics(clmTokens, hedgeTokens, prices) {
  const totalCLMTokens = clmTokens.length;
  const totalHedgeTokens = hedgeTokens.length;

  const clmValue = clmTokens.reduce((sum, t) => sum + t.value, 0);
  const hedgeValue = hedgeTokens.reduce((sum, t) => sum + Math.abs(t.netValue), 0);
  const combinedValue = clmValue + hedgeValue;

  document.getElementById('totalCLMTokens').textContent = totalCLMTokens;
  document.getElementById('totalHedgeTokens').textContent = totalHedgeTokens;
  document.getElementById('combinedTokenValue').textContent = '$' + Math.round(combinedValue).toLocaleString('en-US');
}

// Initialize token exposure card
async function initTokenExposure() {
  try {
    console.log('🪙 Initializing Token Exposure card...');

    // Aggregate tokens
    const { tokens: clmTokens, estimationPct } = aggregateCLMTokens();
    const hedgeTokens = aggregateHedgeTokens();

    console.log('📊 CLM tokens aggregated:', clmTokens.length, `(${Math.round(estimationPct)}% estimated)`);
    console.log('📊 Hedge tokens aggregated:', hedgeTokens.length);

    // Get all unique symbols
    const clmSymbols = clmTokens.map(t => t.symbol);
    const hedgeSymbols = hedgeTokens.map(t => t.symbol);
    const allSymbols = [...new Set([...clmSymbols, ...hedgeSymbols])];

    // Fetch prices
    const prices = await fetchTokenPrices(allSymbols);

    // Render unified table
    await renderTokenExposureTable(clmTokens, hedgeTokens, prices);

    // Update metrics
    updateTokenMetrics(clmTokens, hedgeTokens, prices);

    console.log('✅ Token Exposure card initialized');

  } catch (error) {
    console.error('Failed to initialize Token Exposure card:', error);

    // Show error state
    const tableBody = document.getElementById('tokenExposureTableBody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem; color: #ef4444;">
            Failed to load token data. Please refresh the page.
          </td>
        </tr>
      `;
    }
  }
}

// =====================================
// END TOKEN EXPOSURE CARD
// =====================================

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
async function showEmptyStates() {
  renderCLMPositions();
  renderHedgePositions();
  renderCollateralPositions();
  updateUnifiedSummary();
  await initTokenExposure();
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
