#!/usr/bin/env node

/**
 * Inject Test Data to Prove Dashboard Works
 *
 * This script will:
 * 1. Add ONE test position with complete token data
 * 2. Verify it appears in dashboard
 * 3. Prove that the display code is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function injectTestData() {
  console.log('🧪 Injecting Test Data to Verify Dashboard Display\n');
  console.log('━'.repeat(60));

  // First, get the latest capture_id from the database
  const { data: latestCapture } = await supabase
    .from('captures')
    .select('id')
    .order('timestamp', { ascending: false })
    .limit(1);

  let captureId;
  if (latestCapture && latestCapture.length > 0) {
    captureId = latestCapture[0].id;
    console.log('Using existing capture_id:', captureId);
  } else {
    // Create a test capture first
    const { data: newCapture, error: captureError } = await supabase
      .from('captures')
      .insert([{
        protocol: 'Orca',
        timestamp: new Date().toISOString(),
        data: { content: { test: true } }
      }])
      .select();

    if (captureError || !newCapture || newCapture.length === 0) {
      console.error('Failed to create test capture:', captureError?.message);
      process.exit(1);
    }

    captureId = newCapture[0].id;
    console.log('Created new capture_id:', captureId);
  }

  // Create a test position with COMPLETE token data
  const testPosition = {
    capture_id: captureId, // Required field
    pair: 'TEST-SOL/USDC',
    protocol: 'Orca',
    token0: 'SOL',
    token1: 'USDC',
    balance: 10000,
    pending_yield: 45.50,
    apy: 23.5,
    range_min: 95.0,
    range_max: 105.0,
    current_price: 100.0,
    in_range: true,
    range_status: 'in_range',
    // TOKEN DATA - This is what's missing in real positions!
    token0_amount: 50.5,
    token1_amount: 5000,
    token0_value: 5050,
    token1_value: 5000,
    token0_percentage: 50.5,
    token1_percentage: 49.5,
    // TIMESTAMP
    captured_at: new Date().toISOString()
  };

  console.log('\n📝 Inserting test position:');
  console.log('   Pair:', testPosition.pair);
  console.log('   Balance:', `$${testPosition.balance}`);
  console.log('   Token0:', `${testPosition.token0_amount} ${testPosition.token0} ($${testPosition.token0_value} • ${testPosition.token0_percentage}%)`);
  console.log('   Token1:', `${testPosition.token1_amount} ${testPosition.token1} ($${testPosition.token1_value} • ${testPosition.token1_percentage}%)`);
  console.log('   Timestamp:', testPosition.captured_at);

  const { data, error } = await supabase
    .from('positions')
    .insert([testPosition])
    .select();

  if (error) {
    console.error('\n❌ Failed to insert test data:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Test position inserted successfully!');
  console.log('\n📊 Verification:');

  // Verify the data was saved correctly
  const { data: verify, error: verifyError } = await supabase
    .from('positions')
    .select('*')
    .eq('pair', 'TEST-SOL/USDC')
    .order('captured_at', { ascending: false })
    .limit(1);

  if (verifyError || !verify || verify.length === 0) {
    console.error('❌ Failed to verify test data');
    process.exit(1);
  }

  const saved = verify[0];
  console.log('   Database contains:');
  console.log('   ├─ token0_amount:', saved.token0_amount, saved.token0_amount ? '✅' : '❌');
  console.log('   ├─ token1_amount:', saved.token1_amount, saved.token1_amount ? '✅' : '❌');
  console.log('   ├─ token0_value:', saved.token0_value, saved.token0_value ? '✅' : '❌');
  console.log('   ├─ token1_value:', saved.token1_value, saved.token1_value ? '✅' : '❌');
  console.log('   ├─ token0_percentage:', saved.token0_percentage, saved.token0_percentage ? '✅' : '❌');
  console.log('   ├─ token1_percentage:', saved.token1_percentage, saved.token1_percentage ? '✅' : '❌');
  console.log('   └─ captured_at:', saved.captured_at, saved.captured_at ? '✅' : '❌');

  console.log('\n🎯 Next Steps:');
  console.log('   1. Open dashboard.html in your browser');
  console.log('   2. Look for position: TEST-SOL/USDC');
  console.log('   3. You should see:');
  console.log('      - Token amounts: "50.50 SOL" and "5,000.00 USDC"');
  console.log('      - Token values: "$5,050" and "$5,000"');
  console.log('      - Token percentages: "50.5%" and "49.5%"');
  console.log('      - Timestamp: "Just now"');
  console.log('\n   If you see all this data, the dashboard display code is WORKING ✅');
  console.log('   If you DON\'T see it, there\'s a bug in the dashboard code ❌');

  console.log('\n💡 To remove test data later, run:');
  console.log('   DELETE FROM positions WHERE pair = \'TEST-SOL/USDC\';');
}

injectTestData().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
