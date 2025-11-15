#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * FIXED VERSION: Get latest positions prioritizing token data
 */
async function getLatestPositionsFixed() {
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false });

  if (!positions) return [];

  // Group by pair and keep the BEST position (prefer one with token data)
  const latestMap = new Map();
  positions.forEach(pos => {
    const key = `${pos.protocol}-${pos.pair}`;
    const existing = latestMap.get(key);

    const hasTokenData = pos.token0_amount !== null && pos.token1_amount !== null;
    const existingHasTokenData = existing?.token0_amount !== null && existing?.token1_amount !== null;

    // Decide if we should replace the existing position
    let shouldReplace = false;

    if (!existing) {
      shouldReplace = true;
    } else if (hasTokenData && !existingHasTokenData) {
      // This position has token data, existing doesn't - prefer this one
      shouldReplace = true;
    } else if (hasTokenData && existingHasTokenData) {
      // Both have token data - prefer most recent
      shouldReplace = new Date(pos.captured_at) > new Date(existing.captured_at);
    } else if (!hasTokenData && !existingHasTokenData) {
      // Neither has token data - prefer most recent
      shouldReplace = new Date(pos.captured_at) > new Date(existing.captured_at);
    }

    if (shouldReplace) {
      latestMap.set(key, pos);
    }
  });

  return Array.from(latestMap.values());
}

/**
 * OLD VERSION: Just get most recent regardless of token data
 */
async function getLatestPositionsOld() {
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false });

  if (!positions) return [];

  const latestMap = new Map();
  positions.forEach(pos => {
    const key = `${pos.protocol}-${pos.pair}`;
    const existing = latestMap.get(key);

    if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
      latestMap.set(key, pos);
    }
  });

  return Array.from(latestMap.values());
}

async function testQuery() {
  console.log('🧪 Testing Latest Positions Query Logic\n');
  console.log('='  .repeat(80) + '\n');

  // Test old version
  console.log('❌ OLD QUERY (most recent, ignoring token data):');
  console.log('-'.repeat(80));
  const oldResults = await getLatestPositionsOld();
  oldResults.sort((a, b) => a.pair.localeCompare(b.pair)).forEach(pos => {
    const hasData = pos.token0_amount !== null && pos.token1_amount !== null;
    const status = hasData ? '✅' : '❌';
    console.log(`   ${status} ${pos.pair.padEnd(15)} - Token Data: ${hasData ? 'YES' : 'NO'}`);
    if (hasData) {
      console.log(`      ${pos.token0_amount} / ${pos.token1_amount}`);
      console.log(`      ${pos.token0_percentage}% / ${pos.token1_percentage}%`);
    }
  });

  const oldWithData = oldResults.filter(p => p.token0_amount !== null).length;
  console.log(`\n   Summary: ${oldWithData}/${oldResults.length} positions with token data\n\n`);

  // Test new version
  console.log('✅ NEW QUERY (prioritizes positions with token data):');
  console.log('-'.repeat(80));
  const newResults = await getLatestPositionsFixed();
  newResults.sort((a, b) => a.pair.localeCompare(b.pair)).forEach(pos => {
    const hasData = pos.token0_amount !== null && pos.token1_amount !== null;
    const status = hasData ? '✅' : '❌';
    console.log(`   ${status} ${pos.pair.padEnd(15)} - Token Data: ${hasData ? 'YES' : 'NO'}`);
    if (hasData) {
      console.log(`      ${pos.token0_amount} / ${pos.token1_amount}`);
      console.log(`      ${pos.token0_percentage}% / ${pos.token1_percentage}%`);
    }
  });

  const newWithData = newResults.filter(p => p.token0_amount !== null).length;
  console.log(`\n   Summary: ${newWithData}/${newResults.length} positions with token data\n\n`);

  console.log('='  .repeat(80));
  console.log('📊 COMPARISON:\n');
  console.log(`   Old Query: ${oldWithData}/${oldResults.length} positions with complete token data`);
  console.log(`   New Query: ${newWithData}/${newResults.length} positions with complete token data`);

  if (newWithData > oldWithData) {
    console.log(`\n   ✅ SUCCESS! New query shows ${newWithData - oldWithData} more position(s) with token data!`);
  } else if (newWithData === newResults.length) {
    console.log(`\n   🎉 PERFECT! All ${newResults.length} positions have complete token data!`);
  } else {
    console.log(`\n   ⚠️  Some positions still missing token data (need more rotation captures)`);
  }
}

testQuery();
