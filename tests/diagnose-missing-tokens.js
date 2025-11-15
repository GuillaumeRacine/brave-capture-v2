#!/usr/bin/env node

/**
 * Diagnostic Script: Why are tokens NOT being extracted?
 *
 * This script will:
 * 1. Check if API key is configured
 * 2. Check recent captures in database
 * 3. Check if positions have token data
 * 4. Identify the exact failure point
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

console.log('🔍 DIAGNOSTIC: Missing Token Data\n');
console.log('━'.repeat(60));

// Step 1: Check configuration
console.log('\n1️⃣  CONFIGURATION CHECK');
console.log('   Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('   Anthropic Key:', anthropicKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Supabase credentials missing - cannot continue');
  process.exit(1);
}

if (!anthropicKey) {
  console.error('\n⚠️  WARNING: Anthropic API key missing - AI Vision will NOT work!');
  console.error('   This is why token data is not being extracted.');
  console.error('\n💡 FIX: Add ANTHROPIC_API_KEY to .env.local');
  console.error('   Then run: npm run build:config');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n2️⃣  DATABASE CHECK');

  // Check recent positions
  const { data: positions, error } = await supabase
    .from('positions')
    .select('pair, protocol, token0_amount, token1_amount, token0_percentage, captured_at')
    .order('captured_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('   ❌ Error querying database:', error.message);
    return;
  }

  console.log(`   Found ${positions.length} recent positions\n`);

  // Analyze positions
  const withData = positions.filter(p => p.token0_amount !== null);
  const withoutData = positions.filter(p => p.token0_amount === null);

  console.log('   Positions WITH token data:', withData.length, '✅');
  console.log('   Positions WITHOUT token data:', withoutData.length, '❌');

  if (withoutData.length > 0) {
    console.log('\n   Positions missing token data:');
    withoutData.forEach((p, i) => {
      const timeAgo = getTimeAgo(new Date(p.captured_at));
      console.log(`   ${i + 1}. ${p.pair} (${p.protocol}) - captured ${timeAgo}`);
    });
  }

  console.log('\n3️⃣  DIAGNOSIS');

  if (withData.length === 0 && withoutData.length > 0) {
    console.log('   ❌ PROBLEM IDENTIFIED: No positions have token data');
    console.log('   ❓ ROOT CAUSE: AI Vision extraction is NOT running');
    console.log('\n   Possible reasons:');
    console.log('   1. User is NOT clicking the position to expand it before capture');
    console.log('   2. Auto-extraction prompt is being skipped/ignored');
    console.log('   3. Background script AI Vision is failing silently');
    console.log('   4. Extension not properly reloaded after config changes');
    console.log('\n   ✅ SOLUTION:');
    console.log('   1. Reload the extension in chrome://extensions');
    console.log('   2. When capturing, EXPAND one position to see the drawer');
    console.log('   3. Then click "Capture Positions"');
    console.log('   4. OR use the "Extract Token Data" button after capture');
  } else if (withData.length > 0) {
    console.log('   ✅ AI Vision IS working - some positions have token data');
    console.log('   ℹ️  Positions without data may be from before AI Vision was enabled');
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 1000 / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

diagnose().catch(console.error);
