// Check token calculation logic
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('protocol', 'Orca')
    .order('captured_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('Error:', error);
    return;
  }

  const pos = data[0];
  console.log('Position:', pos.pair);
  console.log('Balance:', pos.balance);
  console.log('Current Price:', pos.current_price);
  console.log(`\nToken 0 (${pos.token0}):`);
  console.log('  Amount:', pos.token0_amount);
  console.log('  Value:', pos.token0_value);
  console.log('  Percentage:', pos.token0_percentage);
  console.log(`\nToken 1 (${pos.token1}):`);
  console.log('  Amount:', pos.token1_amount);
  console.log('  Value:', pos.token1_value);
  console.log('  Percentage:', pos.token1_percentage);

  // Check if amount equals value (this is wrong)
  if (pos.token0_amount === pos.token0_value) {
    console.log('\n⚠️  WARNING: token0_amount equals token0_value!');
    console.log('This means the token amount is being set to the USD value.');
  }

  // Calculate what the correct token amount should be
  const correctToken0Amount = pos.balance * 0.5 / pos.current_price;
  console.log('\n🔧 What token0_amount SHOULD be (assuming 50/50 split):');
  console.log('  ', correctToken0Amount);
}

check();
