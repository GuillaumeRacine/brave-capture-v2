// Inspect the actual captured data structure
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectCaptures() {
  console.log('🔍 Inspecting latest Aave, Morpho, and Hyperliquid captures...\n');

  // Get latest of each
  const protocols = ['Aave', 'Morpho', 'Hyperliquid'];

  for (const protocol of protocols) {
    const { data: captures, error } = await supabase
      .from('captures')
      .select('*')
      .eq('protocol', protocol)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`❌ Error fetching ${protocol}:`, error);
      continue;
    }

    if (captures.length === 0) {
      console.log(`❌ No ${protocol} captures found\n`);
      continue;
    }

    const capture = captures[0];
    console.log(`\n========== ${protocol} ==========`);
    console.log(`Captured: ${new Date(capture.timestamp).toLocaleString()}`);
    console.log(`URL: ${capture.url}`);
    console.log(`\nData structure:`);
    console.log(JSON.stringify(capture.data, null, 2));
    console.log(`\n`);
  }
}

inspectCaptures().catch(console.error);
