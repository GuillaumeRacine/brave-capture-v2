// Quick test to verify the exact user scenario
const TOKEN_NORMALIZATION = {
  'WBTC': 'BTC', 'wBTC': 'BTC', 'xBTC': 'BTC', 'cbBTC': 'BTC', 'CBBTC': 'BTC',
  'WETH': 'ETH', 'wETH': 'ETH', 'whETH': 'ETH', 'WHETH': 'ETH', 'stETH': 'ETH',
  'STETH': 'ETH', 'wstETH': 'ETH', 'WSTETH': 'ETH',
  'USDC.e': 'USDC', 'USDbC': 'USDC',
  'USDC0': 'USDC', 'SOL0': 'SOL', 'USDT0': 'USDT',
  'JLP': 'JLP', 'JPL': 'JLP', 'JLF': 'JLP'
};

function normalizeToken(token) {
  if (!token) return token;
  const normalized = TOKEN_NORMALIZATION[token] || token;
  return normalized.replace(/0$/, '');
}

function normalizePair(pair) {
  if (!pair) return '';
  const cleaned = pair.trim().replace(/\s+/g, '').replace(/\//g, '-').toLowerCase();
  const tokens = cleaned.split('-');
  if (tokens.length !== 2) return cleaned;

  const normalized0 = normalizeToken(tokens[0]);
  const normalized1 = normalizeToken(tokens[1]);
  return `${normalized0}/${normalized1}`.toLowerCase();
}

console.log('\n🧪 USER\'S ACTUAL FAILING CASES:\n');

const tests = [
  { ai: 'wETH/SOL', db: 'whETH/SOL0' },
  { ai: 'JPL/USDC', db: 'JLP/USDC0' },
  { ai: 'PUMP / SOL', db: 'PUMP/SOL0' },
  { ai: 'cbBTC/USDC', db: 'cbBTC/USDC0' },
  { ai: 'SOL/USDC', db: 'SOL/USDC0' }
];

tests.forEach((test, i) => {
  const aiNorm = normalizePair(test.ai);
  const dbNorm = normalizePair(test.db);
  const match = aiNorm === dbNorm;

  console.log(`Test ${i + 1}: AI="${test.ai}" vs DB="${test.db}"`);
  console.log(`  AI normalized: "${aiNorm}"`);
  console.log(`  DB normalized: "${dbNorm}"`);
  console.log(`  ${match ? '✅ MATCH' : '❌ NO MATCH'}\n`);
});
