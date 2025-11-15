// Verify latest Uniswap positions captured with labeled fields
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function fmt(n) { return n == null ? 'null' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 }); }

async function run() {
  console.log('🔎 Checking latest Uniswap positions...\n');

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('protocol', 'Uniswap')
    .order('captured_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching Uniswap positions:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No Uniswap positions found');
    return;
  }

  data.forEach((p, i) => {
    console.log(`#${i + 1} ${p.pair} [${p.network || 'n/a'}]`);
    console.log(`  Fee tier: ${p.fee_tier || 'n/a'}%`);
    console.log(`  Balance: $${fmt(p.balance)}  Pending: $${fmt(p.pending_yield)}`);
    console.log(`  Range: ${fmt(p.range_min)} - ${fmt(p.range_max)}  Current: ${fmt(p.current_price)}  InRange: ${p.in_range}`);
    console.log(`  Token0: ${p.token0 || 'n/a'}  amt=${fmt(p.token0_amount)}  $=${fmt(p.token0_value)}  pct=${fmt(p.token0_percentage)}`);
    console.log(`  Token1: ${p.token1 || 'n/a'}  amt=${fmt(p.token1_amount)}  $=${fmt(p.token1_value)}  pct=${fmt(p.token1_percentage)}`);
    console.log('');
  });
}

run().catch(err => { console.error(err); process.exit(1); });

