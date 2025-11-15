// Debug: Check why position not found in database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTimestampIssue() {
  console.log('🔍 Checking why position not found...\n');

  const testTimestamp = '2025-11-11T12:38:32.810Z';
  const testPair = 'cbBTC/USDC0';

  // Get all cbBTC/USDC0 positions
  console.log(`Looking for pair: "${testPair}"`);
  const { data: allPositions, error: allError } = await supabase
    .from('positions')
    .select('*')
    .eq('pair', testPair)
    .order('captured_at', { ascending: false })
    .limit(5);

  if (allError) {
    console.error('Error fetching positions:', allError);
    return;
  }

  console.log(`\nFound ${allPositions.length} position(s) with pair "${testPair}":\n`);

  allPositions.forEach((pos, i) => {
    console.log(`${i + 1}. captured_at: "${pos.captured_at}"`);
    console.log(`   timestamp type: ${typeof pos.captured_at}`);
    console.log(`   Has token data: ${pos.token0_amount ? 'YES' : 'NO'}`);
    console.log('');
  });

  // Try exact match
  console.log(`\nTrying EXACT match with: "${testTimestamp}"`);
  const { data: exactMatch, error: exactError } = await supabase
    .from('positions')
    .select('*')
    .eq('pair', testPair)
    .eq('captured_at', testTimestamp);

  if (exactError) {
    console.error('Error:', exactError);
  } else {
    console.log(`Result: ${exactMatch.length} row(s) found`);
    if (exactMatch.length === 0) {
      console.log('❌ No exact match found!');

      // Try finding the closest timestamp
      if (allPositions.length > 0) {
        const latest = allPositions[0];
        console.log(`\n💡 Latest capture has timestamp: "${latest.captured_at}"`);
        console.log(`   We're looking for: "${testTimestamp}"`);
        console.log(`   Match: ${latest.captured_at === testTimestamp ? 'YES ✅' : 'NO ❌'}`);

        // Check if it's a millisecond difference
        const latestTime = new Date(latest.captured_at).getTime();
        const testTime = new Date(testTimestamp).getTime();
        const diff = Math.abs(latestTime - testTime);
        console.log(`   Time difference: ${diff}ms`);
      }
    } else {
      console.log('✅ Exact match found!');
    }
  }

  // Show the captures table to see what timestamp format is stored
  console.log('\n📊 Checking captures table for recent capture:');
  const { data: captures, error: captureError } = await supabase
    .from('captures')
    .select('id, timestamp, protocol')
    .order('timestamp', { ascending: false })
    .limit(3);

  if (!captureError && captures) {
    captures.forEach(cap => {
      console.log(`Capture: ${cap.protocol}, timestamp: "${cap.timestamp}"`);
    });
  }
}

checkTimestampIssue();
