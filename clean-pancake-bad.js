/**
 * Clean up bad PancakeSwap positions with incorrect token names
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

async function cleanBadPancakePositions() {
  console.log('🧹 Cleaning up bad PancakeSwap positions...\n');

  try {
    // Get all PancakeSwap positions
    const { data: allPositions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('protocol', 'PancakeSwap')
      .order('captured_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching positions:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${allPositions?.length || 0} PancakeSwap position(s):\n`);

    if (allPositions && allPositions.length > 0) {
      allPositions.forEach((pos, i) => {
        const rangeStatus = pos.range_min ? `Min: ${pos.range_min}` : 'Min: N/A';
        console.log(`   ${i + 1}. ${pos.pair} - $${pos.balance} - ${rangeStatus} - ${pos.captured_at}`);
      });

      // Find positions to delete:
      // 1. Positions with pair containing "Base/DK" or "Solana/DK"
      // 2. cbBTC/USDC positions with missing range data (range_min is null)
      const positionsToDelete = allPositions.filter(pos => {
        const hasBadPair = pos.pair === 'Base/DK' || pos.pair === 'Solana/DK';
        const isCbBTCMissingRange = pos.pair === 'cbBTC/USDC' && !pos.range_min;
        return hasBadPair || isCbBTCMissingRange;
      });

      if (positionsToDelete.length > 0) {
        console.log(`\n🗑️  Deleting ${positionsToDelete.length} bad position(s):\n`);

        for (const pos of positionsToDelete) {
          console.log(`   - ${pos.pair} - $${pos.balance} - (${pos.range_min ? 'Has ranges' : 'Missing ranges'})`);

          const { error: deleteError } = await supabase
            .from('positions')
            .delete()
            .eq('id', pos.id);

          if (deleteError) {
            console.error(`   ❌ Error deleting position ${pos.id}:`, deleteError);
          } else {
            console.log(`   ✅ Deleted position ${pos.id}`);
          }
        }

        console.log(`\n✅ Deleted ${positionsToDelete.length} position(s)`);
      } else {
        console.log('\n✅ No bad positions found to delete');
      }

      // Also clean up bad PancakeSwap captures
      const { data: allCaptures, error: capturesError } = await supabase
        .from('captures')
        .select('id, timestamp, data')
        .eq('protocol', 'PancakeSwap')
        .order('timestamp', { ascending: false });

      if (!capturesError && allCaptures && allCaptures.length > 0) {
        const badCaptures = allCaptures.filter(capture => {
          const positions = capture.data?.content?.clmPositions?.positions || [];
          return positions.some(p =>
            p.pair === 'Base/DK' ||
            p.pair === 'Solana/DK' ||
            (p.pair === 'cbBTC/USDC' && !p.rangeMin)
          );
        });

        if (badCaptures.length > 0) {
          console.log(`\n🗑️  Deleting ${badCaptures.length} bad capture(s)...\n`);

          for (const capture of badCaptures) {
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
    }

    console.log('\n✅ PancakeSwap cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanBadPancakePositions();
