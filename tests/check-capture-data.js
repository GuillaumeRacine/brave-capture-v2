// Check the actual capture data to see if token breakdown is being captured
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCaptureData() {
  console.log('📊 Checking latest capture data for token breakdown...\n');

  // Get latest Orca capture
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Orca')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No Orca captures found');
    return;
  }

  const capture = data[0];
  console.log(`Latest Orca capture: ${new Date(capture.timestamp).toLocaleString()}`);

  const positions = capture.data?.content?.clmPositions?.positions || [];
  console.log(`\nFound ${positions.length} positions in capture data\n`);

  if (positions.length > 0) {
    const pos = positions[0];
    console.log(`Sample position: ${pos.pair}`);
    console.log(`\nPosition object keys:`);
    console.log(Object.keys(pos).join(', '));

    console.log(`\nToken breakdown fields:`);
    console.log(`  token0: ${pos.token0}`);
    console.log(`  token1: ${pos.token1}`);
    console.log(`  token0Amount: ${pos.token0Amount}`);
    console.log(`  token1Amount: ${pos.token1Amount}`);
    console.log(`  token0Value: ${pos.token0Value}`);
    console.log(`  token1Value: ${pos.token1Value}`);
    console.log(`  token0Percentage: ${pos.token0Percentage}`);
    console.log(`  token1Percentage: ${pos.token1Percentage}`);

    if (pos.token0Amount && pos.token1Amount) {
      console.log('\n✅ Token breakdown IS present in capture data');
      console.log('⚠️  But NOT being saved to positions table correctly');
    } else {
      console.log('\n❌ Token breakdown NOT present in capture data');
      console.log('⚠️  Content script is not extracting token breakdown');
    }
  }
}

checkCaptureData();
