// Check the most recent positions to see what was actually saved
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRecentSaves() {
  console.log('🔍 Checking positions from the 12:41 capture...\n');

  const targetTime = '2025-11-11T12:41:40';

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .gte('captured_at', targetTime)
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} positions since ${targetTime}\n`);

  const grouped = {};
  data.forEach(pos => {
    if (!grouped[pos.pair]) grouped[pos.pair] = [];
    grouped[pos.pair].push(pos);
  });

  Object.keys(grouped).forEach(pair => {
    console.log(`\n${pair}:`);
    grouped[pair].forEach((pos, i) => {
      console.log(`  ${i + 1}. captured_at: ${pos.captured_at}`);
      console.log(`     token0_amount: ${pos.token0_amount}`);
      console.log(`     token1_amount: ${pos.token1_amount}`);
      console.log(`     Has data: ${pos.token0_amount ? '✅ YES' : '❌ NO'}`);
    });
  });

  // Count how many have data
  const withData = data.filter(p => p.token0_amount !== null);
  console.log(`\n\n📊 Summary: ${withData.length}/${data.length} positions have token breakdown data`);
  withData.forEach(p => {
    console.log(`   ✅ ${p.pair}: ${p.token0_amount} / ${p.token1_amount}`);
  });
}

checkRecentSaves();
