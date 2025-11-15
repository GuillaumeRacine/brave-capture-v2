/**
 * Delete the incorrect BTC/USDC position (should be wBTC/USDC)
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

async function deleteBadPosition() {
  console.log('🗑️  Deleting incorrect BTC/USDC position...\n');

  try {
    // Find and delete positions with pair = "BTC/USDC" (should be wBTC/USDC)
    const { data: badPositions, error: findError } = await supabase
      .from('positions')
      .select('*')
      .eq('pair', 'BTC/USDC');

    if (findError) {
      console.error('❌ Error finding positions:', findError);
      throw findError;
    }

    console.log(`📊 Found ${badPositions?.length || 0} position(s) with pair "BTC/USDC"`);

    if (badPositions && badPositions.length > 0) {
      badPositions.forEach(pos => {
        console.log(`   - ID: ${pos.id}, Balance: $${pos.balance}, Min: ${pos.range_min}, Max: ${pos.range_max}`);
      });

      // Delete them
      const { error: deleteError } = await supabase
        .from('positions')
        .delete()
        .eq('pair', 'BTC/USDC');

      if (deleteError) {
        console.error('❌ Error deleting positions:', deleteError);
        throw deleteError;
      }

      console.log(`\n✅ Deleted ${badPositions.length} incorrect position(s)`);
    } else {
      console.log('✅ No incorrect BTC/USDC positions found');
    }

    // Also delete any captures that contain BTC/USDC
    const { data: badCaptures, error: findCapturesError } = await supabase
      .from('captures')
      .select('id, timestamp')
      .eq('protocol', 'Cetus')
      .contains('data', { clmPositions: { positions: [{ pair: 'BTC/USDC' }] } });

    if (!findCapturesError && badCaptures && badCaptures.length > 0) {
      console.log(`\n📊 Found ${badCaptures.length} capture(s) containing BTC/USDC`);

      // Delete old captures with BTC/USDC
      for (const capture of badCaptures) {
        const { error: deleteCaptureError } = await supabase
          .from('captures')
          .delete()
          .eq('id', capture.id);

        if (!deleteCaptureError) {
          console.log(`   ✅ Deleted capture ${capture.id} from ${capture.timestamp}`);
        }
      }
    }

    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

deleteBadPosition();
