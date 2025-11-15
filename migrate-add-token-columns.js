// Migration: Add token breakdown columns to positions table
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration() {
  console.log('🔄 Running migration to add token breakdown columns...\n');

  const sql = `
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS token0_amount NUMERIC,
    ADD COLUMN IF NOT EXISTS token1_amount NUMERIC,
    ADD COLUMN IF NOT EXISTS token0_value NUMERIC,
    ADD COLUMN IF NOT EXISTS token1_value NUMERIC,
    ADD COLUMN IF NOT EXISTS token0_percentage NUMERIC,
    ADD COLUMN IF NOT EXISTS token1_percentage NUMERIC;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // RPC might not exist, try alternative method
      console.error('❌ Error using RPC method:', error.message);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('\n' + sql);
      console.log('\nOr ensure you have the exec_sql RPC function set up.');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nColumns added:');
    console.log('  - token0_amount');
    console.log('  - token1_amount');
    console.log('  - token0_value');
    console.log('  - token1_value');
    console.log('  - token0_percentage');
    console.log('  - token1_percentage');
    console.log('\n📝 Next step: Recapture your CLM positions to populate the new columns.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + sql);
    process.exit(1);
  }
}

runMigration();
