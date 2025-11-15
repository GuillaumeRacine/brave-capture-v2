#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get one position to see the schema
const { data, error } = await supabase
  .from('positions')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error.message);
} else if (data && data.length > 0) {
  console.log('Schema (column names):');
  console.log(Object.keys(data[0]).sort().join('\n'));
} else {
  console.log('No positions in database');
}
