// Test that AI correctly identifies the expanded position using discovery approach
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mbshzqwskqvzuiegfmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ic2h6cXdza3F2enVpZWdmbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTExNTAsImV4cCI6MjA3NzE2NzE1MH0.8jTXu5BvOtUOITMmwb9TLda9NcYsFNO2OXcNWCKpqh4';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDiscoveryApproach() {
  console.log('🧪 Testing Discovery Approach - AI identifies which position is expanded\n');

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

  console.log('Testing NEW discovery approach (Claude tells us which pair is expanded):\n');

  const prompt = `You are analyzing a screenshot of a DeFi Orca portfolio page.

Look for an EXPANDED drawer/panel on the right side showing detailed balance breakdown.

If you see an expanded position drawer, identify:
1. Which token pair it shows (e.g., "cbBTC/USDC", "SOL/USDC", etc.)
2. The individual token amounts
3. The percentages for each token

Return ONLY this JSON (no markdown, no explanation):
{
  "pair": "<token0>/<token1>",
  "token0": "<token0 name>",
  "token1": "<token1 name>",
  "token0Amount": <number>,
  "token1Amount": <number>,
  "token0Percentage": <number>,
  "token1Percentage": <number>
}

If NO position drawer is expanded, return:
{"error": "No expanded position found"}

Example: If you see expanded drawer for cbBTC/USDC showing 0.035 cbBTC (37%) and 6385 USDC (63%), return:
{
  "pair": "cbBTC/USDC",
  "token0": "cbBTC",
  "token1": "USDC",
  "token0Amount": 0.035,
  "token1Amount": 6385,
  "token0Percentage": 37,
  "token1Percentage": 63
}`;

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
        max_tokens: 1024,
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
                text: prompt
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
      console.log(`❌ Test failed: ${result.error}`);
      console.log('   Make sure to expand a position before testing');
    } else {
      console.log(`✅ Discovery approach SUCCESS!`);
      console.log(`\n📊 AI correctly identified expanded position:`);
      console.log(`   Pair: ${result.pair}`);
      console.log(`   ${result.token0}: ${result.token0Amount} (${result.token0Percentage}%)`);
      console.log(`   ${result.token1}: ${result.token1Amount} (${result.token1Percentage}%)`);

      // Now test matching logic
      console.log(`\n🎯 Testing pair matching logic...`);

      const allPositions = capture.data?.content?.clmPositions?.positions || [];
      console.log(`   Positions in capture: ${allPositions.map(p => p.pair).join(', ')}`);

      const matchedPosition = allPositions.find(pos => {
        const posTokens = pos.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
        const extractedTokens = result.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
        return posTokens[0] === extractedTokens[0] && posTokens[1] === extractedTokens[1];
      });

      if (matchedPosition) {
        console.log(`   ✅ Matched to: ${matchedPosition.pair}`);
        console.log(`\n✅✅ COMPLETE SUCCESS - Data will go to correct position!`);
      } else {
        console.log(`   ❌ No match found for ${result.pair}`);
        console.log(`   This could be a name variant issue`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testDiscoveryApproach();
