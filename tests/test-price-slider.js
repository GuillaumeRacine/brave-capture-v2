/**
 * Test script for price slider calculation logic
 * Tests long/short detection and slider position calculation
 */

console.log('🧪 Testing Price Slider Calculation\n');
console.log('=' .repeat(60));

// Price slider calculation function from dashboard.js
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

// Test cases based on real Hyperliquid positions
const testCases = [
  {
    name: 'ETH Long (Profitable)',
    position: {
      symbol: 'ETH',
      side: 'Long',
      entryPrice: '3840.5',
      markPrice: '3962.3',
      liquidationPrice: '3650.2',
      pnl: '+$2,771.75'
    },
    expected: {
      isLong: true,
      health: 'safe',
      positionRange: [75, 90], // Mark is 64% beyond entry, position at 82%
      description: 'Price moved up from entry, far from liquidation'
    }
  },
  {
    name: 'SOL Short (Profitable)',
    position: {
      symbol: 'SOL',
      side: 'Short',
      entryPrice: '245.80',
      markPrice: '238.45',
      liquidationPrice: '270.38',
      pnl: '+$332.34'
    },
    expected: {
      isLong: false,
      health: 'safe',
      positionRange: [25, 50], // Should be below entry (50%)
      description: 'Price moved down from entry, far from liquidation'
    }
  },
  {
    name: 'BTC Long (Losing)',
    position: {
      symbol: 'BTC',
      side: 'Long',
      entryPrice: '95420.0',
      markPrice: '94230.5',
      liquidationPrice: '89148.0',
      pnl: '-$59.48'
    },
    expected: {
      isLong: true,
      health: 'warning',
      positionRange: [40, 50], // Below entry but not critical
      description: 'Price moved down from entry, moderate distance from liquidation'
    }
  },
  {
    name: 'STRK Long (Very Profitable)',
    position: {
      symbol: 'STRK',
      side: 'Long',
      entryPrice: '0.42',
      markPrice: '0.48',
      liquidationPrice: '0.40',
      pnl: '+$75.00'
    },
    expected: {
      isLong: true,
      health: 'safe',
      positionRange: [95, 100], // Mark moved 300% beyond entry distance - will cap at 100%
      description: 'Price moved significantly up from entry (capped at 100%)'
    }
  },
  {
    name: 'ETH Short Near Liquidation',
    position: {
      symbol: 'ETH',
      side: 'Short',
      entryPrice: '3500',
      markPrice: '3650',
      liquidationPrice: '3700',
      pnl: '-$750'
    },
    expected: {
      isLong: false,
      health: 'critical',
      positionRange: [85, 95], // Very close to liquidation (75% of way to liq)
      description: 'Price moved up significantly, approaching liquidation'
    }
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log('-'.repeat(60));
  console.log(`  Side: ${test.position.side}`);
  console.log(`  Entry: $${test.position.entryPrice}`);
  console.log(`  Current: $${test.position.markPrice}`);
  console.log(`  Liquidation: $${test.position.liquidationPrice}`);
  console.log(`  P&L: ${test.position.pnl}`);

  const result = calculateSliderPosition(test.position);

  console.log(`\n  Results:`);
  console.log(`    Position: ${result.position.toFixed(1)}%`);
  console.log(`    Fill Width: ${result.fillWidth.toFixed(1)}%`);
  console.log(`    Health: ${result.health}`);

  // Verify long/short detection
  const entry = parseFloat(test.position.entryPrice);
  const liq = parseFloat(test.position.liquidationPrice);
  const isLong = liq < entry;
  const longShortCorrect = isLong === test.expected.isLong;

  console.log(`\n  Verification:`);
  console.log(`    Long/Short: ${isLong ? 'Long' : 'Short'} ${longShortCorrect ? '✅' : '❌'}`);

  // Verify position is in expected range
  const positionInRange = result.position >= test.expected.positionRange[0] &&
                          result.position <= test.expected.positionRange[1];
  console.log(`    Position Range: ${positionInRange ? '✅' : '❌'} (expected ${test.expected.positionRange[0]}-${test.expected.positionRange[1]}%)`);

  // Verify health status
  const healthCorrect = result.health === test.expected.health;
  console.log(`    Health Status: ${healthCorrect ? '✅' : '❌'} (expected ${test.expected.health})`);

  // Verify slider is bounded 0-100
  const bounded = result.position >= 0 && result.position <= 100 &&
                  result.fillWidth >= 0 && result.fillWidth <= 100;
  console.log(`    Bounded 0-100%: ${bounded ? '✅' : '❌'}`);

  const allCorrect = longShortCorrect && positionInRange && healthCorrect && bounded;

  if (allCorrect) {
    console.log(`\n  ✅ PASSED - ${test.expected.description}`);
    passed++;
  } else {
    console.log(`\n  ❌ FAILED`);
    failed++;
  }
});

// Edge case tests
console.log('\n' + '='.repeat(60));
console.log('Edge Case Tests');
console.log('='.repeat(60));

const edgeCases = [
  {
    name: 'Missing data (zeros)',
    position: { entryPrice: '0', markPrice: '0', liquidationPrice: '0' },
    expectedDefault: true
  },
  {
    name: 'Missing liquidation price',
    position: { entryPrice: '100', markPrice: '110', liquidationPrice: '0' },
    expectedDefault: true
  },
  {
    name: 'Price exactly at entry',
    position: { entryPrice: '100', markPrice: '100', liquidationPrice: '90' },
    expectedDefault: false
  }
];

edgeCases.forEach((test, index) => {
  console.log(`\n  Edge ${index + 1}: ${test.name}`);
  const result = calculateSliderPosition(test.position);

  if (test.expectedDefault) {
    const isDefault = result.position === 50 && result.health === 'safe';
    console.log(`    Returns default: ${isDefault ? '✅ PASSED' : '❌ FAILED'}`);
    isDefault ? passed++ : failed++;
  } else {
    const isValid = result.position >= 0 && result.position <= 100;
    console.log(`    Valid result: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`    Position: ${result.position.toFixed(1)}%, Health: ${result.health}`);
    isValid ? passed++ : failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Price slider logic works correctly.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed`);
  process.exit(1);
}
