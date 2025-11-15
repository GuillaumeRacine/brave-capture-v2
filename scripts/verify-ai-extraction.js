#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyAIExtraction() {
  console.log('🔍 Verifying AI extraction results...\n');

  // Get the most recent capture
  const { data: captures } = await supabase
    .from('captures')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (!captures || captures.length === 0) {
    console.log('❌ No captures found');
    return;
  }

  const latestCapture = captures[0];
  console.log('📸 Latest Capture:');
  console.log(`  ID: ${latestCapture.id}`);
  console.log(`  Protocol: ${latestCapture.protocol}`);
  console.log(`  Timestamp: ${new Date(latestCapture.timestamp).toLocaleString()}`);
  console.log(`  Has Screenshot: ${latestCapture.screenshot ? 'YES' : 'NO'}\n`);

  // Get all positions for this capture
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('capture_id', latestCapture.id)
    .order('pair', { ascending: true });

  if (!positions || positions.length === 0) {
    console.log('⚠️  No positions found for this capture');
    console.log('   This is expected if AI extraction hasn\'t run yet or failed\n');
    return;
  }

  console.log(`✅ Found ${positions.length} positions from AI extraction:\n`);

  positions.forEach((pos, index) => {
    console.log(`${index + 1}. ${pos.pair}`);
    console.log(`   Balance: $${pos.balance?.toLocaleString() || 'N/A'}`);
    console.log(`   Token 0 Amount: ${pos.token0_amount || 'N/A'}`);
    console.log(`   Token 1 Amount: ${pos.token1_amount || 'N/A'}`);
    console.log(`   Token 0 Value: $${pos.token0_value || 'N/A'}`);
    console.log(`   Token 1 Value: $${pos.token1_value || 'N/A'}`);
    console.log(`   Token Breakdown: ${pos.token0_percentage || 'N/A'}% / ${pos.token1_percentage || 'N/A'}%`);
    console.log(`   In Range: ${pos.in_range ? '✅' : '❌'}`);
    console.log(`   Capture ID: ${pos.capture_id}`);
    console.log('');
  });

  // Check if token data is complete
  const withTokenData = positions.filter(p =>
    p.token0_amount !== null &&
    p.token1_amount !== null &&
    p.token0_value !== null &&
    p.token1_value !== null
  );

  console.log(`\n📊 Summary:`);
  console.log(`   Total positions: ${positions.length}`);
  console.log(`   With complete token data: ${withTokenData.length}`);
  console.log(`   Missing token data: ${positions.length - withTokenData.length}`);

  if (withTokenData.length === positions.length) {
    console.log(`\n🎉 SUCCESS! All positions have complete token data from AI extraction`);
  } else {
    console.log(`\n⚠️  Some positions are missing token data`);
  }
}

verifyAIExtraction();
