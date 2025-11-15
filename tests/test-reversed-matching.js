// Test that reversed pair matching works
console.log('Testing reversed pair matching logic...\n');

const allPositions = [
  { pair: 'SOL/USDC0' },
  { pair: 'PUMP/SOL0' },
  { pair: 'JLP/USDC0' },
  { pair: 'whETH/SOL0' },
  { pair: 'cbBTC/USDC0' }
];

const extractedPair = 'SOL/PUMP';

console.log(`Extracted: ${extractedPair}`);
console.log(`Available: ${allPositions.map(p => p.pair).join(', ')}\n`);

// Test the matching logic
const matchedPosition = allPositions.find(pos => {
  const posTokens = pos.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
  const extractedTokens = extractedPair.split('/').map(t => t.trim().replace(/0+$/, ''));

  console.log(`Checking ${pos.pair}:`);
  console.log(`  posTokens: [${posTokens.join(', ')}]`);
  console.log(`  extractedTokens: [${extractedTokens.join(', ')}]`);

  // Try exact match
  if (posTokens[0] === extractedTokens[0] && posTokens[1] === extractedTokens[1]) {
    console.log(`  ✅ Exact match!`);
    return true;
  }

  // Try reversed match
  if (posTokens[0] === extractedTokens[1] && posTokens[1] === extractedTokens[0]) {
    console.log(`  ✅ Reversed match! ${extractedPair} → ${pos.pair}`);
    return true;
  }

  console.log(`  ❌ No match\n`);
  return false;
});

if (matchedPosition) {
  console.log(`\n🎉 SUCCESS: Matched ${extractedPair} to ${matchedPosition.pair}`);
} else {
  console.log(`\n❌ FAILED: No match found`);
}
