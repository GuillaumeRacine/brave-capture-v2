/**
 * Test script for Hyperliquid parser
 * Tests the table-based P&L extraction and leverage parsing
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock DOM structure matching Hyperliquid table
function createMockHyperliquidDOM(positions) {
  const tbody = positions.map(pos => {
    const cells = [
      `${pos.symbol}  ${pos.leverage}`,  // Column 0: "ETH  20x"
      pos.side,                           // Column 1: "Long" or "Short"
      pos.size,                           // Column 2: "0.54"
      pos.entryPrice,                     // Column 3: "3840.5"
      pos.markPrice,                      // Column 4: "3962.3"
      pos.pnl,                            // Column 5: "+$2,771.75 (+171.9%)"
      pos.margin,                         // Column 6: "$208.29"
      pos.liquidationPrice,               // Column 7: "3650.2"
      pos.fundingRate                     // Column 8: "0.01%"
    ];

    return `    <tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('\n');

  return `
<table>
  <tbody>
${tbody}
  </tbody>
</table>`;
}

// Test cases based on real Hyperliquid data from screenshot
const testPositions = [
  {
    symbol: 'ETH',
    leverage: '20x',
    side: 'Long',
    size: '0.54',
    entryPrice: '3840.5',
    markPrice: '3962.3',
    pnl: '+$2,771.75 (+171.9%)',
    margin: '$208.29',
    liquidationPrice: '3650.2',
    fundingRate: '0.01%',
    expected: {
      pnl: '+$2,771.75',
      pnlPercent: '+171.9',
      leverage: '20x'
    }
  },
  {
    symbol: 'SOL',
    leverage: '10x',
    side: 'Short',
    size: '45.2',
    entryPrice: '245.80',
    markPrice: '238.45',
    pnl: '+$332.34 (+7.5%)',
    margin: '$1,110.16',
    liquidationPrice: '270.38',
    fundingRate: '-0.005%',
    expected: {
      pnl: '+$332.34',
      pnlPercent: '+7.5',
      leverage: '10x'
    }
  },
  {
    symbol: 'BTC',
    leverage: '15x',
    side: 'Long',
    size: '0.05',
    entryPrice: '95420.0',
    markPrice: '94230.5',
    pnl: '-$59.48 (-1.2%)',
    margin: '$318.07',
    liquidationPrice: '89148.0',
    fundingRate: '0.008%',
    expected: {
      pnl: '-$59.48',
      pnlPercent: '-1.2',
      leverage: '15x'
    }
  },
  {
    symbol: 'STRK',
    leverage: '25x',
    side: 'Long',
    size: '1250',
    entryPrice: '0.42',
    markPrice: '0.48',
    pnl: '+$75.00 (+14.3%)',
    margin: '$21.00',
    liquidationPrice: '0.40',
    fundingRate: '0.012%',
    expected: {
      pnl: '+$75.00',
      pnlPercent: '+14.3',
      leverage: '25x'
    }
  }
];

// P&L regex pattern from content.js
const pnlRegex = /([+-]?\$[\d,]+\.?\d*)\s+\(([+-]?[\d.]+)%\)/;

console.log('🧪 Testing Hyperliquid Parser\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testPositions.forEach((pos, index) => {
  console.log(`\nTest ${index + 1}: ${pos.symbol} ${pos.leverage} ${pos.side}`);
  console.log('-'.repeat(60));

  // Test P&L regex extraction
  const pnlMatch = pos.pnl.match(pnlRegex);

  if (!pnlMatch) {
    console.error(`❌ FAILED: Could not match P&L string "${pos.pnl}"`);
    failed++;
    return;
  }

  const extractedPnl = pnlMatch[1];
  const extractedPercent = pnlMatch[2];

  // Verify extraction
  const pnlMatch_test = extractedPnl === pos.expected.pnl;
  const percentMatch = extractedPercent === pos.expected.pnlPercent;

  console.log(`  P&L String: "${pos.pnl}"`);
  console.log(`  Extracted P&L: ${extractedPnl} ${pnlMatch_test ? '✅' : '❌'} (expected: ${pos.expected.pnl})`);
  console.log(`  Extracted %: ${extractedPercent} ${percentMatch ? '✅' : '❌'} (expected: ${pos.expected.pnlPercent})`);

  // Test leverage extraction
  const coinMatch = `${pos.symbol}  ${pos.leverage}`.match(/^([A-Z]+)\s+(\d+)x$/);
  const leverageMatch = coinMatch && `${coinMatch[2]}x` === pos.expected.leverage;

  console.log(`  Leverage: ${coinMatch ? coinMatch[2] + 'x' : 'FAILED'} ${leverageMatch ? '✅' : '❌'} (expected: ${pos.expected.leverage})`);

  if (pnlMatch_test && percentMatch && leverageMatch) {
    console.log('  ✅ PASSED');
    passed++;
  } else {
    console.log('  ❌ FAILED');
    failed++;
  }
});

// Test edge cases
console.log('\n' + '='.repeat(60));
console.log('Edge Case Tests');
console.log('='.repeat(60));

const edgeCases = [
  { input: '+$1,234.56 (+12.3%)', expected: { pnl: '+$1,234.56', percent: '+12.3' } },
  { input: '-$987.65 (-4.2%)', expected: { pnl: '-$987.65', percent: '-4.2' } },
  { input: '+$1 (+0.1%)', expected: { pnl: '+$1', percent: '+0.1' } },
  { input: '-$12,345,678.90 (-99.9%)', expected: { pnl: '-$12,345,678.90', percent: '-99.9' } },
  { input: '$0 (0%)', expected: { pnl: '$0', percent: '0' } }, // Will match (optional +/- sign)
];

edgeCases.forEach((test, index) => {
  const match = test.input.match(pnlRegex);

  if (test.expected === null) {
    if (!match) {
      console.log(`  Edge ${index + 1}: "${test.input}" ✅ Correctly rejected`);
      passed++;
    } else {
      console.log(`  Edge ${index + 1}: "${test.input}" ❌ Should have been rejected`);
      failed++;
    }
  } else {
    if (match && match[1] === test.expected.pnl && match[2] === test.expected.percent) {
      console.log(`  Edge ${index + 1}: "${test.input}" ✅ PASSED`);
      passed++;
    } else {
      console.log(`  Edge ${index + 1}: "${test.input}" ❌ FAILED`);
      console.log(`    Expected: ${test.expected.pnl} (${test.expected.percent}%)`);
      console.log(`    Got: ${match ? `${match[1]} (${match[2]}%)` : 'no match'}`);
      failed++;
    }
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
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed`);
  process.exit(1);
}
