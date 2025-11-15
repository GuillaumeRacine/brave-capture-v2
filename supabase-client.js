// Supabase client for browser extension
// This file is imported by both popup.js and dashboard.html

// Get configuration from config.js
const SUPABASE_URL = window.SUPABASE_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.SUPABASE_ANON_KEY;

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase not configured. Please update config.js with your credentials.');
}

// Enhanced cache for positions data
// Cache persists indefinitely until new capture for that specific position comes in
const cache = {
  positions: null,
  latestPositions: null,
  latestPositionsMap: new Map(), // Maps "protocol-pair" -> position object
  captures: null, // Cache captures for hedge/collateral data
  capturesTimestamp: null,
  timestamp: null,
  lastCaptureIds: new Set() // Track capture IDs we've seen
};

/**
 * Clear the entire cache (called manually or on major data changes)
 */
function clearCache() {
  cache.positions = null;
  cache.latestPositions = null;
  cache.latestPositionsMap.clear();
  cache.captures = null;
  cache.capturesTimestamp = null;
  cache.timestamp = null;
  cache.lastCaptureIds.clear();
  console.log('🔄 Full cache cleared');
}

/**
 * Invalidate cache for specific position (called when new capture detected for that pair)
 * @param {string} protocol - Protocol name
 * @param {string} pair - Token pair
 */
function invalidatePositionCache(protocol, pair) {
  const key = `${protocol}-${pair}`;
  if (cache.latestPositionsMap.has(key)) {
    cache.latestPositionsMap.delete(key);
    console.log(`🔄 Invalidated cache for ${key}`);
  }

  // CRITICAL FIX: Clear the array cache too, since it contains stale data
  // When ANY position is updated, we need to re-query all positions
  // to ensure the dashboard shows the latest data
  if (cache.latestPositions !== null) {
    cache.latestPositions = null;
    console.log(`🔄 Cleared latestPositions array cache due to update for ${key}`);
  }
}

/**
 * Check if we have any cached data
 */
function hasCachedData() {
  return cache.latestPositionsMap.size > 0 || cache.latestPositions !== null;
}

/**
 * Save a capture to Supabase
 * @param {Object} capture - The capture object
 * @returns {Promise<Object>} Result with success status
 */
async function saveCapture(capture) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Insert the main capture record (no auth/user_id until deployment)
    const { data: captureData, error: captureError } = await supabase
      .from('captures')
      .insert([{
        id: capture.id,
        url: capture.url,
        title: capture.title,
        timestamp: capture.timestamp,
        protocol: capture.protocol,
        data: capture.data,
        screenshot: capture.screenshot || null
      }])
      .select()
      .single();

    if (captureError) {
      console.error('Error saving capture:', captureError);
      return { success: false, error: captureError.message };
    }

    // DISABLED: Position insertion now handled by AI extraction in background.js
    // This prevents duplicate positions (DOM parser creates "SOL/USDC0", AI creates "SOL/USDC")
    // The AI extraction runs after screenshot and has better token data extraction
    //
    // if (capture.data?.content?.clmPositions?.positions) {
    //   const positions = capture.data.content.clmPositions.positions.map(pos => ({
    //     capture_id: capture.id,
    //     protocol: capture.protocol,
    //     pair: pos.pair,
    //     token0: pos.token0,
    //     token1: pos.token1,
    //     token0_amount: pos.token0Amount,
    //     token1_amount: pos.token1Amount,
    //     token0_value: pos.token0Value,
    //     token1_value: pos.token1Value,
    //     token0_percentage: pos.token0Percentage,
    //     token1_percentage: pos.token1Percentage,
    //     fee_tier: pos.feeTier,
    //     balance: pos.balance,
    //     pending_yield: pos.pendingYield,
    //     apy: pos.apy,
    //     range_min: pos.rangeMin,
    //     range_max: pos.rangeMax,
    //     current_price: pos.currentPrice,
    //     in_range: pos.inRange,
    //     range_status: pos.rangeStatus,
    //     distance_from_range: pos.distanceFromRange,
    //     network: pos.network,
    //     captured_at: pos.capturedAt || capture.timestamp
    //   }));
    //
    //   const { error: positionsError } = await supabase
    //     .from('positions')
    //     .insert(positions);
    //
    //   if (positionsError) {
    //     console.error('Error saving positions:', positionsError);
    //     // Don't fail the whole operation if positions fail
    //   }
    // }

    console.log('✅ Capture saved to Supabase:', capture.id);

    // Invalidate cache only for positions that were updated
    if (capture.data?.content?.clmPositions?.positions) {
      const posCount = capture.data.content.clmPositions.positions.length;
      capture.data.content.clmPositions.positions.forEach(pos => {
        invalidatePositionCache(capture.protocol, pos.pair);
      });
      console.log(`🔄 Invalidated cache for ${posCount} position(s)`);
    }

    // Add this capture ID to our tracking set
    cache.lastCaptureIds.add(capture.id);

    return { success: true, data: captureData };

  } catch (error) {
    console.error('Error in saveCapture:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all captures, optionally filtered by protocol
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of captures
 */
async function getCaptures(options = {}) {
  try {
    // Check cache for unfiltered, limited captures (common dashboard query)
    const cacheKey = JSON.stringify(options);
    const isCacheable = !options.protocol && options.limit && options.limit <= 100;

    if (isCacheable && cache.captures && cache.capturesTimestamp) {
      // Cache is valid for 5 minutes for captures (hedge/collateral data)
      const cacheAge = Date.now() - cache.capturesTimestamp;
      if (cacheAge < 5 * 60 * 1000) {
        console.log('📦 Using cached captures (hedge/collateral data)');
        return cache.captures.slice(0, options.limit);
      }
    }

    let query = supabase
      .from('captures')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options.protocol) {
      query = query.eq('protocol', options.protocol);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching captures:', error);
      return [];
    }

    // Cache unfiltered, limited results
    if (isCacheable && data) {
      cache.captures = data;
      cache.capturesTimestamp = Date.now();
      console.log('💾 Cached captures for hedge/collateral:', data.length);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCaptures:', error);
    return [];
  }
}

/**
 * Get all positions with filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of positions
 */
async function getPositions(options = {}) {
  try {
    // Check cache first (only if no filters applied)
    // Cache persists indefinitely until positions are updated
    if (!options.protocol && !options.pair && !options.limit && options.inRange === undefined) {
      if (cache.positions) {
        console.log('📦 Using cached positions (persistent cache)');
        return cache.positions;
      }
    }

    let query = supabase
      .from('positions')
      .select('*')
      .order('captured_at', { ascending: false });

    if (options.protocol) {
      query = query.eq('protocol', options.protocol);
    }

    if (options.inRange !== undefined) {
      query = query.eq('in_range', options.inRange);
    }

    if (options.pair) {
      query = query.eq('pair', options.pair);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    // Cache the unfiltered results (persistent cache)
    if (!options.protocol && !options.pair && !options.limit && options.inRange === undefined) {
      cache.positions = data || [];
      cache.timestamp = Date.now();
      console.log('💾 Cached all positions:', cache.positions.length);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPositions:', error);
    return [];
  }
}

/**
 * Get the most recent position for each unique pair
 * IMPORTANT: Prioritizes positions WITH token data when available
 *
 * Logic:
 * 1. First, try to get the most recent position WITH complete token data for each pair
 * 2. If no position with token data exists, fall back to most recent position (even with null data)
 *
 * This ensures that after rotation captures, we display complete token data for all pairs
 * even if the most recent capture didn't have that specific pair expanded.
 *
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of latest positions
 */
async function getLatestPositions(options = {}) {
  try {
    // Check persistent cache first (only if no filters)
    // This cache persists until new captures invalidate specific positions
    if (Object.keys(options).length === 0) {
      if (cache.latestPositions && cache.latestPositions.length > 0) {
        console.log('📦 Using cached latest positions (persistent cache)');
        return cache.latestPositions;
      }
    }

    // Get all positions
    const positions = await getPositions(options);

    // Group by pair and keep the BEST position (prefer one with token data)
    const latestMap = new Map();
    positions.forEach(pos => {
      const key = `${pos.protocol}-${pos.pair}`;
      const existing = latestMap.get(key);

      const hasTokenData = pos.token0_amount !== null && pos.token1_amount !== null;
      const existingHasTokenData = existing?.token0_amount !== null && existing?.token1_amount !== null;

      // Decide if we should replace the existing position
      let shouldReplace = false;

      if (!existing) {
        // No existing position, always use this one
        shouldReplace = true;
      } else if (hasTokenData && !existingHasTokenData) {
        // This position has token data, existing doesn't - prefer this one
        shouldReplace = true;
      } else if (hasTokenData && existingHasTokenData) {
        // Both have token data - prefer most recent
        shouldReplace = new Date(pos.captured_at) > new Date(existing.captured_at);
      } else if (!hasTokenData && !existingHasTokenData) {
        // Neither has token data - prefer most recent
        shouldReplace = new Date(pos.captured_at) > new Date(existing.captured_at);
      }
      // If existing has token data and this doesn't, keep existing (shouldReplace stays false)

      if (shouldReplace) {
        latestMap.set(key, pos);
      }
    });

    const result = Array.from(latestMap.values());

    // Cache the result if no filters (persistent cache)
    if (Object.keys(options).length === 0) {
      cache.latestPositions = result;
      cache.latestPositionsMap = latestMap; // Also store the map for targeted invalidation
      cache.timestamp = Date.now();
      console.log('💾 Cached latest positions (persistent):', result.length);
    }

    return result;
  } catch (error) {
    console.error('Error in getLatestPositions:', error);
    return [];
  }
}

/**
 * Get recent captures for display
 * @param {number} limit - Number of captures to fetch
 * @returns {Promise<Array>} Array of recent captures
 */
async function getRecentCaptures(limit = 5) {
  return getCaptures({ limit });
}

/**
 * Delete old captures (optional cleanup)
 * @param {number} daysToKeep - Keep captures from the last N days
 * @returns {Promise<Object>} Result with count of deleted records
 */
async function deleteOldCaptures(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('captures')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
      .select();

    if (error) {
      console.error('Error deleting old captures:', error);
      return { success: false, error: error.message };
    }

    console.log(`🗑️ Deleted ${data?.length || 0} old captures`);
    return { success: true, deletedCount: data?.length || 0 };

  } catch (error) {
    console.error('Error in deleteOldCaptures:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get position statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getPositionStats() {
  try {
    const positions = await getLatestPositions();

    const stats = {
      totalPositions: positions.length,
      inRangeCount: positions.filter(p => p.in_range).length,
      outOfRangeCount: positions.filter(p => !p.in_range).length,
      totalValue: positions.reduce((sum, p) => sum + (p.balance || 0), 0),
      totalPendingYield: positions.reduce((sum, p) => sum + (p.pending_yield || 0), 0),
      avgAPY: positions.length > 0
        ? positions.reduce((sum, p) => sum + (p.apy || 0), 0) / positions.length
        : 0,
      protocols: [...new Set(positions.map(p => p.protocol))],
      pairs: [...new Set(positions.map(p => p.pair))]
    };

    return stats;
  } catch (error) {
    console.error('Error in getPositionStats:', error);
    return {
      totalPositions: 0,
      inRangeCount: 0,
      outOfRangeCount: 0,
      totalValue: 0,
      totalPendingYield: 0,
      avgAPY: 0,
      protocols: [],
      pairs: []
    };
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    supabase,
    saveCapture,
    getCaptures,
    getPositions,
    getLatestPositions,
    getRecentCaptures,
    deleteOldCaptures,
    getPositionStats
  };
}

// Also expose to window object for browser usage (popup, dashboard)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.saveCapture = saveCapture;
  window.getCaptures = getCaptures;
  window.getPositions = getPositions;
  window.getLatestPositions = getLatestPositions;
  window.getRecentCaptures = getRecentCaptures;
  window.deleteOldCaptures = deleteOldCaptures;
  window.getPositionStats = getPositionStats;
  window.clearCache = clearCache; // Allow manual cache clearing
  window.invalidatePositionCache = invalidatePositionCache; // Allow targeted cache invalidation
  window.hasCachedData = hasCachedData; // Check if cache has data
}
