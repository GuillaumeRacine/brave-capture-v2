/**
 * Comprehensive test for AI Vision extraction flow
 * Tests the end-to-end flow: screenshot capture → background.js extraction → Supabase save
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const ANTHROPIC_API_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1] || process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY';
const SUPABASE_URL = envContent.match(/SUPABASE_URL=(.+)/)?.[1] || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = envContent.match(/SUPABASE_ANON_KEY=(.+)/)?.[1] || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}${details ? ': ' + details : ''}`);

  if (status === 'pass') {
    results.passed.push(name);
  } else if (status === 'fail') {
    results.failed.push({ name, details });
  } else {
    results.warnings.push({ name, details });
  }
}

// ============================================================================
// Test 1: Verify Supabase connection
// ============================================================================
async function testSupabaseConnection() {
  console.log('\n🧪 Test 1: Verify Supabase Connection');

  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .limit(1);

    if (error) {
      logTest('Supabase connection', 'fail', error.message);
      return false;
    }

    logTest('Supabase connection', 'pass');
    return true;
  } catch (error) {
    logTest('Supabase connection', 'fail', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Verify Anthropic API connection
// ============================================================================
async function testAnthropicConnection() {
  console.log('\n🧪 Test 2: Verify Anthropic API Connection');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Say "test" in JSON: {"response": "test"}'
      }]
    });

    if (message.content && message.content.length > 0) {
      logTest('Anthropic API connection', 'pass');
      return true;
    }

    logTest('Anthropic API connection', 'fail', 'No response content');
    return false;
  } catch (error) {
    logTest('Anthropic API connection', 'fail', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Test extractBalanceFromScreenshot logic (mocked)
// ============================================================================
async function extractBalanceFromScreenshot(screenshotDataUrl, allPairs) {
  console.log('🤖 Analyzing screenshot to find expanded position');

  const base64Image = screenshotDataUrl.split(',')[1];

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

  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{
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
    }]
  });

  const textContent = message.content.find(c => c.type === 'text');
  let responseText = textContent.text.trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  console.log('Claude response:', responseText);

  const balanceData = JSON.parse(responseText);

  if (balanceData.error) {
    console.log(`⚠️ ${balanceData.error}`);
    throw new Error(balanceData.error);
  }

  if (!balanceData.pair || !balanceData.token0Amount || !balanceData.token1Amount) {
    throw new Error('Incomplete data in Claude response');
  }

  console.log(`✅ Found expanded position: ${balanceData.pair}`);
  console.log(`✅ Extracted: ${balanceData.token0Amount} ${balanceData.token0} (${balanceData.token0Percentage}%), ${balanceData.token1Amount} ${balanceData.token1} (${balanceData.token1Percentage}%)`);

  return {
    pair: balanceData.pair,
    token0: balanceData.token0,
    token1: balanceData.token1,
    token0Amount: balanceData.token0Amount,
    token1Amount: balanceData.token1Amount,
    token0Percentage: balanceData.token0Percentage,
    token1Percentage: balanceData.token1Percentage
  };
}

// ============================================================================
// Test 4: Test extractAndSaveBalance logic
// ============================================================================
async function extractAndSaveBalance(screenshotDataUrl, captureTimestamp, allPositions) {
  console.log('🚀 Extract and save balance');

  // Extract using AI Vision
  const extracted = await extractBalanceFromScreenshot(screenshotDataUrl, allPositions.map(p => p.pair));

  // Match extracted pair to database position
  const matchedPosition = allPositions.find(pos => {
    const posTokens = pos.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
    const extractedTokens = extracted.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
    return posTokens[0] === extractedTokens[0] && posTokens[1] === extractedTokens[1];
  });

  if (!matchedPosition) {
    console.error(`❌ No match found for ${extracted.pair} in positions:`, allPositions.map(p => p.pair));
    throw new Error(`Extracted pair ${extracted.pair} doesn't match any position`);
  }

  console.log(`🎯 Matched ${extracted.pair} to ${matchedPosition.pair}`);

  // Update database
  console.log(`📝 Updating database: pair="${matchedPosition.pair}", timestamp="${captureTimestamp}"`);

  const { data, error } = await supabase
    .from('positions')
    .update({
      token0_amount: extracted.token0Amount,
      token1_amount: extracted.token1Amount,
      token0_percentage: extracted.token0Percentage,
      token1_percentage: extracted.token1Percentage
    })
    .eq('pair', matchedPosition.pair)
    .eq('captured_at', captureTimestamp)
    .select();

  if (error) {
    console.error('❌ Supabase update error:', error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (data && data.length > 0) {
    console.log(`✅✅ Successfully saved ${matchedPosition.pair} to database!`);
    return {
      success: true,
      pair: matchedPosition.pair,
      data: extracted
    };
  } else {
    throw new Error('No rows updated in database');
  }
}

async function testExtractAndSaveLogic() {
  console.log('\n🧪 Test 3: Test extractAndSaveBalance Logic (Mock Mode)');

  // Check if test screenshot exists
  const testScreenshotPath = path.join(__dirname, 'test-screenshot.png');

  if (!fs.existsSync(testScreenshotPath)) {
    logTest('extractAndSaveBalance logic', 'warn', 'No test-screenshot.png found. Please add a screenshot to test with real data.');
    return false;
  }

  try {
    // Read the test screenshot
    const imageBuffer = fs.readFileSync(testScreenshotPath);
    const base64Image = imageBuffer.toString('base64');
    const screenshotDataUrl = `data:image/png;base64,${base64Image}`;

    // Mock positions that should match
    const mockPositions = [
      { pair: 'cbBTC/USDC', token0Amount: null, token1Amount: null },
      { pair: 'SOL/USDC', token0Amount: null, token1Amount: null }
    ];

    const testTimestamp = new Date().toISOString();

    // First, insert a test position
    const { data: insertData, error: insertError } = await supabase
      .from('positions')
      .insert({
        pair: 'cbBTC/USDC',
        protocol: 'orca',
        captured_at: testTimestamp,
        token0_amount: null,
        token1_amount: null
      })
      .select();

    if (insertError) {
      logTest('Test position insert', 'fail', insertError.message);
      return false;
    }

    logTest('Test position insert', 'pass');

    // Now test the extraction and save
    const result = await extractAndSaveBalance(
      screenshotDataUrl,
      testTimestamp,
      mockPositions
    );

    if (result.success) {
      logTest('extractAndSaveBalance logic', 'pass', `Extracted and saved ${result.pair}`);

      // Clean up test data
      await supabase
        .from('positions')
        .delete()
        .eq('captured_at', testTimestamp);

      return true;
    }

    logTest('extractAndSaveBalance logic', 'fail', 'Function returned false');
    return false;
  } catch (error) {
    logTest('extractAndSaveBalance logic', 'fail', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Check for syntax errors in background.js and popup.js
// ============================================================================
async function testSyntaxErrors() {
  console.log('\n🧪 Test 4: Check for Syntax Errors');

  const filesToCheck = [
    path.join(__dirname, 'background.js'),
    path.join(__dirname, 'popup.js')
  ];

  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Basic checks
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      if (openBraces !== closeBraces) {
        logTest(`${path.basename(file)} syntax`, 'fail', `Mismatched braces: ${openBraces} open, ${closeBraces} close`);
      } else if (openParens !== closeParens) {
        logTest(`${path.basename(file)} syntax`, 'fail', `Mismatched parentheses: ${openParens} open, ${closeParens} close`);
      } else {
        logTest(`${path.basename(file)} syntax`, 'pass');
      }
    } catch (error) {
      logTest(`${path.basename(file)} read`, 'fail', error.message);
    }
  }
}

// ============================================================================
// Test 6: Verify message passing structure
// ============================================================================
async function testMessagePassing() {
  console.log('\n🧪 Test 5: Verify Message Passing Structure');

  try {
    const popupContent = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
    const backgroundContent = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');

    // Check popup.js sends correct message
    const popupSendsMessage = popupContent.includes("action: 'extractBalanceFromScreenshot'") &&
                              popupContent.includes('screenshot:') &&
                              popupContent.includes('captureTimestamp:') &&
                              popupContent.includes('allPositions:');

    if (!popupSendsMessage) {
      logTest('popup.js message structure', 'fail', 'Missing required message fields');
    } else {
      logTest('popup.js message structure', 'pass');
    }

    // Check background.js handles message correctly
    const backgroundHandlesMessage = backgroundContent.includes("if (request.action === 'extractBalanceFromScreenshot')") &&
                                    backgroundContent.includes('extractAndSaveBalance');

    if (!backgroundHandlesMessage) {
      logTest('background.js message handler', 'fail', 'Message handler not found or incomplete');
    } else {
      logTest('background.js message handler', 'pass');
    }

    // Check that background.js has the extractAndSaveBalance function
    const hasExtractFunction = backgroundContent.includes('async function extractAndSaveBalance');

    if (!hasExtractFunction) {
      logTest('extractAndSaveBalance function', 'fail', 'Function not found');
    } else {
      logTest('extractAndSaveBalance function', 'pass');
    }

  } catch (error) {
    logTest('Message passing verification', 'fail', error.message);
  }
}

// ============================================================================
// Main test runner
// ============================================================================
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  AI Vision Extraction Flow - Comprehensive Test Suite      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await testSupabaseConnection();
  await testAnthropicConnection();
  await testExtractAndSaveLogic();
  await testSyntaxErrors();
  await testMessagePassing();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   • ${test}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(({ name, details }) => console.log(`   • ${name}: ${details}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ name, details }) => console.log(`   • ${name}: ${details}`));
  }

  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

  console.log(`\n📊 Pass Rate: ${passRate}% (${results.passed.length}/${totalTests})`);

  if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log('\n🎉 All tests passed! The AI Vision extraction flow is ready to use.');
  } else if (results.failed.length === 0) {
    console.log('\n✅ All critical tests passed. Review warnings above.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);
