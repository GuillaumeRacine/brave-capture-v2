/**
 * Clean up Hyperion positions - remove out of range and keep only latest 3
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

async function cleanHyperion() {
  console.log('🧹 Cleaning up Hyperion positions...\n');

  try {
    // Get all Hyperion positions
    const { data: allPositions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'Hyperion')
      .order('captured_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching positions:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${allPositions?.length || 0} Hyperion position(s)`);

    if (allPositions && allPositions.length > 0) {
      allPositions.forEach((pos, i) => {
        console.log(`   ${i + 1}. ${pos.pair} - $${pos.balance} - ${pos.in_range ? 'In Range ✅' : 'Out of Range ❌'} - ${pos.captured_at}`);
      });

      // Keep only the latest 3 positions
      const positionsToKeep = allPositions.slice(0, 3);
      const positionsToDelete = allPositions.slice(3);

      console.log(`\n✅ Keeping latest ${positionsToKeep.length} position(s):`);
      positionsToKeep.forEach(pos => {
        console.log(`   - ${pos.pair} - $${pos.balance}`);
      });

      if (positionsToDelete.length > 0) {
        console.log(`\n🗑️  Deleting ${positionsToDelete.length} old position(s):`);

        for (const pos of positionsToDelete) {
          console.log(`   - ${pos.pair} - $${pos.balance} (${pos.in_range ? 'In Range' : 'Out of Range'})`);

          const { error: deleteError } = await supabase
            .from('positions')
            .delete()
            .eq('id', pos.id);

          if (deleteError) {
            console.error(`   ❌ Error deleting position ${pos.id}:`, deleteError);
          }
        }

        console.log(`\n✅ Deleted ${positionsToDelete.length} position(s)`);
      }

      // Also clean up old Hyperion captures - keep only the latest 3
      const { data: allCaptures, error: capturesError } = await supabase
        .from('captures')
        .select('id, timestamp')
        .eq('protocol', 'Hyperion')
        .order('timestamp', { ascending: false });

      if (!capturesError && allCaptures && allCaptures.length > 3) {
        const capturesToDelete = allCaptures.slice(3);

        console.log(`\n🗑️  Deleting ${capturesToDelete.length} old capture(s)...`);

        for (const capture of capturesToDelete) {
          const { error: deleteCaptureError } = await supabase
            .from('captures')
            .delete()
            .eq('id', capture.id);

          if (!deleteCaptureError) {
            console.log(`   ✅ Deleted capture from ${capture.timestamp}`);
          }
        }
      }
    }

    console.log('\n✅ Hyperion cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanHyperion();
