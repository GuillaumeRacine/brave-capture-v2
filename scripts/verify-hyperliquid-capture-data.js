#!/usr/bin/env node
/**
 * Verify Hyperliquid Capture Data Against Screenshot
 *
 * This script compares the Hyperliquid position data in the CAPTURE record
 * (data.hyperliquidPositions.positions) against the actual screenshot data.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// User's screenshot data from Hyperliquid
const SCREENSHOT_DATA = [
  { symbol: 'ETH', leverage: '20x', size: '9.3792', usdValue: 29426.30, pnl: 2827.09, pnlPercent: 175.3 },
  { symbol: 'BTC', leverage: '20x', size: '0.28732', usdValue: 27287.07, pnl: 2672.85, pnlPercent: 178.4 },
  { symbol: 'SOL', leverage: '20x', size: '197.58', usdValue: 27226.52, pnl: 4815.41, pnlPercent: 300.6 },
  { symbol: 'STRK', leverage: '5x', size: '52,490.0', usdValue: 10368.87, pnl: -3200.41, pnlPercent: -223.2 },
  { symbol: 'APT', leverage: '10x', size: '2,736.00', usdValue: 7843.29, pnl: 930.77, pnlPercent: 106.1 },
  { symbol: 'ARB', leverage: '10x', size: '28,340.0', usdValue: 6739.82, pnl: 1335.89, pnlPercent: 165.4 },
  { symbol: 'SUI', leverage: '10x', size: '2,360.0', usdValue: 4066.04, pnl: 722.03, pnlPercent: 150.8 },
  { symbol: 'PUMP', leverage: '10x', size: '1,149,984', usdValue: 4008.84, pnl: 779.69, pnlPercent: 162.8 },
  { symbol: 'UNI', leverage: '10x', size: '337.0', usdValue: 2434.99, pnl: 478.38, pnlPercent: 164.2 }
];

function parseDbPnl(pnlString) {
  if (!pnlString || pnlString === '$0' || pnlString === '0') return 0;
  // Remove $ and commas, parse as float
  return parseFloat(pnlString.replace(/[$,]/g, ''));
}

function parseDbSize(sizeString) {
  if (!sizeString) return 0;
  // Remove commas, parse as float
  return parseFloat(String(sizeString).replace(/,/g, ''));
}

function formatCurrency(value) {
  const sign = value >= 0 ? '+' : '';
  return sign + '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function verifyHyperliquidData() {
  console.log('🔍 HYPERLIQUID CAPTURE DATA VERIFICATION REPORT');
  console.log('═'.repeat(80));
  console.log('');

  // Get the most recent Hyperliquid capture
  const { data: captures } = await supabase
    .from('captures')
    .select('*')
    .eq('protocol', 'Hyperliquid')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (!captures || captures.length === 0) {
    console.log('❌ No Hyperliquid captures found in database');
    return;
  }

  const latestCapture = captures[0];
  console.log('📸 LATEST CAPTURE INFO:');
  console.log(`   Capture ID: ${latestCapture.id}`);
  console.log(`   Timestamp:  ${new Date(latestCapture.timestamp).toLocaleString()}`);
  console.log(`   URL:        ${latestCapture.url}`);
  console.log('');

  // Check the raw table data
  const tableData = latestCapture.data?.content?.tables?.[0];
  if (tableData) {
    console.log('📋 RAW TABLE DATA FROM CAPTURE:');
    console.log('   Headers:', JSON.stringify(tableData.headers, null, 2));
    console.log('   Row 1 (ETH):', JSON.stringify(tableData.rows[1], null, 2));
    console.log('');
  }

  const dbPositions = latestCapture.data?.hyperliquidPositions?.positions || [];

  console.log(`📊 POSITIONS FOUND: ${dbPositions.length} in capture data, ${SCREENSHOT_DATA.length} in screenshot`);
  console.log('');

  if (dbPositions.length === 0) {
    console.log('❌ CRITICAL: No positions found in capture.data.hyperliquidPositions.positions');
    console.log('');
    console.log('This indicates the Hyperliquid parser is not working at all!');
    return;
  }

  // Track statistics
  let totalDiscrepancies = 0;
  let matchingSymbols = 0;
  let pnlMismatches = 0;
  let valueMismatches = 0;
  let sizeMismatches = 0;

  // Compare each position
  SCREENSHOT_DATA.forEach((screenshot, index) => {
    const dbPos = dbPositions.find(p => p.symbol === screenshot.symbol && p.leverage === screenshot.leverage);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`${index + 1}. ${screenshot.symbol} ${screenshot.leverage}`);
    console.log('─'.repeat(80));

    if (!dbPos) {
      console.log('❌ MISSING FROM CAPTURE DATA!');
      totalDiscrepancies++;
      return;
    }

    matchingSymbols++;
    let hasDiscrepancy = false;

    // Show raw DB data for debugging
    console.log('\n📦 RAW DATABASE DATA:');
    console.log(`   symbol:      ${dbPos.symbol}`);
    console.log(`   leverage:    ${dbPos.leverage}`);
    console.log(`   size:        ${dbPos.size}`);
    console.log(`   usdValue:    ${dbPos.usdValue}`);
    console.log(`   pnl:         "${dbPos.pnl}"`);
    console.log(`   pnlPercent:  "${dbPos.pnlPercent}"`);
    console.log('');

    // Compare Size
    const dbSize = parseDbSize(dbPos.size);
    const screenshotSize = parseDbSize(screenshot.size);
    const sizeDiff = Math.abs(dbSize - screenshotSize);
    const sizeTolerance = 0.01; // Allow small floating point differences

    if (sizeDiff > sizeTolerance) {
      console.log(`⚠️  SIZE MISMATCH:`);
      console.log(`   Database:   ${dbPos.size}`);
      console.log(`   Screenshot: ${screenshot.size}`);
      console.log(`   Difference: ${sizeDiff.toFixed(4)}`);
      sizeMismatches++;
      hasDiscrepancy = true;
    } else {
      console.log(`✅ Size: ${screenshot.size} (MATCH)`);
    }

    // Compare USD Value
    const valueDiff = Math.abs(dbPos.usdValue - screenshot.usdValue);
    const valueTolerance = 100; // Allow $100 difference (price fluctuations)

    if (valueDiff > valueTolerance) {
      console.log(`⚠️  USD VALUE MISMATCH:`);
      console.log(`   Database:   ${formatCurrency(dbPos.usdValue)}`);
      console.log(`   Screenshot: ${formatCurrency(screenshot.usdValue)}`);
      console.log(`   Difference: ${formatCurrency(valueDiff)}`);
      valueMismatches++;
      hasDiscrepancy = true;
    } else {
      console.log(`✅ USD Value: ${formatCurrency(screenshot.usdValue)} (MATCH within tolerance)`);
    }

    // Compare PnL - THIS IS THE CRITICAL ONE
    const dbPnl = parseDbPnl(dbPos.pnl);
    const screenshotPnl = screenshot.pnl;
    const pnlDiff = Math.abs(dbPnl - screenshotPnl);
    const pnlTolerance = 10; // Allow $10 difference

    if (pnlDiff > pnlTolerance) {
      console.log(`🔴 PNL MISMATCH (CRITICAL):`);
      console.log(`   Database:   "${dbPos.pnl}" → parsed: ${formatCurrency(dbPnl)}`);
      console.log(`   Screenshot: ${formatCurrency(screenshotPnl)} (${screenshot.pnlPercent > 0 ? '+' : ''}${screenshot.pnlPercent}%)`);
      console.log(`   Difference: ${formatCurrency(pnlDiff)}`);
      pnlMismatches++;
      hasDiscrepancy = true;
    } else {
      console.log(`✅ PnL: ${formatCurrency(screenshotPnl)} (MATCH)`);
    }

    // Compare PnL Percentage
    const dbPnlPercent = parseDbPnl(dbPos.pnlPercent);
    const pnlPercentDiff = Math.abs(dbPnlPercent - screenshot.pnlPercent);
    const pnlPercentTolerance = 5; // Allow 5% difference

    if (pnlPercentDiff > pnlPercentTolerance) {
      console.log(`⚠️  PNL PERCENT MISMATCH:`);
      console.log(`   Database:   "${dbPos.pnlPercent}" → parsed: ${dbPnlPercent}%`);
      console.log(`   Screenshot: ${screenshot.pnlPercent}%`);
      console.log(`   Difference: ${pnlPercentDiff.toFixed(1)}%`);
      hasDiscrepancy = true;
    } else {
      console.log(`✅ PnL %: ${screenshot.pnlPercent}% (MATCH)`);
    }

    if (hasDiscrepancy) {
      totalDiscrepancies++;
    }
  });

  // Print Summary
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📋 SUMMARY REPORT');
  console.log('═'.repeat(80));
  console.log(`Total Positions in Screenshot: ${SCREENSHOT_DATA.length}`);
  console.log(`Total Positions in Capture:    ${dbPositions.length}`);
  console.log(`Matching Symbols:              ${matchingSymbols}`);
  console.log(`Missing from Capture:          ${SCREENSHOT_DATA.length - matchingSymbols}`);
  console.log('');
  console.log('🔴 CRITICAL ISSUES:');
  console.log(`   PnL Mismatches:             ${pnlMismatches} / ${SCREENSHOT_DATA.length}`);
  console.log('');
  console.log('⚠️  OTHER DISCREPANCIES:');
  console.log(`   USD Value Mismatches:       ${valueMismatches} / ${SCREENSHOT_DATA.length}`);
  console.log(`   Size Mismatches:            ${sizeMismatches} / ${SCREENSHOT_DATA.length}`);
  console.log('');
  console.log(`Total Positions with Issues:   ${totalDiscrepancies} / ${SCREENSHOT_DATA.length}`);
  console.log('');

  // Diagnosis
  console.log('═'.repeat(80));
  console.log('🔬 DIAGNOSIS & ROOT CAUSE ANALYSIS');
  console.log('═'.repeat(80));

  if (pnlMismatches > 0) {
    console.log('\n🔴 CRITICAL: PNL DATA PARSING FAILURE DETECTED');
    console.log('');
    console.log('Root Cause:');
    console.log('  The Hyperliquid parser is NOT correctly extracting PnL values.');
    console.log('  Values are showing as "$0" or "0" instead of actual PnL amounts.');
    console.log('');
    console.log('Affected Fields:');
    console.log('  - pnl (dollar amount)');
    console.log('  - pnlPercent (ROE %)');
    console.log('');
    console.log('Impact:');
    console.log('  - Dashboard displays ZERO PnL for all positions');
    console.log('  - Users see completely incorrect profit/loss data');
    console.log('  - Total portfolio PnL calculation is wrong');
    console.log('');
    console.log('Expected Format (from screenshot):');
    console.log('  "+$2,827.09 (+175.3%)" - Both dollar amount and % in one cell');
    console.log('');
    console.log('Likely Cause:');
    console.log('  The content.js DOM parser is reading the table but the "PNL (ROE %)"');
    console.log('  column parsing logic in background.js (parseHyperliquidTable) is');
    console.log('  failing to extract the values correctly.');
    console.log('');
  }

  if (totalDiscrepancies === 0) {
    console.log('\n✅ ALL DATA MATCHES! No discrepancies found.');
  } else {
    console.log('\n🔍 FILES TO CHECK:');
    console.log('  1. /Users/gui/Brave-Capture/background.js');
    console.log('     → parseHyperliquidTable() function');
    console.log('     → Look for PnL column parsing logic');
    console.log('');
    console.log('  2. /Users/gui/Brave-Capture/content.js');
    console.log('     → Table extraction in extractPageData()');
    console.log('     → Verify table structure is correct');
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(80));
  console.log('');
  console.log('1. IMMEDIATE FIX - Update parseHyperliquidTable() in background.js:');
  console.log('   - Locate the PnL column (header contains "PNL")');
  console.log('   - Parse format: "+$2,827.09 (+175.3%)"');
  console.log('   - Extract dollar amount: match(/[+-]?\\$[\\d,]+\\.\\d+/)');
  console.log('   - Extract percentage: match(/\\(([+-]?[\\d.]+)%\\)/)');
  console.log('   - Handle both positive and negative values');
  console.log('');
  console.log('2. Test the fix:');
  console.log('   - Reload the extension');
  console.log('   - Capture Hyperliquid portfolio again');
  console.log('   - Run this script to verify');
  console.log('');
  console.log('3. Consider using AI Vision:');
  console.log('   - The screenshot contains all the correct data');
  console.log('   - AI vision extraction might be more reliable');
  console.log('   - Check if ai-vision.js handles Hyperliquid correctly');
  console.log('');
}

verifyHyperliquidData().catch(console.error);
