// Complete end-to-end test of AI Vision flow
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load credentials from .env.local file
const envPath = new URL('../.env.local', import.meta.url);
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const SUPABASE_URL = envContent.match(/SUPABASE_URL=(.+)/)?.[1] || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = envContent.match(/SUPABASE_ANON_KEY=(.+)/)?.[1] || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const ANTHROPIC_API_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1] || process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 Testing Complete AI Vision Flow\n');

// Step 1: Test Anthropic API connection
console.log('Step 1: Testing Anthropic API with dummy image...');

async function testAnthropicAPI() {
  // Create a minimal test image (1x1 red pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: testImageBase64
                }
              },
              {
                type: 'text',
                text: 'What color is this pixel? Answer in one word.'
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic API test FAILED:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Anthropic API test PASSED');
    console.log('   Response:', data.content[0].text.substring(0, 50));
    return true;
  } catch (error) {
    console.error('❌ Anthropic API test ERROR:', error.message);
    return false;
  }
}

// Step 2: Check database schema
console.log('\nStep 2: Checking database schema...');

async function checkDatabaseSchema() {
  try {
    // Check captures table has screenshot column
    const { data: capturesData, error: capturesError } = await supabase
      .from('captures')
      .select('id, screenshot')
      .limit(1);

    if (capturesError) {
      console.error('❌ Captures table check FAILED:', capturesError.message);
      return false;
    }

    console.log('✅ Captures table has screenshot column');

    // Check positions table has token columns
    const { data: positionsData, error: positionsError } = await supabase
      .from('positions')
      .select('id, token0_amount, token1_amount, token0_percentage, token1_percentage')
      .limit(1);

    if (positionsError) {
      console.error('❌ Positions table check FAILED:', positionsError.message);
      return false;
    }

    console.log('✅ Positions table has token breakdown columns');
    return true;
  } catch (error) {
    console.error('❌ Database schema check ERROR:', error.message);
    return false;
  }
}

// Step 3: Check for recent capture with screenshot
console.log('\nStep 3: Checking for recent capture with screenshot...');

async function checkRecentCapture() {
  try {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .not('screenshot', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Failed to fetch captures:', error.message);
      return null;
    }

    if (data.length === 0) {
      console.log('⚠️  No captures with screenshots found');
      console.log('   Please capture a position with the extension first');
      return null;
    }

    const capture = data[0];
    console.log('✅ Found capture with screenshot');
    console.log(`   Timestamp: ${capture.timestamp}`);
    console.log(`   Screenshot size: ${capture.screenshot.length} bytes`);

    return capture;
  } catch (error) {
    console.error('❌ Check recent capture ERROR:', error.message);
    return null;
  }
}

// Step 4: Test AI Vision extraction on real screenshot
console.log('\nStep 4: Testing AI Vision extraction...');

async function testAIVisionExtraction(capture) {
  try {
    const positions = capture.data?.content?.clmPositions?.positions || [];
    const testPosition = positions.find(p => p.token0Amount === null);

    if (!testPosition) {
      console.log('✅ All positions already have balance data');
      return true;
    }

    console.log(`   Testing extraction for: ${testPosition.pair}`);

    const pairMatch = testPosition.pair.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
    const token0 = pairMatch[1].replace(/0+$/, '');
    const token1 = pairMatch[2].replace(/0+$/, '');

    const base64Image = capture.screenshot.split(',')[1];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
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
                text: `Extract balance data for ${token0}/${token1}. Return only JSON: {"token0Amount": <number>, "token1Amount": <number>, "token0Percentage": <number>, "token1Percentage": <number>}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI Vision extraction FAILED:', errorText);
      return false;
    }

    const data = await response.json();
    const textContent = data.content.find(c => c.type === 'text');
    let responseText = textContent.text.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const balanceData = JSON.parse(responseText);

    console.log('✅ AI Vision extraction PASSED');
    console.log('   Extracted:', {
      token0: `${token0}: ${balanceData.token0Amount} (${balanceData.token0Percentage}%)`,
      token1: `${token1}: ${balanceData.token1Amount} (${balanceData.token1Percentage}%)`
    });

    // Test database update
    console.log('   Testing database update...');
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        token0_amount: balanceData.token0Amount,
        token1_amount: balanceData.token1Amount,
        token0_percentage: balanceData.token0Percentage,
        token1_percentage: balanceData.token1Percentage
      })
      .eq('pair', testPosition.pair)
      .eq('captured_at', capture.timestamp);

    if (updateError) {
      console.error('   ❌ Database update FAILED:', updateError.message);
      return false;
    }

    console.log('   ✅ Database update PASSED');
    return true;

  } catch (error) {
    console.error('❌ AI Vision extraction ERROR:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  let allPassed = true;

  const apiTest = await testAnthropicAPI();
  allPassed = allPassed && apiTest;

  const schemaTest = await checkDatabaseSchema();
  allPassed = allPassed && schemaTest;

  const capture = await checkRecentCapture();
  if (capture) {
    const visionTest = await testAIVisionExtraction(capture);
    allPassed = allPassed && visionTest;
  } else {
    console.log('\n⚠️  Skipping AI Vision test - no screenshot available');
    console.log('   Capture a position with the extension, then run this test again');
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('   The extension should work correctly now!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('   Check the errors above and fix before testing extension');
  }
  console.log('='.repeat(60));
}

runTests();
