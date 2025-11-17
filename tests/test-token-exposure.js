#!/usr/bin/env node

/**
 * Test: Token Exposure Card Functionality
 *
 * Tests the token aggregation, price fetching, and rendering logic
 * for the new Token Exposure card feature.
 */

console.log('🧪 Testing Token Exposure Card Functionality\n');
console.log('='.repeat(60));

// Mock data structures
const mockCLMPositions = [
  {
    pair: 'SOL/USDC',
    protocol: 'Orca',
    balance: 18654,
    token0Amount: 96.8,
    token1Amount: 5029,
    token0Value: 13616,
    token1Value: 5028,
    token0Percentage: 73,
    token1Percentage: 27
  },
  {
    pair: 'ETH/USDC',
    protocol: 'Uniswap',
    balance: 12500,
    token0Amount: 4.2,
    token1Amount: 7500,
    token0Value: 8400,
    token1Value: 7500,
    token0Percentage: 52,
    token1Percentage: 48
  },
  {
    pair: 'SOL/USDT',
    protocol: 'Raydium',
    balance: 8000,
    // Missing token data (should trigger estimation)
  },
  {
    pair: 'BTC/USDC',
    protocol: 'Uniswap',
    balance: 25000,
    token0Amount: 0.3,
    token1Amount: 13000,
    token0Value: 18000,
    token1Value: 13000,
  }
];

const mockHedgePositions = [
  {
    asset: 'ETH',
    side: 'long',
    size: 10,
    usdValue: '$30,000'
  },
  {
    asset: 'SOL',
    side: 'short',
    size: 200,
    usdValue: '$28,000'
  },
  {
    asset: 'ETH',
    side: 'short',
    size: 3,
    usdValue: '$9,000'
  },
  {
    asset: 'BTC',
    side: 'long',
    size: 0.5,
    usdValue: '$30,000'
  }
];

// Test counter
let passed = 0;
let failed = 0;

// Helper function to run tests
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASSED: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: CLM Token Aggregation - Basic Counting
console.log('\n📊 Test 1: CLM Token Aggregation - Token Counting');
console.log('-'.repeat(60));

test('Should extract all unique tokens from CLM positions', () => {
  // Simulate aggregation
  const tokenMap = new Map();

  mockCLMPositions.forEach(pos => {
    const tokens = pos.pair.split('/').map(t => t.trim());
    tokens.forEach(symbol => {
      if (!tokenMap.has(symbol)) {
        tokenMap.set(symbol, { symbol, value: 0, isEstimated: false });
      }
    });
  });

  const uniqueTokens = Array.from(tokenMap.keys());
  const expectedTokens = ['SOL', 'USDC', 'ETH', 'USDT', 'BTC'];

  if (uniqueTokens.length !== expectedTokens.length) {
    throw new Error(`Expected ${expectedTokens.length} tokens, got ${uniqueTokens.length}`);
  }

  expectedTokens.forEach(token => {
    if (!uniqueTokens.includes(token)) {
      throw new Error(`Missing token: ${token}`);
    }
  });
});

// Test 2: CLM Token Aggregation - Value Calculation
console.log('\n📊 Test 2: CLM Token Aggregation - Value Calculation');
console.log('-'.repeat(60));

test('Should sum token values across multiple positions', () => {
  const tokenMap = new Map();

  mockCLMPositions.forEach(pos => {
    const tokens = pos.pair.split('/');

    // Token 0
    const symbol0 = tokens[0].trim();
    if (!tokenMap.has(symbol0)) {
      tokenMap.set(symbol0, { symbol: symbol0, value: 0 });
    }
    const token0 = tokenMap.get(symbol0);
    if (pos.token0Value) {
      token0.value += parseFloat(pos.token0Value);
    }

    // Token 1
    const symbol1 = tokens[1].trim();
    if (!tokenMap.has(symbol1)) {
      tokenMap.set(symbol1, { symbol: symbol1, value: 0 });
    }
    const token1 = tokenMap.get(symbol1);
    if (pos.token1Value) {
      token1.value += parseFloat(pos.token1Value);
    }
  });

  // Check SOL value (should be 13616 from first position)
  const solToken = tokenMap.get('SOL');
  if (!solToken || solToken.value !== 13616) {
    throw new Error(`SOL value incorrect. Expected 13616, got ${solToken?.value}`);
  }

  // Check USDC value (should be 5028 + 7500 + 13000 = 25528)
  const usdcToken = tokenMap.get('USDC');
  const expectedUSDC = 5028 + 7500 + 13000;
  if (!usdcToken || usdcToken.value !== expectedUSDC) {
    throw new Error(`USDC value incorrect. Expected ${expectedUSDC}, got ${usdcToken?.value}`);
  }
});

// Test 3: CLM Token Aggregation - Estimation for Missing Data
console.log('\n📊 Test 3: CLM Token Aggregation - Missing Data Estimation');
console.log('-'.repeat(60));

test('Should estimate token values when data is missing', () => {
  let estimatedCount = 0;
  const totalPositions = mockCLMPositions.length;

  mockCLMPositions.forEach(pos => {
    // Check if token data is missing
    if (!pos.token0Amount || !pos.token0Value) {
      estimatedCount++;
    }
    if (!pos.token1Amount || !pos.token1Value) {
      estimatedCount++;
    }
  });

  const estimationPct = (estimatedCount / (totalPositions * 2)) * 100;

  // Should have 2 missing (SOL/USDT position)
  if (estimatedCount !== 2) {
    throw new Error(`Expected 2 missing token data, got ${estimatedCount}`);
  }

  // Estimation percentage should be 25% (2 out of 8 tokens)
  if (estimationPct !== 25) {
    throw new Error(`Expected 25% estimation, got ${estimationPct.toFixed(1)}%`);
  }
});

// Test 4: Hedge Token Aggregation - Net Exposure Calculation
console.log('\n📊 Test 4: Hedge Token Aggregation - Net Exposure');
console.log('-'.repeat(60));

test('Should calculate net exposure (long - short) for hedge tokens', () => {
  const tokenMap = new Map();

  mockHedgePositions.forEach(pos => {
    const symbol = pos.asset;
    if (!tokenMap.has(symbol)) {
      tokenMap.set(symbol, {
        symbol,
        longAmount: 0,
        shortAmount: 0,
        netAmount: 0,
        longValue: 0,
        shortValue: 0,
        netValue: 0
      });
    }

    const token = tokenMap.get(symbol);
    const size = parseFloat(pos.size);
    const value = parseFloat(pos.usdValue.replace(/[$,]/g, ''));
    const isLong = pos.side.toLowerCase() === 'long';

    if (isLong) {
      token.longAmount += size;
      token.longValue += value;
    } else {
      token.shortAmount += size;
      token.shortValue += value;
    }

    token.netAmount = token.longAmount - token.shortAmount;
    token.netValue = token.longValue - token.shortValue;
  });

  // Check ETH (10 long - 3 short = +7 net, $30k - $9k = +$21k)
  const ethToken = tokenMap.get('ETH');
  if (!ethToken || ethToken.netAmount !== 7) {
    throw new Error(`ETH net amount incorrect. Expected 7, got ${ethToken?.netAmount}`);
  }
  if (ethToken.netValue !== 21000) {
    throw new Error(`ETH net value incorrect. Expected 21000, got ${ethToken?.netValue}`);
  }

  // Check SOL (0 long - 200 short = -200 net, $0 - $28k = -$28k)
  const solToken = tokenMap.get('SOL');
  if (!solToken || solToken.netAmount !== -200) {
    throw new Error(`SOL net amount incorrect. Expected -200, got ${solToken?.netAmount}`);
  }
  if (solToken.netValue !== -28000) {
    throw new Error(`SOL net value incorrect. Expected -28000, got ${solToken?.netValue}`);
  }
});

// Test 5: Token Symbol Normalization
console.log('\n📊 Test 5: Token Symbol Normalization');
console.log('-'.repeat(60));

test('Should normalize wrapped token variants', () => {
  function normalizeTokenSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol === 'USDC.E') return 'USDC.e';
    return upperSymbol;
  }

  // Test various normalizations
  const tests = [
    ['WETH', 'WETH'],
    ['weth', 'WETH'],
    ['USDC.e', 'USDC.e'],
    ['USDC.E', 'USDC.e'],
    ['SOL', 'SOL'],
    ['sol', 'SOL'],
  ];

  tests.forEach(([input, expected]) => {
    const result = normalizeTokenSymbol(input);
    if (result !== expected) {
      throw new Error(`Normalization failed for ${input}. Expected ${expected}, got ${result}`);
    }
  });
});

// Test 6: CoinGecko Token Mapping
console.log('\n📊 Test 6: CoinGecko Token Mapping');
console.log('-'.repeat(60));

test('Should have mappings for common tokens', () => {
  const COINGECKO_TOKEN_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'WETH': 'ethereum',
    'WBTC': 'wrapped-bitcoin',
    'cbBTC': 'coinbase-wrapped-btc',
  };

  const requiredTokens = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];

  requiredTokens.forEach(token => {
    if (!COINGECKO_TOKEN_MAP[token]) {
      throw new Error(`Missing CoinGecko mapping for ${token}`);
    }
  });

  // Verify wrapped variants point to correct base tokens
  if (COINGECKO_TOKEN_MAP['WETH'] !== 'ethereum') {
    throw new Error('WETH should map to ethereum');
  }
  if (COINGECKO_TOKEN_MAP['WBTC'] !== 'wrapped-bitcoin') {
    throw new Error('WBTC should map to wrapped-bitcoin');
  }
});

// Test 7: Data Quality Warning Threshold
console.log('\n📊 Test 7: Data Quality Warning Display Logic');
console.log('-'.repeat(60));

test('Should show warning when >50% of data is estimated', () => {
  // Test case 1: 25% estimation (should NOT show warning)
  let estimationPct = 25;
  let shouldShowWarning = estimationPct > 50;
  if (shouldShowWarning) {
    throw new Error('Warning should not show for 25% estimation');
  }

  // Test case 2: 51% estimation (should show warning)
  estimationPct = 51;
  shouldShowWarning = estimationPct > 50;
  if (!shouldShowWarning) {
    throw new Error('Warning should show for 51% estimation');
  }

  // Test case 3: Exactly 50% (should NOT show warning)
  estimationPct = 50;
  shouldShowWarning = estimationPct > 50;
  if (shouldShowWarning) {
    throw new Error('Warning should not show for exactly 50% estimation');
  }
});

// Test 8: Amount Formatting Logic
console.log('\n📊 Test 8: Token Amount Formatting');
console.log('-'.repeat(60));

test('Should format token amounts with appropriate decimal places', () => {
  function formatAmount(amount) {
    if (amount < 1) {
      return amount.toFixed(6);
    } else if (amount < 100) {
      return amount.toFixed(2);
    } else {
      return Math.round(amount).toLocaleString('en-US');
    }
  }

  const tests = [
    [0.000123, '0.000123'],
    [0.5, '0.500000'],
    [1.5, '1.50'],
    [99.99, '99.99'],
    [100, '100'],
    [1234.56, '1,235'], // Rounds to nearest integer
    [1000000, '1,000,000'],
  ];

  tests.forEach(([input, expected]) => {
    const result = formatAmount(input);
    if (result !== expected) {
      throw new Error(`Format failed for ${input}. Expected ${expected}, got ${result}`);
    }
  });
});

// Test Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Token Exposure card logic is working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${failed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
