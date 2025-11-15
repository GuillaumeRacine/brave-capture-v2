/**
 * Delete all PancakeSwap positions and captures
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase credentials must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteAllPancakeSwap() {
  console.log('🗑️  Deleting all PancakeSwap positions and captures...\n');

  try {
    // Get count of PancakeSwap positions
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('id, pair, balance')
      .eq('protocol', 'PancakeSwap');

    if (posError) {
      console.error('❌ Error fetching positions:', posError);
      throw posError;
    }

    console.log(`📊 Found ${positions?.length || 0} PancakeSwap position(s):`);
    if (positions && positions.length > 0) {
      positions.forEach(p => {
        console.log(`   - ${p.pair}: $${p.balance}`);
      });
    }

    // Delete all PancakeSwap positions
    const { error: deletePosError } = await supabase
      .from('positions')
      .delete()
      .eq('protocol', 'PancakeSwap');

    if (deletePosError) {
      console.error('❌ Error deleting positions:', deletePosError);
      throw deletePosError;
    }

    console.log(`✅ Deleted ${positions?.length || 0} position(s)\n`);

    // Get count of PancakeSwap captures
    const { data: captures, error: capError } = await supabase
      .from('captures')
      .select('id, timestamp')
      .eq('protocol', 'PancakeSwap');

    if (capError) {
      console.error('❌ Error fetching captures:', capError);
      throw capError;
    }

    console.log(`📊 Found ${captures?.length || 0} PancakeSwap capture(s)`);

    // Delete all PancakeSwap captures
    const { error: deleteCapError } = await supabase
      .from('captures')
      .delete()
      .eq('protocol', 'PancakeSwap');

    if (deleteCapError) {
      console.error('❌ Error deleting captures:', deleteCapError);
      throw deleteCapError;
    }

    console.log(`✅ Deleted ${captures?.length || 0} capture(s)\n`);

    // Verify deletion
    const { data: remainingPos } = await supabase
      .from('positions')
      .select('id')
      .eq('protocol', 'PancakeSwap');

    const { data: remainingCap } = await supabase
      .from('captures')
      .select('id')
      .eq('protocol', 'PancakeSwap');

    console.log('✅ Cleanup complete!');
    console.log(`   Remaining PancakeSwap positions: ${remainingPos?.length || 0}`);
    console.log(`   Remaining PancakeSwap captures: ${remainingCap?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    process.exit(1);
  }
}

deleteAllPancakeSwap();
