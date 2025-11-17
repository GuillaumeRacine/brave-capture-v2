/**
 * Test Script: Token Exposure Card Fix
 *
 * Purpose: Verify that the aggregateHedgeTokens() function handles both
 * string and number formats for usdValue without throwing TypeError.
 *
 * This test simulates real hedge positions with mixed data formats:
 * - String format: "$30,000" (with $ and commas)
 * - Number format: 9000 (raw number)
 */

// Mock hedge positions with mixed usdValue formats
const mockHedgePositions = [
  // String format (as might come from UI scraping)
  {
    asset: 'ETH',
    symbol: 'ETH',
    side: 'long',
    size: '10',
    usdValue: '$30,000',  // String with $ and comma
    pnl: '$500',
    pnlPercent: '1.67',
    leverage: '5x',
    entryPrice: '3000',
    markPrice: '3050',
    liquidationPrice: '2400',
    margin: 6000,
    fundingRate: '0.01%'
  },
  // Number format (as stored in database)
  {
    asset: 'ETH',
    symbol: 'ETH',
    side: 'short',
    size: '3',
    usdValue: 9000,  // Pure number
    pnl: '-$100',
    pnlPercent: '-1.11',
    leverage: '3x',
    entryPrice: '3000',
    markPrice: '3000',
    liquidationPrice: '3600',
    margin: 3000,
    fundingRate: '-0.005%'
  },
  // Number format
  {
    asset: 'SOL',
    symbol: 'SOL',
    side: 'short',
    size: '200',
    usdValue: 28000,  // Pure number
    pnl: '$200',
    pnlPercent: '0.71',
    leverage: '10x',
    entryPrice: '140',
    markPrice: '139',
    liquidationPrice: '154',
    margin: 2800,
    fundingRate: '0.008%'
  },
  // String format
  {
    asset: 'BTC',
    symbol: 'BTC',
    side: 'long',
    size: '0.5',
    usdValue: '$30,000',  // String with $ and comma
    pnl: '$1,200',
    pnlPercent: '4.00',
    leverage: '2x',
    entryPrice: '60000',
    markPrice: '62400',
    liquidationPrice: '45000',
    margin: 15000,
    fundingRate: '0.01%'
  },
  // Edge case: zero value
  {
    asset: 'AVAX',
    symbol: 'AVAX',
    side: 'long',
    size: '0',
    usdValue: 0,  // Zero
    pnl: '$0',
    pnlPercent: '0',
    leverage: '1x',
    entryPrice: '35',
    markPrice: '35',
    liquidationPrice: '25',
    margin: 0,
    fundingRate: '0%'
  },
  // Edge case: string zero
  {
    asset: 'MATIC',
    symbol: 'MATIC',
    side: 'short',
    size: '0',
    usdValue: '$0',  // String zero
    pnl: '$0',
    pnlPercent: '0',
    leverage: '1x',
    entryPrice: '0.85',
    markPrice: '0.85',
    liquidationPrice: '1.05',
    margin: 0,
    fundingRate: '0%'
  }
];

// Copy the aggregateHedgeTokens function from dashboard.js
function aggregateHedgeTokens() {
  const tokenMap = new Map();

  mockHedgePositions.forEach(pos => {
    const symbol = pos.asset || pos.symbol;
    if (!symbol) return;

    if (!tokenMap.has(symbol)) {
      tokenMap.set(symbol, {
        symbol,
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

    const token = tokenMap.get(symbol);
    const size = parseFloat(pos.size) || 0;

    // CRITICAL FIX: Handle both string and number formats for usdValue
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

// Test assertions
function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`);
    return true;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    return false;
  }
}

function assertApproxEqual(actual, expected, tolerance, testName) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`✅ PASS: ${testName}`);
    return true;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected: ${expected} (±${tolerance})`);
    console.error(`   Actual: ${actual}`);
    console.error(`   Difference: ${diff}`);
    return false;
  }
}

// Run the test
console.log('🧪 Testing Token Exposure Card Fix\n');
console.log('📊 Mock Hedge Positions:');
console.log('  - ETH Long: 10 ETH @ $30,000 (string format)');
console.log('  - ETH Short: 3 ETH @ $9,000 (number format)');
console.log('  - SOL Short: 200 SOL @ $28,000 (number format)');
console.log('  - BTC Long: 0.5 BTC @ $30,000 (string format)');
console.log('  - AVAX Long: 0 AVAX @ $0 (number zero)');
console.log('  - MATIC Short: 0 MATIC @ $0 (string zero)\n');

let allTestsPassed = true;

try {
  // Run aggregation
  console.log('🔄 Running aggregateHedgeTokens()...\n');
  const result = aggregateHedgeTokens();

  console.log('✅ No TypeError thrown!\n');

  // Display results
  console.log('📈 Aggregation Results:');
  console.log('─'.repeat(80));
  result.forEach((token, index) => {
    console.log(`${index + 1}. ${token.symbol}:`);
    console.log(`   Long:  ${token.longAmount} (${token.longPositions} positions) = $${token.longValue.toLocaleString()}`);
    console.log(`   Short: ${token.shortAmount} (${token.shortPositions} positions) = $${token.shortValue.toLocaleString()}`);
    console.log(`   Net:   ${token.netAmount > 0 ? '+' : ''}${token.netAmount} = ${token.netValue > 0 ? '+' : ''}$${token.netValue.toLocaleString()}`);
    console.log('');
  });
  console.log('─'.repeat(80));
  console.log('');

  // Find specific tokens
  const ethToken = result.find(t => t.symbol === 'ETH');
  const solToken = result.find(t => t.symbol === 'SOL');
  const btcToken = result.find(t => t.symbol === 'BTC');
  const avaxToken = result.find(t => t.symbol === 'AVAX');
  const maticToken = result.find(t => t.symbol === 'MATIC');

  // Test ETH calculations
  console.log('🧪 Test Suite: ETH Calculations');
  console.log('─'.repeat(80));
  allTestsPassed &= assertEqual(ethToken.longAmount, 10, 'ETH long amount = 10');
  allTestsPassed &= assertEqual(ethToken.shortAmount, 3, 'ETH short amount = 3');
  allTestsPassed &= assertEqual(ethToken.netAmount, 7, 'ETH net amount = 7 (10 - 3)');
  allTestsPassed &= assertEqual(ethToken.longValue, 30000, 'ETH long value = $30,000 (string parsed)');
  allTestsPassed &= assertEqual(ethToken.shortValue, 9000, 'ETH short value = $9,000 (number parsed)');
  allTestsPassed &= assertEqual(ethToken.netValue, 21000, 'ETH net value = $21,000 (30000 - 9000)');
  allTestsPassed &= assertEqual(ethToken.longPositions, 1, 'ETH long positions = 1');
  allTestsPassed &= assertEqual(ethToken.shortPositions, 1, 'ETH short positions = 1');
  console.log('');

  // Test SOL calculations
  console.log('🧪 Test Suite: SOL Calculations');
  console.log('─'.repeat(80));
  allTestsPassed &= assertEqual(solToken.longAmount, 0, 'SOL long amount = 0');
  allTestsPassed &= assertEqual(solToken.shortAmount, 200, 'SOL short amount = 200');
  allTestsPassed &= assertEqual(solToken.netAmount, -200, 'SOL net amount = -200');
  allTestsPassed &= assertEqual(solToken.shortValue, 28000, 'SOL short value = $28,000');
  allTestsPassed &= assertEqual(solToken.netValue, -28000, 'SOL net value = -$28,000');
  console.log('');

  // Test BTC calculations
  console.log('🧪 Test Suite: BTC Calculations');
  console.log('─'.repeat(80));
  allTestsPassed &= assertApproxEqual(btcToken.longAmount, 0.5, 0.01, 'BTC long amount = 0.5');
  allTestsPassed &= assertEqual(btcToken.shortAmount, 0, 'BTC short amount = 0');
  allTestsPassed &= assertApproxEqual(btcToken.netAmount, 0.5, 0.01, 'BTC net amount = 0.5');
  allTestsPassed &= assertEqual(btcToken.longValue, 30000, 'BTC long value = $30,000 (string parsed)');
  allTestsPassed &= assertEqual(btcToken.netValue, 30000, 'BTC net value = $30,000');
  console.log('');

  // Test edge cases (zero values)
  console.log('🧪 Test Suite: Edge Cases (Zero Values)');
  console.log('─'.repeat(80));
  allTestsPassed &= assertEqual(avaxToken.netValue, 0, 'AVAX net value = $0 (number zero)');
  allTestsPassed &= assertEqual(maticToken.netValue, 0, 'MATIC net value = $0 (string zero)');
  console.log('');

  // Test sorting (by absolute net value)
  console.log('🧪 Test Suite: Sorting');
  console.log('─'.repeat(80));
  allTestsPassed &= assertEqual(result[0].symbol, 'BTC', 'First token is BTC (highest abs net value: $30k)');
  allTestsPassed &= assertEqual(result[1].symbol, 'SOL', 'Second token is SOL (second highest: $28k)');
  allTestsPassed &= assertEqual(result[2].symbol, 'ETH', 'Third token is ETH (third highest: $21k)');
  console.log('');

  // Summary
  console.log('═'.repeat(80));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('✅ The Token Exposure Card fix is working correctly:');
    console.log('   - Handles string usdValue format ("$30,000")');
    console.log('   - Handles number usdValue format (9000)');
    console.log('   - Correctly calculates net exposure (long - short)');
    console.log('   - No TypeError exceptions thrown');
    console.log('   - Edge cases (zero values) handled properly');
    console.log('');
    console.log('🚀 Ready to deploy!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('Please review the failed assertions above.');
    process.exit(1);
  }

} catch (error) {
  console.error('');
  console.error('💥 CRITICAL ERROR:');
  console.error('─'.repeat(80));
  console.error(`   ${error.name}: ${error.message}`);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  console.error('❌ The Token Exposure Card fix has issues that need to be addressed.');
  process.exit(1);
}
