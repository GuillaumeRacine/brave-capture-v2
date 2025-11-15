#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRecent() {
  console.log('🔍 Checking recent database activity...\n');

  // Get most recent positions
  const { data: recent } = await supabase
    .from('positions')
    .select('pair, protocol, token0_amount, token1_amount, token0_percentage, captured_at')
    .order('captured_at', { ascending: false })
    .limit(10);

  console.log('Last 10 positions captured:\n');
  recent.forEach((p, i) => {
    const hasData = p.token0_amount && p.token1_amount ? '✅' : '❌';
    const time = new Date(p.captured_at).toLocaleTimeString();
    console.log(`${i + 1}. ${hasData} ${p.protocol} - ${p.pair}`);
    console.log(`   Captured: ${time}`);
    console.log(`   Token0: ${p.token0_amount || 'NULL'}, Token1: ${p.token1_amount || 'NULL'}`);
    console.log(`   Percentage: ${p.token0_percentage || 'NULL'}%\n`);
  });
}

checkRecent().catch(console.error);
