// Test that AI correctly identifies which position is expanded
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPairMatching() {
  console.log('🧪 Testing that AI correctly identifies expanded position\n');

  // Get latest screenshot
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

  // Test with the WRONG pairs (should return error)
  const wrongPairs = ['SOL/USDC', 'PUMP/SOL', 'JLP/USDC', 'whETH/SOL'];

  console.log('Testing with WRONG pairs (should fail):');
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
                  text: `CRITICAL: Only extract data for the EXPANDED position showing detailed balance breakdown for ${token0}/${token1}. If you DO NOT see an expanded drawer for ${token0}/${token1} specifically, return: {"error": "Position ${token0}/${token1} not found in expanded state"}. Otherwise return: {"token0Amount": <number>, "token1Amount": <number>, "token0Percentage": <number>, "token1Percentage": <number>}`
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
        console.log(`  ✅ ${pair}: Correctly rejected (not expanded)`);
      } else {
        console.log(`  ❌ ${pair}: WRONG - extracted data when it shouldn't`);
        console.log(`     Got: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.log(`  ❌ ${pair}: Error - ${error.message}`);
    }
  }

  // Test with the RIGHT pair (should succeed)
  console.log('\nTesting with cbBTC/USDC (should succeed):');
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
                text: `CRITICAL: Only extract data for the EXPANDED position showing detailed balance breakdown for cbBTC/USDC. If you DO NOT see an expanded drawer for cbBTC/USDC specifically, return: {"error": "Position cbBTC/USDC not found in expanded state"}. Otherwise return: {"token0Amount": <number>, "token1Amount": <number>, "token0Percentage": <number>, "token1Percentage": <number>}`
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
      console.log(`  ❌ cbBTC/USDC: WRONG - rejected when it should extract`);
    } else {
      console.log(`  ✅ cbBTC/USDC: Correctly extracted`);
      console.log(`     cbBTC: ${result.token0Amount} (${result.token0Percentage}%)`);
      console.log(`     USDC: ${result.token1Amount} (${result.token1Percentage}%)`);
    }
  } catch (error) {
    console.log(`  ❌ cbBTC/USDC: Error - ${error.message}`);
  }
}

testPairMatching();
