/**
 * Test script for Aave deduplication logic
 * Verifies that same asset can appear as both supply and borrow
 */

console.log('🧪 Testing Aave Deduplication Logic\n');
console.log('=' .repeat(60));

// Mock Aave positions data
const mockAavePositions = [
  { asset: 'ETH', amount: '1.5', usdValue: '5940', apy: '2.5', type: 'supply' },
  { asset: 'WBTC', amount: '0.05', usdValue: '4711.50', apy: '1.8', type: 'supply' },
  { asset: 'USDC', amount: '2500', usdValue: '2500', apy: '5.2', type: 'borrow' },
  { asset: 'USDT', amount: '1200', usdValue: '1200', apy: '4.8', type: 'borrow' },
  { asset: 'ETH', amount: '0.2', usdValue: '792', apy: '3.1', type: 'borrow' }, // Duplicate asset, different type
  { asset: 'USDC', amount: '5000', usdValue: '5000', apy: '3.5', type: 'supply' }, // Duplicate asset, different type
];

console.log('Input positions:');
mockAavePositions.forEach(pos => {
  console.log(`  ${pos.asset} (${pos.type}): ${pos.amount} = $${pos.usdValue}`);
});

// OLD deduplication logic (BROKEN)
console.log('\n' + '-'.repeat(60));
console.log('OLD Logic: Using only asset as key');
console.log('-'.repeat(60));

const seenAssets_old = new Set();
const uniquePositions_old = mockAavePositions.filter(pos => {
  if (seenAssets_old.has(pos.asset)) return false;
  seenAssets_old.add(pos.asset);
  return true;
});

console.log(`\nResult: ${uniquePositions_old.length} positions (WRONG - should be 6)`);
uniquePositions_old.forEach(pos => {
  console.log(`  ${pos.asset} (${pos.type}): ${pos.amount} = $${pos.usdValue}`);
});

const oldTestPassed = uniquePositions_old.length === 4; // Old logic filters to 4
console.log(`\n${oldTestPassed ? '✅' : '❌'} Old logic filters to 4 positions (loses duplicates)`);

// NEW deduplication logic (FIXED)
console.log('\n' + '-'.repeat(60));
console.log('NEW Logic: Using asset-type as key');
console.log('-'.repeat(60));

const seenAssets_new = new Set();
const uniquePositions_new = mockAavePositions.filter(pos => {
  const key = `${pos.asset}-${pos.type}`; // ✅ Include type in key
  if (seenAssets_new.has(key)) return false;
  seenAssets_new.add(key);
  return true;
});

console.log(`\nResult: ${uniquePositions_new.length} positions (CORRECT - keeps all 6)`);
uniquePositions_new.forEach(pos => {
  console.log(`  ${pos.asset} (${pos.type}): ${pos.amount} = $${pos.usdValue}`);
});

// Verify results
console.log('\n' + '='.repeat(60));
console.log('Verification Tests');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

// Test 1: Count should be 6
const countTest = uniquePositions_new.length === 6;
console.log(`\nTest 1: Position count`);
console.log(`  Expected: 6`);
console.log(`  Got: ${uniquePositions_new.length}`);
console.log(`  ${countTest ? '✅ PASSED' : '❌ FAILED'}`);
countTest ? passed++ : failed++;

// Test 2: ETH should appear twice (supply + borrow)
const ethPositions = uniquePositions_new.filter(p => p.asset === 'ETH');
const ethTest = ethPositions.length === 2 &&
                ethPositions.some(p => p.type === 'supply') &&
                ethPositions.some(p => p.type === 'borrow');
console.log(`\nTest 2: ETH appears as both supply and borrow`);
console.log(`  Expected: 2 positions (1 supply, 1 borrow)`);
console.log(`  Got: ${ethPositions.length} positions`);
ethPositions.forEach(p => console.log(`    - ${p.type}: ${p.amount} ETH`));
console.log(`  ${ethTest ? '✅ PASSED' : '❌ FAILED'}`);
ethTest ? passed++ : failed++;

// Test 3: USDC should appear twice (supply + borrow)
const usdcPositions = uniquePositions_new.filter(p => p.asset === 'USDC');
const usdcTest = usdcPositions.length === 2 &&
                 usdcPositions.some(p => p.type === 'supply') &&
                 usdcPositions.some(p => p.type === 'borrow');
console.log(`\nTest 3: USDC appears as both supply and borrow`);
console.log(`  Expected: 2 positions (1 supply, 1 borrow)`);
console.log(`  Got: ${usdcPositions.length} positions`);
usdcPositions.forEach(p => console.log(`    - ${p.type}: ${p.amount} USDC`));
console.log(`  ${usdcTest ? '✅ PASSED' : '❌ FAILED'}`);
usdcTest ? passed++ : failed++;

// Test 4: Supplies should be 3
const supplies = uniquePositions_new.filter(p => p.type === 'supply');
const suppliesTest = supplies.length === 3;
console.log(`\nTest 4: Supply positions count`);
console.log(`  Expected: 3`);
console.log(`  Got: ${supplies.length}`);
supplies.forEach(p => console.log(`    - ${p.asset}: ${p.amount}`));
console.log(`  ${suppliesTest ? '✅ PASSED' : '❌ FAILED'}`);
suppliesTest ? passed++ : failed++;

// Test 5: Borrows should be 3
const borrows = uniquePositions_new.filter(p => p.type === 'borrow');
const borrowsTest = borrows.length === 3;
console.log(`\nTest 5: Borrow positions count`);
console.log(`  Expected: 3`);
console.log(`  Got: ${borrows.length}`);
borrows.forEach(p => console.log(`    - ${p.asset}: ${p.amount}`));
console.log(`  ${borrowsTest ? '✅ PASSED' : '❌ FAILED'}`);
borrowsTest ? passed++ : failed++;

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Aave deduplication works correctly.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed`);
  process.exit(1);
}
