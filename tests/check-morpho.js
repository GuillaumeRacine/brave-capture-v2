// Check Morpho captures specifically
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkMorpho() {
  console.log('🔍 Checking Morpho captures...\n');

  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Morpho')
    .order('timestamp', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${captures.length} Morpho captures:\n`);

  captures.forEach((capture, index) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${index + 1}. Captured: ${new Date(capture.timestamp).toLocaleString()}`);
    console.log(`   URL: ${capture.url}`);

    const morphoData = capture.data?.content?.morphoPositions;

    if (!morphoData) {
      console.log('   ❌ No morphoPositions data found');
      console.log('   Debug: data keys:', Object.keys(capture.data || {}));
      if (capture.data?.content) {
        console.log('   Debug: content keys:', Object.keys(capture.data.content));
      }
      return;
    }

    if (morphoData.error) {
      console.log(`   ❌ Error: ${morphoData.error}`);
      return;
    }

    console.log(`   Position Count: ${morphoData.positionCount || 0}`);
    console.log(`   Is Detail Page: ${morphoData.isDetailPage || false}`);

    if (morphoData.positions && morphoData.positions.length > 0) {
      morphoData.positions.forEach((pos, i) => {
        console.log(`\n   Position ${i + 1}:`);
        console.log(`   ├─ Collateral: ${pos.collateralAmount} ${pos.collateralAsset} ($${pos.collateralValue})`);
        console.log(`   ├─ Loan: ${pos.loanAmount} ${pos.loanAsset} ($${pos.loanValue})`);
        console.log(`   ├─ Rate: ${pos.rate}%`);
        console.log(`   ├─ LTV: ${pos.ltv}% / Liquidation: ${pos.liquidationLTV}%`);
        if (pos.liquidationPrice) {
          console.log(`   ├─ Liquidation Price: ${pos.liquidationPrice} ${pos.liquidationPricePair}`);
          console.log(`   ├─ Drop to Liquidation: ${pos.dropToLiquidation}%`);
        }
        console.log(`   └─ Utilization: ${pos.utilization}%`);
      });
    } else {
      console.log('   ⚠️ No positions found in capture');
    }

    console.log('');
  });
}

checkMorpho().catch(console.error);
