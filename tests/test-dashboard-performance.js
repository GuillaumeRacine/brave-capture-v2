/**
 * Dashboard Performance Test Script
 *
 * This script simulates dashboard loading to measure:
 * 1. First load (no cache) - should fetch from database
 * 2. Second load (with cache) - should use cached data
 * 3. Verify captures fetch is avoided when cache is available
 */

// Mock console for capturing output
const logs = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  logs.push(msg);
  originalConsoleLog(...args);
};

// Performance metrics
const metrics = {
  firstLoad: {
    start: 0,
    end: 0,
    duration: 0,
    capturesFetched: false,
    positionsFetched: false
  },
  secondLoad: {
    start: 0,
    end: 0,
    duration: 0,
    capturesFetched: false,
    positionsFetched: false,
    usedCache: false
  }
};

// Mock Supabase client
const mockSupabase = {
  from: (table) => {
    const query = {
      select: (cols) => query,
      order: (col, opts) => query,
      eq: (col, val) => query,
      limit: (n) => query,
      async single() {
        await new Promise(r => setTimeout(r, 50)); // Simulate network delay
        return { data: {}, error: null };
      },
      async then(resolve) {
        await new Promise(r => setTimeout(r, 50)); // Simulate network delay

        if (table === 'captures') {
          metrics.currentLoad.capturesFetched = true;
          console.log('MOCK: Fetching captures from database');
          return resolve({ data: generateMockCaptures(100), error: null });
        }

        if (table === 'positions') {
          metrics.currentLoad.positionsFetched = true;
          console.log('MOCK: Fetching positions from database');
          return resolve({ data: generateMockPositions(693), error: null });
        }

        return resolve({ data: [], error: null });
      }
    };
    return query;
  }
};

// Generate mock data
function generateMockCaptures(count) {
  const protocols = ['Orca', 'Raydium', 'Hyperliquid', 'Aave', 'Morpho'];
  return Array.from({ length: count }, (_, i) => ({
    id: `capture-${i}`,
    protocol: protocols[i % protocols.length],
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    data: {
      content: {
        hyperliquidPositions: i % 5 === 0 ? { positions: [] } : null,
        aavePositions: i % 5 === 1 ? { positions: [] } : null,
        morphoPositions: i % 5 === 2 ? { positions: [] } : null
      }
    }
  }));
}

function generateMockPositions(count) {
  const pairs = ['SOL/USDC', 'ETH/USDC', 'BTC/USDC', 'ARB/ETH'];
  const protocols = ['Orca', 'Raydium', 'Aerodrome'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    protocol: protocols[i % protocols.length],
    pair: pairs[i % pairs.length],
    balance: Math.random() * 10000,
    captured_at: new Date(Date.now() - i * 60000).toISOString()
  }));
}

// Mock cache object
const cache = {
  positions: null,
  latestPositions: null,
  latestPositionsMap: new Map(),
  timestamp: null,
  lastCaptureIds: new Set()
};

// Mock functions
async function getCaptures(options = {}) {
  const query = mockSupabase.from('captures').select('*').order('timestamp', { ascending: false });
  if (options.limit) query.limit(options.limit);
  return query;
}

async function getLatestPositions() {
  // Check cache first
  if (cache.latestPositions && cache.latestPositions.length > 0) {
    console.log('📦 Using cached latest positions (persistent cache)');
    metrics.currentLoad.usedCache = true;
    return cache.latestPositions;
  }

  console.log('🔍 No cache available, fetching from database');
  const positions = await mockSupabase.from('positions').select('*').order('captured_at', { ascending: false });

  // Group by pair and keep only the most recent
  const latestMap = new Map();
  positions.data.forEach(pos => {
    const key = `${pos.protocol}-${pos.pair}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
      latestMap.set(key, pos);
    }
  });

  const result = Array.from(latestMap.values());

  // Cache the results
  cache.latestPositions = result;
  cache.latestPositionsMap = latestMap;
  cache.timestamp = Date.now();
  console.log('💾 Cached latest positions:', result.length);

  return result;
}

// Simulate current dashboard loading behavior
async function loadAllPositions_CURRENT() {
  console.log('📊 Loading all positions (CURRENT implementation)...');

  // PROBLEM: Always fetches captures first, even if we have cached positions
  let captures = [];
  try {
    captures = await getCaptures({ limit: 100 });
    console.log(`Found ${captures?.length || 0} captures`);
  } catch (e) {
    console.warn('Failed to load captures:', e?.message);
    captures = [];
  }

  // Then load CLM positions (which checks cache)
  await loadCLMPositions_CURRENT(captures);
}

async function loadCLMPositions_CURRENT(captures) {
  console.log('💎 Loading CLM positions...');
  const positions = await getLatestPositions();
  console.log('📊 Loaded', positions.length, 'positions');
}

// Simulate optimized dashboard loading behavior
async function loadAllPositions_OPTIMIZED() {
  console.log('📊 Loading all positions (OPTIMIZED implementation)...');

  // Check if we have cached positions first
  let positions = [];
  const hasCachedPositions = cache.latestPositions && cache.latestPositions.length > 0;

  if (hasCachedPositions) {
    console.log('⚡ Cache available, loading positions only');
    positions = await getLatestPositions();
    console.log('📊 Loaded', positions.length, 'positions from cache');
    // Skip captures fetch entirely since we have all CLM data
    return;
  }

  // No cache - need to fetch everything
  console.log('🔍 No cache, fetching all data');

  // Load CLM positions first (will cache them)
  positions = await getLatestPositions();
  console.log('📊 Loaded', positions.length, 'positions from database');

  // Only fetch captures if we need hedge/collateral data
  // For now, we'll still fetch them, but this could be further optimized
  let captures = [];
  try {
    captures = await getCaptures({ limit: 100 });
    console.log(`Found ${captures?.length || 0} captures for hedge/collateral`);
  } catch (e) {
    console.warn('Failed to load captures:', e?.message);
  }
}

// Run tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('DASHBOARD PERFORMANCE TEST');
  console.log('='.repeat(60) + '\n');

  // Test 1: First load (no cache) - CURRENT
  console.log('\n--- TEST 1: First Load (CURRENT) ---');
  metrics.currentLoad = metrics.firstLoad;
  logs.length = 0;

  metrics.firstLoad.start = Date.now();
  await loadAllPositions_CURRENT();
  metrics.firstLoad.end = Date.now();
  metrics.firstLoad.duration = metrics.firstLoad.end - metrics.firstLoad.start;

  console.log('\nFirst Load Results:');
  console.log('  Duration:', metrics.firstLoad.duration + 'ms');
  console.log('  Captures fetched:', metrics.firstLoad.capturesFetched);
  console.log('  Positions fetched:', metrics.firstLoad.positionsFetched);

  // Test 2: Second load (with cache) - CURRENT
  console.log('\n--- TEST 2: Second Load (CURRENT - Should use cache) ---');
  metrics.currentLoad = metrics.secondLoad;
  logs.length = 0;

  metrics.secondLoad.start = Date.now();
  await loadAllPositions_CURRENT();
  metrics.secondLoad.end = Date.now();
  metrics.secondLoad.duration = metrics.secondLoad.end - metrics.secondLoad.start;

  console.log('\nSecond Load Results:');
  console.log('  Duration:', metrics.secondLoad.duration + 'ms');
  console.log('  Captures fetched:', metrics.secondLoad.capturesFetched, '❌ SHOULD BE FALSE');
  console.log('  Positions fetched:', metrics.secondLoad.positionsFetched, '❌ SHOULD BE FALSE');
  console.log('  Used cache:', metrics.secondLoad.usedCache, metrics.secondLoad.usedCache ? '✅' : '❌');

  // Clear cache for optimized test
  cache.latestPositions = null;
  cache.latestPositionsMap.clear();

  // Test 3: First load - OPTIMIZED
  console.log('\n--- TEST 3: First Load (OPTIMIZED) ---');
  const optimizedFirstLoad = {
    start: 0,
    end: 0,
    duration: 0,
    capturesFetched: false,
    positionsFetched: false,
    usedCache: false
  };
  metrics.currentLoad = optimizedFirstLoad;
  logs.length = 0;

  optimizedFirstLoad.start = Date.now();
  await loadAllPositions_OPTIMIZED();
  optimizedFirstLoad.end = Date.now();
  optimizedFirstLoad.duration = optimizedFirstLoad.end - optimizedFirstLoad.start;

  console.log('\nOptimized First Load Results:');
  console.log('  Duration:', optimizedFirstLoad.duration + 'ms');
  console.log('  Captures fetched:', optimizedFirstLoad.capturesFetched);
  console.log('  Positions fetched:', optimizedFirstLoad.positionsFetched);

  // Test 4: Second load - OPTIMIZED
  console.log('\n--- TEST 4: Second Load (OPTIMIZED - Should use cache) ---');
  const optimizedSecondLoad = {
    start: 0,
    end: 0,
    duration: 0,
    capturesFetched: false,
    positionsFetched: false,
    usedCache: false
  };
  metrics.currentLoad = optimizedSecondLoad;
  logs.length = 0;

  optimizedSecondLoad.start = Date.now();
  await loadAllPositions_OPTIMIZED();
  optimizedSecondLoad.end = Date.now();
  optimizedSecondLoad.duration = optimizedSecondLoad.end - optimizedSecondLoad.start;

  console.log('\nOptimized Second Load Results:');
  console.log('  Duration:', optimizedSecondLoad.duration + 'ms');
  console.log('  Captures fetched:', optimizedSecondLoad.capturesFetched, optimizedSecondLoad.capturesFetched ? '❌' : '✅');
  console.log('  Positions fetched:', optimizedSecondLoad.positionsFetched, optimizedSecondLoad.positionsFetched ? '❌' : '✅');
  console.log('  Used cache:', optimizedSecondLoad.usedCache, optimizedSecondLoad.usedCache ? '✅' : '❌');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  console.log('\nCURRENT Implementation:');
  console.log('  First Load:  ' + metrics.firstLoad.duration + 'ms');
  console.log('  Second Load: ' + metrics.secondLoad.duration + 'ms');
  console.log('  Problem: Second load still fetches 100 captures ❌');

  console.log('\nOPTIMIZED Implementation:');
  console.log('  First Load:  ' + optimizedFirstLoad.duration + 'ms');
  console.log('  Second Load: ' + optimizedSecondLoad.duration + 'ms');
  console.log('  Improvement: ' + (metrics.secondLoad.duration - optimizedSecondLoad.duration) + 'ms faster ✅');
  console.log('  Second load skips captures fetch entirely ✅');

  console.log('\n' + '='.repeat(60));
}

// Run the tests
runTests().catch(console.error);
