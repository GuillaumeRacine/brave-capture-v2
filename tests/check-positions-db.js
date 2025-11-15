// Check positions table for latest Orca data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('Checking all Orca positions in database...\n');

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('protocol', 'Orca')
    .order('captured_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} positions\n`);

  data.forEach((pos, i) => {
    console.log(`${i + 1}. ${pos.pair} - $${pos.balance}`);
    console.log(`   Captured: ${new Date(pos.captured_at).toLocaleString()}`);
    console.log(`   ${pos.token0}: ${pos.token0_amount} (${pos.token0_percentage}%)`);
    console.log(`   ${pos.token1}: ${pos.token1_amount} (${pos.token1_percentage}%)`);
    console.log();
  });
}

check();
