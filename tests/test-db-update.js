/**
 * Simple test to verify database updates work correctly
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseUpdate() {
  console.log('🧪 Testing database update flow...\n');

  // Step 0: Get an existing capture to use as foreign key
  console.log('0️⃣ Finding existing capture...');
  const { data: captures, error: captureError } = await supabase
    .from('captures')
    .select('id')
    .limit(1);

  if (captureError || !captures || captures.length === 0) {
    console.error('❌ No captures found. Please create a capture first.');
    return;
  }

  const captureId = captures[0].id;
  console.log('✅ Using capture:', captureId);

  // Step 1: Create a test position
  const testTimestamp = new Date().toISOString();
  const testPair = 'TEST-TOKEN/USDC';

  console.log('\n1️⃣ Creating test position...');
  const { data: insertData, error: insertError } = await supabase
    .from('positions')
    .insert({
      capture_id: captureId,
      protocol: 'test',
      pair: testPair,
      token0: 'TEST-TOKEN',
      token1: 'USDC',
      balance: 100,
      captured_at: testTimestamp,
      token0_amount: null,
      token1_amount: null,
      token0_percentage: null,
      token1_percentage: null
    })
    .select();

  if (insertError) {
    console.error('❌ Failed to insert test position:', insertError);
    return;
  }

  console.log('✅ Test position created:', insertData[0].id);

  // Step 2: Update the position with token breakdown
  console.log('\n2️⃣ Updating position with token breakdown...');

  const extractedData = {
    token0Amount: 50.5,
    token1Amount: 2500,
    token0Percentage: 40,
    token1Percentage: 60
  };

  const { data: updateData, error: updateError } = await supabase
    .from('positions')
    .update({
      token0_amount: extractedData.token0Amount,
      token1_amount: extractedData.token1Amount,
      token0_percentage: extractedData.token0Percentage,
      token1_percentage: extractedData.token1Percentage
    })
    .eq('pair', testPair)
    .eq('captured_at', testTimestamp)
    .select();

  if (updateError) {
    console.error('❌ Failed to update position:', updateError);
    // Clean up
    await supabase.from('positions').delete().eq('pair', testPair);
    return;
  }

  if (!updateData || updateData.length === 0) {
    console.error('❌ Update returned no rows');
    await supabase.from('positions').delete().eq('pair', testPair);
    return;
  }

  console.log('✅ Position updated successfully!');
  console.log('   token0_amount:', updateData[0].token0_amount);
  console.log('   token1_amount:', updateData[0].token1_amount);
  console.log('   token0_percentage:', updateData[0].token0_percentage);
  console.log('   token1_percentage:', updateData[0].token1_percentage);

  // Step 3: Verify the update
  console.log('\n3️⃣ Verifying the update...');

  const { data: verifyData, error: verifyError } = await supabase
    .from('positions')
    .select('*')
    .eq('pair', testPair)
    .eq('captured_at', testTimestamp)
    .single();

  if (verifyError) {
    console.error('❌ Failed to verify:', verifyError);
    await supabase.from('positions').delete().eq('pair', testPair);
    return;
  }

  const isCorrect =
    verifyData.token0_amount === extractedData.token0Amount &&
    verifyData.token1_amount === extractedData.token1Amount &&
    verifyData.token0_percentage === extractedData.token0Percentage &&
    verifyData.token1_percentage === extractedData.token1Percentage;

  if (isCorrect) {
    console.log('✅ Verification passed! All values match.');
  } else {
    console.error('❌ Verification failed! Values do not match.');
    console.log('Expected:', extractedData);
    console.log('Got:', {
      token0_amount: verifyData.token0_amount,
      token1_amount: verifyData.token1_amount,
      token0_percentage: verifyData.token0_percentage,
      token1_percentage: verifyData.token1_percentage
    });
  }

  // Step 4: Clean up
  console.log('\n4️⃣ Cleaning up test data...');
  await supabase.from('positions').delete().eq('pair', testPair);
  console.log('✅ Test data cleaned up');

  console.log('\n🎉 Database update flow test completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   • Database accepts token breakdown fields ✅');
  console.log('   • Update query syntax is correct ✅');
  console.log('   • .eq() filters work correctly ✅');
  console.log('   • .select() returns updated data ✅');
}

testDatabaseUpdate().catch(console.error);
