// Test Token Normalization and Fuzzy Matching Logic
// This tests the matching algorithm that's used in background.js

// ============================================================================
// COPY OF MATCHING LOGIC FROM background.js (for testing)
// ============================================================================

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

  let normalized = token.trim().toUpperCase();
  normalized = normalized.replace(/0+$/, '');
  normalized = TOKEN_NORMALIZATION[normalized] || normalized;

  return normalized;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function normalizePair(pair) {
  if (!pair) return '';

  const tokens = pair.split('/').map(t => t.trim());

  if (tokens.length !== 2) {
    console.warn(`Invalid pair format: ${pair}`);
    return pair.toUpperCase();
  }

  const normalized0 = normalizeToken(tokens[0]);
  const normalized1 = normalizeToken(tokens[1]);

  return `${normalized0}/${normalized1}`;
}

function findMatchingPosition(extractedPair, availablePositions, verbose = false) {
  const normalizedExtracted = normalizePair(extractedPair);

  if (verbose) {
    console.log(`  Matching "${extractedPair}" → normalized to "${normalizedExtracted}"`);
  }

  // Try exact match after normalization
  for (const position of availablePositions) {
    const normalizedDb = normalizePair(position.pair);

    // Exact match after normalization
    if (normalizedExtracted === normalizedDb) {
      if (verbose) {
        console.log(`  ✅ EXACT MATCH: "${extractedPair}" → "${position.pair}"`);
      }
      return position;
    }

    // Try reversed (SOL/USDC vs USDC/SOL)
    const [token0, token1] = normalizedExtracted.split('/');
    const reversedPair = `${token1}/${token0}`;

    if (reversedPair === normalizedDb) {
      if (verbose) {
        console.log(`  ✅ REVERSED MATCH: "${extractedPair}" → "${position.pair}"`);
      }
      return position;
    }
  }

  // Try fuzzy match with Levenshtein distance (allows for minor OCR errors)
  if (verbose) {
    console.log(`  Trying fuzzy matching (Levenshtein distance <= 2)...`);
  }

  for (const position of availablePositions) {
    const normalizedDb = normalizePair(position.pair);
    const distance = levenshteinDistance(normalizedExtracted, normalizedDb);

    if (distance <= 2 && distance > 0) {
      if (verbose) {
        console.log(`  ✅ FUZZY MATCH (distance=${distance}): "${extractedPair}" → "${position.pair}"`);
      }
      return position;
    }
  }

  if (verbose) {
    console.error(`  ❌ NO MATCH for "${extractedPair}"`);
  }
  return null;
}

// ============================================================================
// TEST CASES - USER'S FAILING SCENARIOS
// ============================================================================

// Simulated database positions (from Orca)
const DATABASE_POSITIONS = [
  { pair: 'whETH/SOL0', id: 1 },
  { pair: 'JLP/USDC0', id: 2 },
  { pair: 'PUMP/SOL0', id: 3 },
  { pair: 'cbBTC/USDC0', id: 4 },
  { pair: 'SOL0/USDC0', id: 5 },
  { pair: 'MSOL0/SOL0', id: 6 },
  { pair: 'USDC0/USDT0', id: 7 },
  { pair: 'wBTC/ETH', id: 8 },
  { pair: 'stETH/USDC', id: 9 },
  { pair: 'USDC.e/USDT', id: 10 }
];

// AI extracted pairs (with various issues)
const TEST_CASES = [
  // User's failing cases
  { extracted: 'wETH/SOL', dbPair: 'whETH/SOL0', shouldMatch: true, description: 'ETH variant + "0" suffix' },
  { extracted: 'JPL/USDC', dbPair: 'JLP/USDC0', shouldMatch: true, description: 'OCR typo (JPL→JLP) + "0" suffix' },
  { extracted: 'PUMP / SOL', dbPair: 'PUMP/SOL0', shouldMatch: true, description: 'Spaces + "0" suffix' },
  { extracted: 'cbBTC/USDC', dbPair: 'cbBTC/USDC0', shouldMatch: true, description: '"0" suffix only' },
  { extracted: 'SOL/USDC', dbPair: 'SOL0/USDC0', shouldMatch: true, description: 'Double "0" suffix' },

  // Additional edge cases
  { extracted: 'MSOL/SOL', dbPair: 'MSOL0/SOL0', shouldMatch: true, description: 'Multiple "0" suffixes' },
  { extracted: 'USDC/USDT', dbPair: 'USDC0/USDT0', shouldMatch: true, description: 'Stablecoin pair with "0" suffixes' },
  { extracted: 'WBTC/ETH', dbPair: 'wBTC/ETH', shouldMatch: true, description: 'Case difference' },
  { extracted: 'WETH/USDC', dbPair: 'stETH/USDC', shouldMatch: true, description: 'Different ETH variants (fuzzy)' },
  { extracted: 'USDC.e/USDT', dbPair: 'USDC0/USDT0', shouldMatch: true, description: 'USDC.e variant normalized to USDC' },

  // Reversed pairs
  { extracted: 'USDC/SOL', dbPair: 'SOL0/USDC0', shouldMatch: true, description: 'Reversed pair with "0" suffixes' },
  { extracted: 'SOL/PUMP', dbPair: 'PUMP/SOL0', shouldMatch: true, description: 'Reversed pair' },

  // Should NOT match
  { extracted: 'BTC/ETH', dbPair: 'SOL0/USDC0', shouldMatch: false, description: 'Completely different pair' },
  { extracted: 'UNKNOWN/TOKEN', dbPair: 'SOL0/USDC0', shouldMatch: false, description: 'Unknown tokens' }
];

// ============================================================================
// RUN TESTS
// ============================================================================

function runTests() {
  console.log('🧪 Testing Token Normalization & Fuzzy Matching Logic\n');
  console.log('=' .repeat(80));
  console.log('DATABASE POSITIONS:');
  DATABASE_POSITIONS.forEach(pos => {
    console.log(`  - ${pos.pair} (normalized: ${normalizePair(pos.pair)})`);
  });
  console.log('=' .repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log('TEST RESULTS:\n');

  for (const testCase of TEST_CASES) {
    const match = findMatchingPosition(testCase.extracted, DATABASE_POSITIONS, false);
    const matched = match !== null && match.pair === testCase.dbPair;
    const expectedMatch = testCase.shouldMatch;

    if (matched === expectedMatch) {
      passed++;
      const icon = matched ? '✅' : '✅';
      const result = matched ? `MATCHED → "${match.pair}"` : 'NO MATCH (expected)';
      console.log(`${icon} "${testCase.extracted}" → ${result}`);
      console.log(`   (${testCase.description})`);
    } else {
      failed++;
      failures.push(testCase);
      console.log(`❌ "${testCase.extracted}" → FAILED`);
      console.log(`   Expected: ${expectedMatch ? 'match' : 'no match'} with "${testCase.dbPair}"`);
      console.log(`   Got: ${match ? `match with "${match.pair}"` : 'no match'}`);
      console.log(`   (${testCase.description})`);
    }
    console.log();
  }

  console.log('=' .repeat(80));
  console.log(`SUMMARY: ${passed}/${TEST_CASES.length} tests passed (${Math.round(passed/TEST_CASES.length*100)}% success rate)`);
  console.log('=' .repeat(80));

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    failures.forEach(f => {
      console.log(`  - "${f.extracted}" should ${f.shouldMatch ? 'match' : 'not match'} "${f.dbPair}"`);
      console.log(`    Reason: ${f.description}`);
    });
    console.log();
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED! Token matching is working correctly.');
    console.log('   Match rate: 100% for valid pairs');
    console.log();
  }
}

// ============================================================================
// VERBOSE TEST FOR USER'S ORIGINAL 4 FAILING CASES
// ============================================================================

function runVerboseUserCases() {
  console.log('\n' + '='.repeat(80));
  console.log('VERBOSE TEST: USER\'S ORIGINAL 4 FAILING CASES');
  console.log('='.repeat(80));
  console.log();

  const userCases = [
    { extracted: 'wETH/SOL', dbPair: 'whETH/SOL0' },
    { extracted: 'JPL/USDC', dbPair: 'JLP/USDC0' },
    { extracted: 'PUMP / SOL', dbPair: 'PUMP/SOL0' },
    { extracted: 'cbBTC/USDC', dbPair: 'cbBTC/USDC0' }
  ];

  userCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: "${testCase.extracted}" vs "${testCase.dbPair}"`);
    console.log('-'.repeat(80));
    const match = findMatchingPosition(testCase.extracted, DATABASE_POSITIONS, true);

    if (match && match.pair === testCase.dbPair) {
      console.log(`  ✅ SUCCESS: Correctly matched!`);
    } else {
      console.log(`  ❌ FAILED: Did not match correctly`);
    }
    console.log();
  });
}

// Run the tests
runTests();
runVerboseUserCases();
