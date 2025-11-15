#!/usr/bin/env node

/**
 * Wipe All Positions from Database
 *
 * This script deletes all positions and captures from the Supabase database,
 * allowing you to start fresh with new captures.
 *
 * Usage: node scripts/wipe-all-positions.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function wipeAllData() {
  console.log('🗑️  Starting database wipe...\n');

  // Step 1: Count existing data
  console.log('📊 Checking current data...');

  const { data: capturesCount } = await supabase
    .from('captures')
    .select('id', { count: 'exact', head: true });

  const { data: positionsCount } = await supabase
    .from('positions')
    .select('id', { count: 'exact', head: true });

  console.log(`Found ${capturesCount?.length || 0} captures`);
  console.log(`Found ${positionsCount?.length || 0} positions\n`);

  // Step 2: Delete all positions (cascade will handle related data)
  console.log('🗑️  Deleting all positions...');
  const { error: positionsError, count: deletedPositions } = await supabase
    .from('positions')
    .delete({ count: 'exact' })
    .neq('id', 0); // Delete all (where id != 0 matches everything)

  if (positionsError) {
    console.error('❌ Error deleting positions:', positionsError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${deletedPositions || 0} positions\n`);

  // Step 3: Delete all captures
  console.log('🗑️  Deleting all captures...');
  const { error: capturesError, count: deletedCaptures } = await supabase
    .from('captures')
    .delete({ count: 'exact' })
    .neq('id', ''); // Delete all (where id != '' matches everything)

  if (capturesError) {
    console.error('❌ Error deleting captures:', capturesError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${deletedCaptures || 0} captures\n`);

  // Step 4: Verify database is empty
  console.log('🔍 Verifying database is clean...');

  const { count: remainingCaptures } = await supabase
    .from('captures')
    .select('*', { count: 'exact', head: true });

  const { count: remainingPositions } = await supabase
    .from('positions')
    .select('*', { count: 'exact', head: true });

  if (remainingCaptures === 0 && remainingPositions === 0) {
    console.log('✅ Database is clean!\n');
    console.log('🎉 Success! You can now start capturing fresh data.\n');
    console.log('Next steps:');
    console.log('1. Go to your DeFi protocol pages (Orca, Uniswap, etc.)');
    console.log('2. Click the extension icon');
    console.log('3. Click "Capture Page Data"');
    console.log('4. After capturing, click "Extract Token Data" for complete data\n');
  } else {
    console.log(`⚠️  Warning: Database not fully clean`);
    console.log(`   Remaining captures: ${remainingCaptures || 0}`);
    console.log(`   Remaining positions: ${remainingPositions || 0}\n`);
  }
}

// Run the wipe
wipeAllData().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
