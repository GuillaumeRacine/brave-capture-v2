#!/usr/bin/env node

/**
 * Check Latest Captures - Quick Status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLatest() {
  console.log('📊 QUICK STATUS CHECK\n');

  // Get all positions
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const total = positions.length;
  const complete = positions.filter(p =>
    p.token0_amount && p.token1_amount &&
    p.token0_value && p.token1_value
  ).length;

  const protocols = {};
  positions.forEach(p => {
    if (!protocols[p.protocol]) {
      protocols[p.protocol] = { total: 0, complete: 0 };
    }
    protocols[p.protocol].total++;
    if (p.token0_amount && p.token1_amount && p.token0_value && p.token1_value) {
      protocols[p.protocol].complete++;
    }
  });

  console.log(`Total Positions: ${total}`);
  console.log(`Complete Token Data: ${complete}/${total} (${(complete/total*100).toFixed(1)}%)\n`);

  console.log('By Protocol:');
  Object.keys(protocols).sort().forEach(protocol => {
    const data = protocols[protocol];
    const pct = (data.complete / data.total * 100).toFixed(1);
    const status = data.complete === data.total ? '✅' : data.complete > 0 ? '⚠️' : '❌';
    console.log(`  ${status} ${protocol}: ${data.complete}/${data.total} (${pct}%)`);
  });

  if (complete < total) {
    console.log(`\n💡 Next Step: Use "Extract Token Data" button in extension`);
    console.log(`   This will automatically extract token data for ${total - complete} positions`);
    console.log(`   Estimated time: ~${Math.ceil((total - complete) * 1.5)} seconds`);
    console.log(`   Estimated cost: ~$${((total - complete) * 0.0004).toFixed(3)}`);
  } else {
    console.log(`\n🎉 All positions have complete token data!`);
  }
}

checkLatest().catch(console.error);
