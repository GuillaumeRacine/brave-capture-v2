#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRecentCapture() {
  // Get the most recent capture
  const { data: captures } = await supabase
    .from('captures')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (!captures || captures.length === 0) {
    console.log('No captures found');
    return;
  }

  const latest = captures[0];
  console.log('\n📸 Most Recent Capture:');
  console.log('Timestamp:', new Date(latest.timestamp).toLocaleString());
  console.log('Protocol:', latest.protocol);
  console.log('Has Screenshot:', latest.screenshot ? 'YES' : 'NO');
  console.log('Screenshot Size:', latest.screenshot ? `${(latest.screenshot.length / 1024).toFixed(1)} KB` : 'N/A');
  
  // Parse the data
  const data = latest.data?.content?.clmPositions?.positions || [];
  console.log('\nPositions in Capture:', data.length);
  
  if (data.length > 0) {
    console.log('\nToken Data Status:');
    data.forEach(pos => {
      const hasTokenData = pos.token0Amount !== null && pos.token1Amount !== null;
      console.log(`  ${pos.pair}: ${hasTokenData ? '✅ HAS TOKEN DATA' : '❌ MISSING TOKEN DATA'}`);
    });
  }
}

checkRecentCapture();
