// Quick script to check latest captures from Supabase
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCaptures() {
  console.log('🔍 Checking latest captures...\n');

  // Get last 10 captures
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching captures:', error);
    return;
  }

  console.log(`Found ${captures.length} recent captures:\n`);

  captures.forEach((capture, index) => {
    const date = new Date(capture.timestamp).toLocaleString();
    console.log(`${index + 1}. [${capture.protocol}] - ${date}`);
    console.log(`   URL: ${capture.url}`);

    // Check what data was captured
    if (capture.protocol === 'Aave' && capture.data?.aavePositions) {
      const aave = capture.data.aavePositions;
      console.log(`   ✅ Aave Data Found:`);
      console.log(`      - Positions: ${aave.positions?.length || 0}`);
      console.log(`      - Net Worth: ${aave.summary?.netWorth || 'N/A'}`);
      console.log(`      - Health Factor: ${aave.summary?.healthFactor || 'N/A'}`);
      if (aave.positions?.length > 0) {
        console.log(`      - Assets: ${aave.positions.map(p => p.asset).join(', ')}`);
      }
    }

    if (capture.protocol === 'Morpho' && capture.data?.morphoPositions) {
      const morpho = capture.data.morphoPositions;
      console.log(`   ✅ Morpho Data Found:`);
      console.log(`      - Positions: ${morpho.positions?.length || 0}`);
      console.log(`      - Total Collateral: ${morpho.summary?.totalCollateral || 'N/A'}`);
      if (morpho.positions?.length > 0) {
        console.log(`      - Collateral: ${morpho.positions.map(p => p.collateralAsset).join(', ')}`);
      }
    }

    if (capture.protocol === 'Hyperliquid' && capture.data?.hyperliquidPositions) {
      const hl = capture.data.hyperliquidPositions;
      console.log(`   ✅ Hyperliquid Data Found:`);
      console.log(`      - Positions: ${hl.positions?.length || 0}`);
      console.log(`      - Total Value: $${hl.summary?.totalValue || 'N/A'}`);
      console.log(`      - Total PnL: $${hl.summary?.totalPnL || 'N/A'}`);
      if (hl.positions?.length > 0) {
        console.log(`      - Symbols: ${hl.positions.map(p => p.symbol).join(', ')}`);
      }
    }

    console.log('');
  });
}

checkCaptures().catch(console.error);
