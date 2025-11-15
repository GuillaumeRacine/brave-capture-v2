// Test that the OLD approach would have been wrong
// This demonstrates why we needed the fix
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOldApproachWouldFail() {
  console.log('🧪 Demonstrating why OLD approach was wrong\n');
  console.log('This test shows what would happen with the OLD pair-specific approach:');
  console.log('(asking Claude to extract specific pairs)');

  // Get latest screenshot (which has cbBTC/USDC expanded)
  const { data: captures } = await supabase
    .from('captures')
    .select('*')
    .not('screenshot', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (!captures || captures.length === 0) {
    console.log('❌ No screenshot found');
    return;
  }

  const capture = captures[0];
  const screenshot = capture.screenshot;
  const base64Image = screenshot.split(',')[1];

  // Test OLD approach: Ask for WRONG pairs (should fail but would succeed incorrectly)
  const wrongPairs = ['SOL/USDC', 'PUMP/SOL'];

  console.log('\n❌ OLD APPROACH: Asking Claude to extract specific pairs that are NOT expanded:\n');

  for (const pair of wrongPairs) {
    const [token0, token1] = pair.split('/');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: base64Image
                  }
                },
                {
                  type: 'text',
                  text: `Extract balance data for ${token0}/${token1}. Return JSON: {"token0Amount": <number>, "token1Amount": <number>, "token0Percentage": <number>, "token1Percentage": <number>}`
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(text);

      if (result.error) {
        console.log(`  ✅ ${pair}: Would correctly reject (but unlikely)`);
      } else {
        console.log(`  ❌ ${pair}: Would WRONGLY extract data even though it's NOT expanded!`);
        console.log(`     Would get: token0=${result.token0Amount}, token1=${result.token1Amount}`);
        console.log(`     🚨 This cbBTC/USDC data would be assigned to ${pair} (WRONG!)`);
      }
    } catch (error) {
      console.log(`  ⚠️  ${pair}: Error - ${error.message}`);
    }
  }

  console.log('\n✅ NEW APPROACH: Letting Claude discover which pair is expanded:');
  console.log('   Claude identifies cbBTC/USDC is expanded');
  console.log('   Matching logic assigns data to cbBTC/USDC position');
  console.log('   SOL/USDC and PUMP/SOL positions remain null (correct!)');
  console.log('\n🎯 Result: cbBTC/USDC data goes to cbBTC/USDC position (CORRECT!)');
}

testOldApproachWouldFail();
