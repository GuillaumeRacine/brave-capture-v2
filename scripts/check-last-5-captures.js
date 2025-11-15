#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkLast5Captures() {
  console.log('🔍 Checking last 5 Orca captures...\n');

  // Get the last 5 captures
  const { data: captures } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Orca')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (!captures || captures.length === 0) {
    console.log('❌ No captures found');
    return;
  }

  console.log(`Found ${captures.length} recent captures:\n`);

  for (let i = 0; i < captures.length; i++) {
    const capture = captures[i];
    console.log(`${'='.repeat(80)}`);
    console.log(`📸 Capture ${i + 1} of ${captures.length}`);
    console.log(`   ID: ${capture.id}`);
    console.log(`   Timestamp: ${new Date(capture.timestamp).toLocaleString()}`);
    console.log(`   Has Screenshot: ${capture.screenshot ? 'YES' : 'NO'}`);

    // Get positions for this capture
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('capture_id', capture.id)
      .order('pair', { ascending: true });

    if (!positions || positions.length === 0) {
      console.log('   ⚠️  No positions found for this capture\n');
      continue;
    }

    console.log(`   Positions: ${positions.length}\n`);

    // Find which position has token data
    const withTokenData = positions.filter(p =>
      p.token0_amount !== null &&
      p.token1_amount !== null
    );

    if (withTokenData.length === 0) {
      console.log('   ❌ NO positions have token data in this capture\n');
    } else {
      console.log(`   ✅ ${withTokenData.length} position(s) with token data:\n`);
      withTokenData.forEach(pos => {
        console.log(`      • ${pos.pair}:`);
        console.log(`        ${pos.token0_amount} / ${pos.token1_amount}`);
        console.log(`        $${pos.token0_value} / $${pos.token1_value}`);
        console.log(`        ${pos.token0_percentage}% / ${pos.token1_percentage}%`);
      });
    }

    console.log('');
  }

  console.log(`${'='.repeat(80)}\n`);

  // Now check: do we have complete token data for all unique pairs?
  console.log('📊 Summary: Token Data Coverage Across All 5 Captures\n');

  const allPairs = new Set();
  const pairsWithTokenData = new Set();

  for (const capture of captures) {
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('capture_id', capture.id);

    positions?.forEach(pos => {
      allPairs.add(pos.pair);
      if (pos.token0_amount !== null && pos.token1_amount !== null) {
        pairsWithTokenData.add(pos.pair);
      }
    });
  }

  console.log(`   Total unique pairs found: ${allPairs.size}`);
  console.log(`   Pairs with token data: ${pairsWithTokenData.size}\n`);

  console.log('   Coverage by pair:');
  Array.from(allPairs).sort().forEach(pair => {
    const hasCoverage = pairsWithTokenData.has(pair);
    console.log(`      ${hasCoverage ? '✅' : '❌'} ${pair}`);
  });

  // Get the best (most recent) token data for each pair
  console.log('\n📋 Best Token Data for Each Pair (most recent with data):\n');

  for (const pair of Array.from(allPairs).sort()) {
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('pair', pair)
      .not('token0_amount', 'is', null)
      .order('captured_at', { ascending: false })
      .limit(1);

    if (positions && positions.length > 0) {
      const pos = positions[0];
      console.log(`   ✅ ${pos.pair}:`);
      console.log(`      Amounts: ${pos.token0_amount} / ${pos.token1_amount}`);
      console.log(`      Values: $${pos.token0_value} / $${pos.token1_value}`);
      console.log(`      Percentages: ${pos.token0_percentage}% / ${pos.token1_percentage}%`);
      console.log(`      Last captured: ${new Date(pos.captured_at).toLocaleString()}\n`);
    } else {
      console.log(`   ❌ ${pair}: NO token data found in any capture\n`);
    }
  }
}

checkLast5Captures();
