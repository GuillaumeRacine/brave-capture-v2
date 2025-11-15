// Check raw capture data for token breakdown
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('Checking latest Orca capture for cbBTC position...\n');

  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Orca')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('Error:', error);
    return;
  }

  const capture = data[0];
  const positions = capture.data?.content?.clmPositions?.positions || [];

  console.log(`Found ${positions.length} positions in capture\n`);

  const cbBTCPos = positions.find(p => p.pair.includes('BTC'));

  if (!cbBTCPos) {
    console.log('No BTC position found');
    return;
  }

  console.log('cbBTC Position Data:');
  console.log('  Pair:', cbBTCPos.pair);
  console.log('  Balance:', cbBTCPos.balance);
  console.log('  token0:', cbBTCPos.token0);
  console.log('  token1:', cbBTCPos.token1);
  console.log('  token0Amount:', cbBTCPos.token0Amount);
  console.log('  token1Amount:', cbBTCPos.token1Amount);
  console.log('  token0Value:', cbBTCPos.token0Value);
  console.log('  token1Value:', cbBTCPos.token1Value);
  console.log('  token0Percentage:', cbBTCPos.token0Percentage);
  console.log('  token1Percentage:', cbBTCPos.token1Percentage);

  console.log('\n✅ Expected from Orca UI:');
  console.log('  cbBTC: 0.03512628 tokens (36.7% = $3,722)');
  console.log('  USDC: 6,409.47 tokens (63.3% = $6,409)');
}

check();
