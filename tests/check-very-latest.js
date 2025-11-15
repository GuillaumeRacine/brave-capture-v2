// Check for captures from the last 5 minutes
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('🔍 Checking for any captures in the last 10 minutes...\n');

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Check captures table
  const { data: captures, error: captureError } = await supabase
    .from('captures')
    .select('id, protocol, timestamp')
    .gte('timestamp', tenMinutesAgo)
    .order('timestamp', { ascending: false });

  if (captureError) {
    console.error('❌ Capture error:', captureError);
  } else {
    console.log(`📦 Captures in last 10 minutes: ${captures?.length || 0}`);
    if (captures && captures.length > 0) {
      captures.forEach(c => {
        const time = new Date(c.timestamp);
        const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000);
        console.log(`  - ${c.protocol} captured ${secondsAgo}s ago (${time.toLocaleTimeString()})`);
      });
    }
  }

  // Check positions table
  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('pair, protocol, captured_at, token0_amount, token1_amount')
    .gte('captured_at', tenMinutesAgo)
    .order('captured_at', { ascending: false });

  if (posError) {
    console.error('❌ Position error:', posError);
  } else {
    console.log(`\n📊 Positions in last 10 minutes: ${positions?.length || 0}`);
    if (positions && positions.length > 0) {
      positions.forEach(p => {
        const time = new Date(p.captured_at);
        const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000);
        const hasTokenData = p.token0_amount ? '✅' : '❌';
        console.log(`  ${hasTokenData} ${p.pair} (${p.protocol}) - ${secondsAgo}s ago`);
        if (p.token0_amount) {
          console.log(`      Token amounts: ${p.token0_amount} / ${p.token1_amount}`);
        }
      });
    }
  }
}

check();
