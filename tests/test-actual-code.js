// Test with ACTUAL code from background.js

const TOKEN_NORMALIZATION = {
  'WBTC': 'BTC', 'wBTC': 'BTC', 'xBTC': 'BTC', 'cbBTC': 'BTC', 'CBBTC': 'BTC',
  'WETH': 'ETH', 'wETH': 'ETH', 'whETH': 'ETH', 'WHETH': 'ETH', 'stETH': 'ETH',
  'STETH': 'ETH', 'wstETH': 'ETH', 'WSTETH': 'ETH',
  'USDC.e': 'USDC', 'USDbC': 'USDC',
  'USDC0': 'USDC', 'SOL0': 'SOL', 'USDT0': 'USDT',
  'JLP': 'JLP', 'JPL': 'JLP', 'JLF': 'JLP'
};

// ACTUAL code from background.js lines 618-631
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

// ACTUAL code from background.js lines 662-678
function normalizePair(pair) {
  if (!pair) return '';

  // Remove extra spaces and split by slash
  const cleaned = pair.trim().replace(/\s+/g, '');
  const parts = cleaned.split('/');

  if (parts.length !== 2) return cleaned;

  // Normalize each token
  const token0 = normalizeToken(parts[0]);
  const token1 = normalizeToken(parts[1]);

  // Return normalized pair
  return `${token0}/${token1}`;
}

console.log('\n🧪 TESTING WITH ACTUAL BACKGROUND.JS CODE:\n');

const tests = [
  { ai: 'wETH/SOL', db: 'whETH/SOL0', desc: 'ETH variant + 0 suffix' },
  { ai: 'JPL/USDC', db: 'JLP/USDC0', desc: 'OCR typo (JPL→JLP) + 0 suffix' },
  { ai: 'PUMP / SOL', db: 'PUMP/SOL0', desc: 'Spaces + 0 suffix' },
  { ai: 'cbBTC/USDC', db: 'cbBTC/USDC0', desc: 'BTC variant + 0 suffix' },
  { ai: 'SOL/USDC', db: 'SOL/USDC0', desc: 'Double 0 suffix' }
];

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
  const aiNorm = normalizePair(test.ai);
  const dbNorm = normalizePair(test.db);
  const match = aiNorm === dbNorm;

  console.log(`Test ${i + 1}: "${test.ai}" vs "${test.db}"`);
  console.log(`  AI normalized: "${aiNorm}"`);
  console.log(`  DB normalized: "${dbNorm}"`);
  console.log(`  Result: ${match ? '✅ MATCH' : '❌ NO MATCH'} (${test.desc})\n`);

  if (match) passed++;
  else failed++;
});

console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed}/${tests.length} passed`);
if (failed > 0) {
  console.log(`⚠️  ${failed} tests FAILED - normalization needs fixing`);
} else {
  console.log(`✅ ALL TESTS PASSED!`);
}
