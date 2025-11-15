#!/usr/bin/env node

/**
 * Database Token Data Verification Script
 *
 * Queries the Supabase database to analyze token balance data completeness
 * across all positions and protocols.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTokenData() {
  console.log('🔍 DATABASE TOKEN DATA VERIFICATION');
  console.log('=====================================\n');

  try {
    // 1. Get all positions
    const { data: allPositions, error: allError } = await supabase
      .from('positions')
      .select('*')
      .order('captured_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching positions:', allError);
      return;
    }

    console.log(`📊 Total positions in database: ${allPositions.length}\n`);

    // 2. Analyze token data completeness
    const stats = {
      total: allPositions.length,
      withToken0Amount: 0,
      withToken1Amount: 0,
      withBothAmounts: 0,
      withToken0Value: 0,
      withToken1Value: 0,
      withBothValues: 0,
      withToken0Percentage: 0,
      withToken1Percentage: 0,
      withBothPercentages: 0,
      fullyComplete: 0,
      byProtocol: {}
    };

    const missingData = [];
    const sampleComplete = [];
    const sampleIncomplete = [];

    allPositions.forEach(pos => {
      // Track protocol stats
      if (!stats.byProtocol[pos.protocol]) {
        stats.byProtocol[pos.protocol] = {
          total: 0,
          withBothAmounts: 0,
          withBothValues: 0,
          fullyComplete: 0
        };
      }
      stats.byProtocol[pos.protocol].total++;

      // Check amounts
      const hasToken0Amount = pos.token0_amount !== null && pos.token0_amount !== undefined;
      const hasToken1Amount = pos.token1_amount !== null && pos.token1_amount !== undefined;
      const hasToken0Value = pos.token0_value !== null && pos.token0_value !== undefined;
      const hasToken1Value = pos.token1_value !== null && pos.token1_value !== undefined;
      const hasToken0Pct = pos.token0_percentage !== null && pos.token0_percentage !== undefined;
      const hasToken1Pct = pos.token1_percentage !== null && pos.token1_percentage !== undefined;

      if (hasToken0Amount) stats.withToken0Amount++;
      if (hasToken1Amount) stats.withToken1Amount++;
      if (hasToken0Amount && hasToken1Amount) {
        stats.withBothAmounts++;
        stats.byProtocol[pos.protocol].withBothAmounts++;
      }

      if (hasToken0Value) stats.withToken0Value++;
      if (hasToken1Value) stats.withToken1Value++;
      if (hasToken0Value && hasToken1Value) {
        stats.withBothValues++;
        stats.byProtocol[pos.protocol].withBothValues++;
      }

      if (hasToken0Pct) stats.withToken0Percentage++;
      if (hasToken1Pct) stats.withToken1Percentage++;
      if (hasToken0Pct && hasToken1Pct) stats.withBothPercentages++;

      const isFullyComplete = hasToken0Amount && hasToken1Amount &&
                              hasToken0Value && hasToken1Value &&
                              hasToken0Pct && hasToken1Pct;

      if (isFullyComplete) {
        stats.fullyComplete++;
        stats.byProtocol[pos.protocol].fullyComplete++;
        if (sampleComplete.length < 3) {
          sampleComplete.push(pos);
        }
      } else {
        missingData.push({
          protocol: pos.protocol,
          pair: pos.pair,
          balance: pos.balance,
          captured_at: pos.captured_at,
          missing: {
            token0Amount: !hasToken0Amount,
            token1Amount: !hasToken1Amount,
            token0Value: !hasToken0Value,
            token1Value: !hasToken1Value,
            token0Percentage: !hasToken0Pct,
            token1Percentage: !hasToken1Pct
          }
        });
        if (sampleIncomplete.length < 3) {
          sampleIncomplete.push(pos);
        }
      }
    });

    // 3. Print overall statistics
    console.log('📈 OVERALL STATISTICS');
    console.log('=====================\n');
    console.log(`Total Positions: ${stats.total}`);
    console.log(`\nToken Amounts:`);
    console.log(`  - With token0_amount: ${stats.withToken0Amount} (${(stats.withToken0Amount/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With token1_amount: ${stats.withToken1Amount} (${(stats.withToken1Amount/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With BOTH amounts:  ${stats.withBothAmounts} (${(stats.withBothAmounts/stats.total*100).toFixed(1)}%)`);

    console.log(`\nToken USD Values:`);
    console.log(`  - With token0_value: ${stats.withToken0Value} (${(stats.withToken0Value/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With token1_value: ${stats.withToken1Value} (${(stats.withToken1Value/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With BOTH values:  ${stats.withBothValues} (${(stats.withBothValues/stats.total*100).toFixed(1)}%)`);

    console.log(`\nToken Percentages:`);
    console.log(`  - With token0_percentage: ${stats.withToken0Percentage} (${(stats.withToken0Percentage/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With token1_percentage: ${stats.withToken1Percentage} (${(stats.withToken1Percentage/stats.total*100).toFixed(1)}%)`);
    console.log(`  - With BOTH percentages:  ${stats.withBothPercentages} (${(stats.withBothPercentages/stats.total*100).toFixed(1)}%)`);

    console.log(`\n🎯 FULLY COMPLETE: ${stats.fullyComplete} / ${stats.total} (${(stats.fullyComplete/stats.total*100).toFixed(1)}%)`);
    console.log(`⚠️  MISSING DATA: ${missingData.length} / ${stats.total} (${(missingData.length/stats.total*100).toFixed(1)}%)\n`);

    // 4. Print protocol breakdown
    console.log('📊 PROTOCOL BREAKDOWN');
    console.log('=====================\n');
    Object.keys(stats.byProtocol).sort().forEach(protocol => {
      const pStats = stats.byProtocol[protocol];
      console.log(`${protocol}:`);
      console.log(`  Total: ${pStats.total}`);
      console.log(`  With both amounts: ${pStats.withBothAmounts} (${(pStats.withBothAmounts/pStats.total*100).toFixed(1)}%)`);
      console.log(`  With both values:  ${pStats.withBothValues} (${(pStats.withBothValues/pStats.total*100).toFixed(1)}%)`);
      console.log(`  Fully complete:    ${pStats.fullyComplete} (${(pStats.fullyComplete/pStats.total*100).toFixed(1)}%)`);
      console.log('');
    });

    // 5. Show sample data
    console.log('📝 SAMPLE DATA (Complete)');
    console.log('==========================\n');
    sampleComplete.slice(0, 2).forEach((pos, i) => {
      console.log(`Example ${i+1}: ${pos.protocol} - ${pos.pair}`);
      console.log(`  Balance: $${pos.balance}`);
      console.log(`  Token0: ${pos.token0_amount} ${pos.token0} ($${pos.token0_value}, ${pos.token0_percentage}%)`);
      console.log(`  Token1: ${pos.token1_amount} ${pos.token1} ($${pos.token1_value}, ${pos.token1_percentage}%)`);
      console.log(`  Captured: ${new Date(pos.captured_at).toLocaleString()}`);
      console.log('');
    });

    console.log('📝 SAMPLE DATA (Incomplete)');
    console.log('============================\n');
    sampleIncomplete.slice(0, 3).forEach((pos, i) => {
      console.log(`Example ${i+1}: ${pos.protocol} - ${pos.pair}`);
      console.log(`  Balance: $${pos.balance}`);
      console.log(`  Token0: ${pos.token0_amount ?? 'NULL'} ${pos.token0} ($${pos.token0_value ?? 'NULL'}, ${pos.token0_percentage ?? 'NULL'}%)`);
      console.log(`  Token1: ${pos.token1_amount ?? 'NULL'} ${pos.token1} ($${pos.token1_value ?? 'NULL'}, ${pos.token1_percentage ?? 'NULL'}%)`);
      console.log(`  Captured: ${new Date(pos.captured_at).toLocaleString()}`);
      console.log('');
    });

    // 6. Identify patterns in missing data
    console.log('🔍 MISSING DATA PATTERNS');
    console.log('========================\n');

    const patternsByProtocol = {};
    missingData.forEach(item => {
      if (!patternsByProtocol[item.protocol]) {
        patternsByProtocol[item.protocol] = {
          count: 0,
          pairs: new Set(),
          missingAmounts: 0,
          missingValues: 0,
          missingPercentages: 0
        };
      }
      const p = patternsByProtocol[item.protocol];
      p.count++;
      p.pairs.add(item.pair);
      if (item.missing.token0Amount || item.missing.token1Amount) p.missingAmounts++;
      if (item.missing.token0Value || item.missing.token1Value) p.missingValues++;
      if (item.missing.token0Percentage || item.missing.token1Percentage) p.missingPercentages++;
    });

    Object.keys(patternsByProtocol).sort().forEach(protocol => {
      const p = patternsByProtocol[protocol];
      console.log(`${protocol}:`);
      console.log(`  Positions with missing data: ${p.count}`);
      console.log(`  Unique pairs affected: ${p.pairs.size}`);
      console.log(`  Missing amounts: ${p.missingAmounts}`);
      console.log(`  Missing values: ${p.missingValues}`);
      console.log(`  Missing percentages: ${p.missingPercentages}`);
      console.log('');
    });

    // 7. Get latest positions to check recency
    console.log('📅 LATEST POSITIONS CHECK');
    console.log('=========================\n');

    const { data: latestPositions, error: latestError } = await supabase
      .from('positions')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(10);

    if (latestError) {
      console.error('❌ Error fetching latest positions:', latestError);
    } else {
      console.log('Last 10 captures:\n');
      latestPositions.forEach((pos, i) => {
        const hasAmounts = pos.token0_amount !== null && pos.token1_amount !== null;
        const status = hasAmounts ? '✅' : '❌';
        console.log(`${i+1}. ${status} ${pos.protocol} - ${pos.pair} ($${pos.balance})`);
        console.log(`   Captured: ${new Date(pos.captured_at).toLocaleString()}`);
        if (!hasAmounts) {
          console.log(`   ⚠️  Missing: token0_amount=${pos.token0_amount}, token1_amount=${pos.token1_amount}`);
        }
      });
    }

    // 8. Summary and recommendations
    console.log('\n\n🎯 SUMMARY & RECOMMENDATIONS');
    console.log('==============================\n');

    if (stats.fullyComplete === stats.total) {
      console.log('✅ All positions have complete token data!');
    } else {
      const missingPct = (missingData.length / stats.total * 100).toFixed(1);
      console.log(`⚠️  ${missingData.length} positions (${missingPct}%) are missing token data\n`);

      console.log('Possible causes:');
      console.log('1. DOM parsing not extracting token amounts from position panels');
      console.log('2. AI Vision integration not running or failing');
      console.log('3. Database update failing after AI extraction');
      console.log('4. Token breakdown not visible in UI when capturing\n');

      console.log('Recommended actions:');
      console.log('1. Check content.js protocol parsers for token extraction');
      console.log('2. Verify AI Vision is being triggered for incomplete positions');
      console.log('3. Check browser console for extraction errors during capture');
      console.log('4. Review popup.js to ensure AI Vision is called when needed');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run verification
verifyTokenData().then(() => {
  console.log('\n✅ Verification complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
