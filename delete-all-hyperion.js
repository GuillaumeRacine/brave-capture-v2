/**
 * Delete ALL Hyperion positions and captures
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

async function deleteAllHyperion() {
  console.log('🗑️  Deleting ALL Hyperion positions and captures...\n');

  try {
    // Get all Hyperion positions
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('id, pair, balance')
      .eq('protocol', 'Hyperion');

    if (posError) throw posError;

    console.log(`📊 Found ${positions?.length || 0} Hyperion position(s):`);
    if (positions && positions.length > 0) {
      positions.forEach(p => console.log(`   - ${p.pair}: $${p.balance}`));
    }

    // Delete all positions
    const { error: deletePosError } = await supabase
      .from('positions')
      .delete()
      .eq('protocol', 'Hyperion');

    if (deletePosError) throw deletePosError;
    console.log(`✅ Deleted ${positions?.length || 0} position(s)\n`);

    // Get all Hyperion captures
    const { data: captures, error: capError } = await supabase
      .from('captures')
      .select('id, timestamp')
      .eq('protocol', 'Hyperion');

    if (capError) throw capError;
    console.log(`📊 Found ${captures?.length || 0} Hyperion capture(s)`);

    // Delete all captures
    const { error: deleteCapError } = await supabase
      .from('captures')
      .delete()
      .eq('protocol', 'Hyperion');

    if (deleteCapError) throw deleteCapError;
    console.log(`✅ Deleted ${captures?.length || 0} capture(s)\n`);

    console.log('✅ All Hyperion data deleted!');

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    process.exit(1);
  }
}

deleteAllHyperion();
