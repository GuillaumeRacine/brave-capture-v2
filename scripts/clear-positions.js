#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clearPositions() {
  console.log('🗑️  Clearing all positions from database...\n');

  // First get count
  const { count } = await supabase
    .from('positions')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${count} positions to delete\n`);

  const { error } = await supabase
    .from('positions')
    .delete()
    .gte('created_at', '2020-01-01'); // Delete all after 2020

  if (error) {
    console.error('❌ Error clearing positions:', error);
    return;
  }

  console.log('✅ All positions cleared!\n');
  console.log('You can now take a fresh capture to test AI extraction without duplicates.');
}

clearPositions();
