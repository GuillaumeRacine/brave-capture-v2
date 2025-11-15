// Verify all positions were correctly saved to database with right token data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyPositions() {
  console.log('🔍 Verifying all positions were saved correctly...\n');

  // Get most recent positions
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching positions:', error);
    return;
  }

  console.log(`Found ${positions.length} recent positions\n`);

  // Expected positions from the logs
  const expectedPairs = ['SOL/USDC0', 'PUMP/SOL0', 'JLP/USDC0', 'whETH/SOL0', 'cbBTC/USDC0'];

  for (const pair of expectedPairs) {
    const position = positions.find(p => p.pair === pair);

    if (!position) {
      console.log(`❌ ${pair}: Not found in database`);
      continue;
    }

    console.log(`✅ ${pair}:`);
    console.log(`   Captured: ${new Date(position.captured_at).toLocaleString()}`);

    if (position.token0_amount && position.token1_amount) {
      console.log(`   Token 0: ${position.token0_amount} (${position.token0_percentage}%)`);
      console.log(`   Token 1: ${position.token1_amount} (${position.token1_percentage}%)`);
      console.log(`   ✅ Has token breakdown data`);
    } else {
      console.log(`   ⚠️  Missing token breakdown data`);
    }
    console.log('');
  }

  // Check for any positions with null token data
  const missingData = positions.filter(p =>
    !p.token0_amount || !p.token1_amount
  );

  if (missingData.length > 0) {
    console.log(`\n⚠️  ${missingData.length} position(s) still missing token data:`);
    missingData.forEach(p => {
      console.log(`   - ${p.pair} (${new Date(p.captured_at).toLocaleString()})`);
    });
  } else {
    console.log(`\n✅✅ ALL POSITIONS HAVE TOKEN BREAKDOWN DATA!`);
  }
}

verifyPositions();
