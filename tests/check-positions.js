// Check latest positions to verify token breakdown data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPositions() {
  console.log('📊 Checking latest Orca and Raydium positions...\n');

  // Get latest positions from Orca and Raydium
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .in('protocol', ['Orca', 'Raydium'])
    .order('captured_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No Orca or Raydium positions found');
    return;
  }

  console.log(`Found ${data.length} positions\n`);

  data.forEach((pos, index) => {
    console.log(`\n${index + 1}. ${pos.pair} (${pos.protocol})`);
    console.log(`   Captured: ${new Date(pos.captured_at).toLocaleString()}`);
    console.log(`   Balance: $${pos.balance}`);
    console.log(`   Token0 (${pos.token0}): ${pos.token0_amount || 'NULL'} ($${pos.token0_value || 'NULL'})`);
    console.log(`   Token1 (${pos.token1}): ${pos.token1_amount || 'NULL'} ($${pos.token1_value || 'NULL'})`);
    console.log(`   In Range: ${pos.in_range ? '✓' : '✗'}`);

    // Check if token data exists
    if (pos.token0_amount && pos.token1_amount) {
      console.log('   ✅ Token breakdown data present');
    } else {
      console.log('   ⚠️  Token breakdown data missing');
    }
  });

  // Summary
  const withTokenData = data.filter(p => p.token0_amount && p.token1_amount).length;
  const withoutTokenData = data.length - withTokenData;

  console.log('\n' + '='.repeat(60));
  console.log(`📈 Summary:`);
  console.log(`   Positions with token data: ${withTokenData}/${data.length}`);
  console.log(`   Positions missing token data: ${withoutTokenData}/${data.length}`);

  if (withTokenData === data.length) {
    console.log('\n✅ All positions have complete token breakdown data!');
  } else if (withTokenData > 0) {
    console.log('\n⚠️  Some positions are missing token breakdown data');
  } else {
    console.log('\n❌ No positions have token breakdown data yet');
  }
}

checkPositions();
