import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function fmt(n) { return n == null ? 'null' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 }); }

async function run() {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Uniswap')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('❌ No Uniswap captures found', error?.message);
    return;
  }

  const cap = data[0];
  console.log('Latest Uniswap capture at', cap.timestamp, cap.url);
  const positions = cap.data?.content?.clmPositions?.positions || [];
  console.log('Positions in capture:', positions.length);
  positions.forEach((p, i) => {
    console.log(`#${i + 1} ${p.pair} fee=${p.feeTier || 'n/a'}%`);
    console.log(`  balance=$${fmt(p.balance)} pending=$${fmt(p.pendingYield)} apy=${fmt(p.apy)}%`);
    console.log(`  range: ${fmt(p.rangeMin)} - ${fmt(p.rangeMax)} current=${fmt(p.currentPrice)} inRange=${p.inRange}`);
    console.log(`  t0=${p.token0} amt=${fmt(p.token0Amount)} $=${fmt(p.token0Value)} pct=${fmt(p.token0Percentage)}`);
    console.log(`  t1=${p.token1} amt=${fmt(p.token1Amount)} $=${fmt(p.token1Value)} pct=${fmt(p.token1Percentage)}`);
  });
}

run().catch(console.error);

