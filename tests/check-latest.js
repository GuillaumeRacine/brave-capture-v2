// Check the absolute latest positions
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLatest() {
  console.log('📊 Checking absolute latest positions from any protocol...\n');

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No positions found');
    return;
  }

  console.log(`Latest ${data.length} positions:\n`);

  data.forEach((pos, index) => {
    const capturedTime = new Date(pos.captured_at);
    const now = new Date();
    const minutesAgo = Math.floor((now - capturedTime) / 1000 / 60);

    console.log(`${index + 1}. ${pos.pair} (${pos.protocol})`);
    console.log(`   Captured: ${capturedTime.toLocaleString()} (${minutesAgo} min ago)`);
    console.log(`   Balance: $${pos.balance}`);
    console.log(`   Token0 (${pos.token0}): ${pos.token0_amount || 'NULL'} ($${pos.token0_value || 'NULL'})`);
    console.log(`   Token1 (${pos.token1}): ${pos.token1_amount || 'NULL'} ($${pos.token1_value || 'NULL'})`);

    if (pos.token0_amount && pos.token1_amount) {
      console.log('   ✅ Token breakdown data present');
    } else {
      console.log('   ⚠️  Token breakdown data missing');
    }
    console.log('');
  });
}

checkLatest();
