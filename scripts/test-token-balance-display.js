#!/usr/bin/env node

/**
 * Test Token Balance Display
 *
 * This script verifies that:
 * 1. Database has 5 Orca positions
 * 2. All 5 have non-null token data
 * 3. getLatestPositions() logic works correctly
 * 4. Report any positions with missing data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected pairs
const EXPECTED_PAIRS = [
  'SOL/USDC',
  'PUMP/SOL',
  'JLP/USDC',
  'cbBTC/USDC',
  'whETH/SOL'
];

async function testTokenBalances() {
  console.log('🧪 Testing Token Balance Display\n');
  console.log('═'.repeat(80));

  let allTestsPassed = true;
  const results = {
    databaseTest: { passed: false, details: [] },
    tokenDataTest: { passed: false, details: [] },
    queryLogicTest: { passed: false, details: [] }
  };

  // ============================================================================
  // TEST 1: Database State - Check all 5 pairs exist
  // ============================================================================
  console.log('\n📊 TEST 1: Database State Check');
  console.log('─'.repeat(80));

  try {
    // Get best token data for each pair (from check-last-5-captures.js logic)
    const { data: allPositions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'Orca')
      .order('captured_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Group by pair and find best data
    const pairMap = new Map();

    for (const pos of allPositions) {
      const pair = pos.pair;

      // Skip if no pair
      if (!pair) continue;

      const hasTokenData = pos.token0_amount !== null &&
                          pos.token1_amount !== null &&
                          pos.token0_percentage !== null &&
                          pos.token1_percentage !== null;

      if (!pairMap.has(pair)) {
        pairMap.set(pair, {
          bestWithData: hasTokenData ? pos : null,
          mostRecent: pos,
          hasData: hasTokenData
        });
      } else {
        const existing = pairMap.get(pair);
        // Update best with data if this one has data and existing doesn't
        if (hasTokenData && !existing.bestWithData) {
          existing.bestWithData = pos;
          existing.hasData = true;
        }
      }
    }

    console.log(`Found ${pairMap.size} unique pairs in database\n`);

    // Check each expected pair
    for (const expectedPair of EXPECTED_PAIRS) {
      const pairData = pairMap.get(expectedPair);

      if (!pairData) {
        console.log(`   ❌ ${expectedPair.padEnd(15)} - NOT FOUND in database`);
        results.databaseTest.details.push(`Missing pair: ${expectedPair}`);
        allTestsPassed = false;
      } else if (pairData.hasData) {
        const pos = pairData.bestWithData;
        console.log(`   ✅ ${expectedPair.padEnd(15)} - Token data: YES`);
        console.log(`      ${pos.token0_amount} / ${pos.token1_amount}`);
        console.log(`      ${pos.token0_percentage}% / ${pos.token1_percentage}%`);
      } else {
        console.log(`   ⚠️  ${expectedPair.padEnd(15)} - Exists but NO token data`);
        results.databaseTest.details.push(`No token data: ${expectedPair}`);
        allTestsPassed = false;
      }
    }

    const foundAllPairs = EXPECTED_PAIRS.every(pair => pairMap.has(pair));
    const allHaveData = EXPECTED_PAIRS.every(pair =>
      pairMap.has(pair) && pairMap.get(pair).hasData
    );

    results.databaseTest.passed = foundAllPairs && allHaveData;

    if (results.databaseTest.passed) {
      console.log('\n   ✅ Database State: PASSED - All 5 pairs exist with token data');
    } else {
      console.log('\n   ❌ Database State: FAILED');
    }

  } catch (error) {
    console.error('   ❌ Database query error:', error.message);
    results.databaseTest.details.push(`Error: ${error.message}`);
    allTestsPassed = false;
  }

  // ============================================================================
  // TEST 2: Token Data Completeness
  // ============================================================================
  console.log('\n\n📋 TEST 2: Token Data Completeness');
  console.log('─'.repeat(80));

  try {
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'Orca')
      .in('pair', EXPECTED_PAIRS)
      .order('captured_at', { ascending: false });

    if (error) throw error;

    // Check each field for completeness
    const requiredFields = [
      'token0_amount',
      'token1_amount',
      'token0_value',
      'token1_value',
      'token0_percentage',
      'token1_percentage'
    ];

    const pairCompleteness = new Map();

    for (const pair of EXPECTED_PAIRS) {
      const pairPositions = positions.filter(p => p.pair === pair);
      const withCompleteData = pairPositions.filter(p =>
        requiredFields.every(field => p[field] !== null && p[field] !== undefined)
      );

      pairCompleteness.set(pair, {
        total: pairPositions.length,
        complete: withCompleteData.length,
        percentage: (withCompleteData.length / pairPositions.length * 100).toFixed(1)
      });
    }

    console.log('\nToken data completeness by pair:\n');
    let allComplete = true;

    for (const [pair, stats] of pairCompleteness) {
      const status = stats.complete > 0 ? '✅' : '❌';
      console.log(`   ${status} ${pair.padEnd(15)} - ${stats.complete}/${stats.total} captures (${stats.percentage}%)`);

      if (stats.complete === 0) {
        results.tokenDataTest.details.push(`${pair}: No captures with complete data`);
        allComplete = false;
      }
    }

    results.tokenDataTest.passed = allComplete;

    if (results.tokenDataTest.passed) {
      console.log('\n   ✅ Token Data Completeness: PASSED');
    } else {
      console.log('\n   ❌ Token Data Completeness: FAILED - Some pairs missing data');
      allTestsPassed = false;
    }

  } catch (error) {
    console.error('   ❌ Token data check error:', error.message);
    results.tokenDataTest.details.push(`Error: ${error.message}`);
    allTestsPassed = false;
  }

  // ============================================================================
  // TEST 3: getLatestPositions() Query Logic
  // ============================================================================
  console.log('\n\n🔍 TEST 3: getLatestPositions() Query Logic');
  console.log('─'.repeat(80));

  try {
    // Simulate OLD query (most recent, ignoring token data)
    const { data: oldQuery, error: oldError } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'Orca')
      .order('captured_at', { ascending: false })
      .limit(100);

    if (oldError) throw oldError;

    // Get latest per pair
    const oldResults = new Map();
    for (const pos of oldQuery) {
      if (!oldResults.has(pos.pair)) {
        oldResults.set(pos.pair, pos);
      }
    }

    // Simulate NEW query (prioritize token data)
    const { data: newQuery, error: newError } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'Orca')
      .not('token0_amount', 'is', null)
      .not('token1_amount', 'is', null)
      .order('captured_at', { ascending: false })
      .limit(100);

    if (newError) throw newError;

    // Get latest per pair
    const newResults = new Map();
    for (const pos of newQuery) {
      if (!newResults.has(pos.pair)) {
        newResults.set(pos.pair, pos);
      }
    }

    // Compare results
    console.log('\nComparison:\n');
    console.log('OLD Query (most recent, ignoring token data):');
    let oldWithData = 0;
    for (const [pair, pos] of oldResults) {
      const hasData = pos.token0_amount !== null && pos.token1_amount !== null;
      if (hasData) oldWithData++;
      const status = hasData ? '✅' : '❌';
      console.log(`   ${status} ${pair.padEnd(15)} - ${hasData ? 'HAS DATA' : 'NO DATA'}`);
    }

    console.log(`\n   Summary: ${oldWithData}/${oldResults.size} with token data\n`);

    console.log('NEW Query (prioritizes positions with token data):');
    let newWithData = 0;
    for (const [pair, pos] of newResults) {
      const hasData = pos.token0_amount !== null && pos.token1_amount !== null;
      if (hasData) newWithData++;
      const status = hasData ? '✅' : '❌';
      console.log(`   ${status} ${pair.padEnd(15)} - ${hasData ? 'HAS DATA' : 'NO DATA'}`);
    }

    console.log(`\n   Summary: ${newWithData}/${newResults.size} with token data`);

    // Check if new query is better
    const improvement = newWithData - oldWithData;

    if (newWithData === EXPECTED_PAIRS.length) {
      console.log(`\n   ✅ Query Logic: PASSED - New query returns all ${EXPECTED_PAIRS.length} pairs with data`);
      results.queryLogicTest.passed = true;
    } else if (improvement > 0) {
      console.log(`\n   ⚠️  Query Logic: IMPROVED but not perfect - Improvement: +${improvement} pairs`);
      results.queryLogicTest.details.push(`Only ${newWithData}/${EXPECTED_PAIRS.length} pairs with data`);
      allTestsPassed = false;
    } else {
      console.log(`\n   ❌ Query Logic: FAILED - No improvement from old query`);
      results.queryLogicTest.details.push('New query no better than old');
      allTestsPassed = false;
    }

  } catch (error) {
    console.error('   ❌ Query logic test error:', error.message);
    results.queryLogicTest.details.push(`Error: ${error.message}`);
    allTestsPassed = false;
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═'.repeat(80));

  console.log('\n✅ PASSED TESTS:');
  if (results.databaseTest.passed) {
    console.log('   • Database has all 5 Orca positions with token data');
  }
  if (results.tokenDataTest.passed) {
    console.log('   • All pairs have at least one capture with complete token data');
  }
  if (results.queryLogicTest.passed) {
    console.log('   • getLatestPositions() returns all 5 pairs with token data');
  }

  const passedCount = [
    results.databaseTest.passed,
    results.tokenDataTest.passed,
    results.queryLogicTest.passed
  ].filter(Boolean).length;

  if (passedCount === 0) {
    console.log('   (none)');
  }

  if (!allTestsPassed) {
    console.log('\n❌ FAILED TESTS:');

    if (!results.databaseTest.passed) {
      console.log('   • Database State Check');
      results.databaseTest.details.forEach(d => console.log(`     - ${d}`));
    }
    if (!results.tokenDataTest.passed) {
      console.log('   • Token Data Completeness');
      results.tokenDataTest.details.forEach(d => console.log(`     - ${d}`));
    }
    if (!results.queryLogicTest.passed) {
      console.log('   • Query Logic Test');
      results.queryLogicTest.details.forEach(d => console.log(`     - ${d}`));
    }
  }

  console.log('\n' + '═'.repeat(80));

  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED - Token balance display is ready!');
    console.log('═'.repeat(80) + '\n');
    return 0;
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review issues above');
    console.log('═'.repeat(80) + '\n');
    return 1;
  }
}

// Run tests
testTokenBalances()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('❌ Test script error:', err);
    process.exit(1);
  });
