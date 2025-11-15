#!/usr/bin/env node

/**
 * Automated Quality Control Workflow
 *
 * This script chains multiple validation agents to automatically detect and fix
 * data quality issues when new screenshots/captures come in.
 *
 * Workflow:
 * 1. Validate Capture Data - Check raw capture data integrity
 * 2. Detect Issues - Compare database vs capture data, find anomalies
 * 3. Auto-Fix - Apply fixes for known issues
 * 4. Verify - Confirm all issues resolved
 *
 * Usage:
 *   node scripts/auto-qc-workflow.js [captureId]
 *   node scripts/auto-qc-workflow.js --all  # Check all recent captures
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(configPath)) {
  console.error('❌ .env.local not found. Please create it with your Supabase credentials.');
  process.exit(1);
}

const envContent = fs.readFileSync(configPath, 'utf8');
const SUPABASE_URL = envContent.match(/SUPABASE_URL=(.+)/)?.[1];
const SUPABASE_ANON_KEY = envContent.match(/SUPABASE_ANON_KEY=(.+)/)?.[1];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Known CLM protocols
const CLM_PROTOCOLS = ['Orca', 'Raydium', 'Aerodrome', 'Cetus', 'Hyperion', 'PancakeSwap', 'Uniswap', 'Ekubo', 'Beefy'];

// Known hedge/collateral protocols
const HEDGE_PROTOCOLS = ['Hyperliquid', 'Morpho', 'Aave'];

/**
 * AGENT 1: Validate Capture Data
 * Checks if capture data is complete and properly formatted
 */
async function validateCaptureData(captureId) {
  console.log('\n🔍 AGENT 1: Validating Capture Data');
  console.log('━'.repeat(60));

  const { data: capture, error } = await supabase
    .from('captures')
    .select('*')
    .eq('id', captureId)
    .single();

  if (error) {
    console.error('❌ Failed to fetch capture:', error);
    return { valid: false, errors: [error.message] };
  }

  const errors = [];
  const warnings = [];

  // Check required fields
  if (!capture.url) warnings.push('Missing URL');
  if (!capture.protocol) errors.push('Missing protocol');
  if (!capture.timestamp) errors.push('Missing timestamp');
  if (!capture.screenshot) warnings.push('Missing screenshot - AI validation unavailable');

  // Check protocol is recognized
  const allProtocols = [...CLM_PROTOCOLS, ...HEDGE_PROTOCOLS];
  if (capture.protocol && !allProtocols.includes(capture.protocol)) {
    warnings.push(`Unknown protocol: ${capture.protocol}`);
  }

  // Check capture data structure
  if (!capture.data) {
    errors.push('Missing capture.data object');
  } else {
    if (!capture.data.content) warnings.push('Missing capture.data.content');
    if (!capture.data.content?.clmPositions) warnings.push('Missing CLM positions data');
  }

  console.log(`\n📊 Capture ID: ${captureId}`);
  console.log(`   Protocol: ${capture.protocol}`);
  console.log(`   URL: ${capture.url}`);
  console.log(`   Timestamp: ${capture.timestamp}`);

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`   - ${e}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Capture data is valid');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    capture
  };
}

/**
 * AGENT 2: Detect Issues
 * Analyzes positions for data quality issues
 */
async function detectIssues(captureId) {
  console.log('\n\n🔎 AGENT 2: Detecting Data Quality Issues');
  console.log('━'.repeat(60));

  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('capture_id', captureId);

  if (error) {
    console.error('❌ Failed to fetch positions:', error);
    return { issues: [], positions: [] };
  }

  const issues = [];

  console.log(`\n📊 Found ${positions.length} positions for capture ${captureId}\n`);

  positions.forEach((pos, idx) => {
    console.log(`Position ${idx + 1}: ${pos.pair || 'UNKNOWN'} (${pos.protocol})`);

    // Issue 1: Generic "Token 0/Token 1" names
    if (!pos.token0 || !pos.token1 || pos.token0 === '' || pos.token1 === '') {
      if (pos.pair && pos.pair.includes('/')) {
        issues.push({
          type: 'MISSING_TOKEN_NAMES',
          severity: 'HIGH',
          position: pos,
          message: `Missing token0/token1 for ${pos.pair} - using fallback "Token 0/Token 1"`,
          autoFixable: true
        });
        console.log('   ⚠️  Issue: Missing token names');
      }
    }

    // Issue 2: Wrong protocol categorization
    const isCLMProtocol = CLM_PROTOCOLS.includes(pos.protocol);
    const isHedgeProtocol = HEDGE_PROTOCOLS.includes(pos.protocol);

    if (isHedgeProtocol) {
      issues.push({
        type: 'WRONG_CATEGORY',
        severity: 'HIGH',
        position: pos,
        message: `${pos.protocol} position appearing in CLM section - should be in Hedges/Collateral`,
        autoFixable: false,  // Already fixed in dashboard.js filter
        note: 'Fixed by protocol filter in loadCLMPositions()'
      });
      console.log(`   ⚠️  Issue: Hedge protocol (${pos.protocol}) - will be filtered out`);
    }

    // Issue 3: Missing token amounts with data available
    const hasTokenData = pos.token0_amount !== null && pos.token1_amount !== null;
    const hasBalance = pos.balance !== null && pos.balance > 0;

    if (hasBalance && !hasTokenData) {
      issues.push({
        type: 'MISSING_TOKEN_DATA',
        severity: 'MEDIUM',
        position: pos,
        message: `Position has balance ($${pos.balance}) but missing token amounts - using 50/50 fallback`,
        autoFixable: false,
        note: 'Requires AI re-extraction from screenshot'
      });
      console.log(`   ⚠️  Issue: Missing token amounts (using 50/50 fallback)`);
    }

    // Issue 4: Percentage validation
    if (hasTokenData && pos.token0_percentage !== null && pos.token1_percentage !== null) {
      const percentageSum = pos.token0_percentage + pos.token1_percentage;
      if (Math.abs(percentageSum - 100) > 0.5) {
        issues.push({
          type: 'INVALID_PERCENTAGES',
          severity: 'LOW',
          position: pos,
          message: `Percentages don't sum to 100% (${percentageSum}%)`,
          autoFixable: true
        });
        console.log(`   ⚠️  Issue: Invalid percentages (sum: ${percentageSum}%)`);
      }
    }

    // Issue 5: Balance validation
    if (hasTokenData && pos.token0_value !== null && pos.token1_value !== null && pos.balance !== null) {
      const calculatedBalance = pos.token0_value + pos.token1_value;
      const diff = Math.abs(calculatedBalance - pos.balance);
      if (diff > 1) {  // Allow $1 rounding difference
        issues.push({
          type: 'BALANCE_MISMATCH',
          severity: 'MEDIUM',
          position: pos,
          message: `Balance mismatch: reported $${pos.balance}, calculated $${calculatedBalance} (diff: $${diff})`,
          autoFixable: false
        });
        console.log(`   ⚠️  Issue: Balance mismatch ($${diff} difference)`);
      }
    }

    if (issues.filter(i => i.position.id === pos.id).length === 0) {
      console.log('   ✅ No issues detected');
    }

    console.log('');
  });

  console.log(`\n📋 Summary: ${issues.length} issues detected`);

  const highSeverity = issues.filter(i => i.severity === 'HIGH').length;
  const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowSeverity = issues.filter(i => i.severity === 'LOW').length;

  if (highSeverity > 0) console.log(`   🔴 HIGH: ${highSeverity}`);
  if (mediumSeverity > 0) console.log(`   🟡 MEDIUM: ${mediumSeverity}`);
  if (lowSeverity > 0) console.log(`   🟢 LOW: ${lowSeverity}`);

  const autoFixable = issues.filter(i => i.autoFixable).length;
  if (autoFixable > 0) {
    console.log(`\n🔧 ${autoFixable} issues can be auto-fixed`);
  }

  return { issues, positions };
}

/**
 * AGENT 3: Auto-Fix Issues
 * Automatically fixes detected issues when possible
 */
async function autoFixIssues(issues, positions) {
  console.log('\n\n🔧 AGENT 3: Auto-Fixing Issues');
  console.log('━'.repeat(60));

  const fixableIssues = issues.filter(i => i.autoFixable);

  if (fixableIssues.length === 0) {
    console.log('\n✅ No auto-fixable issues found');
    return { fixed: 0, errors: [] };
  }

  console.log(`\nAttempting to fix ${fixableIssues.length} issues...\n`);

  let fixed = 0;
  const errors = [];

  for (const issue of fixableIssues) {
    const pos = issue.position;

    try {
      if (issue.type === 'MISSING_TOKEN_NAMES') {
        // Extract token names from pair
        const pairParts = (pos.pair || '').split('/');
        const token0 = (pairParts[0] || '').trim();
        const token1 = (pairParts[1] || '').trim();

        if (token0 && token1) {
          const { error } = await supabase
            .from('positions')
            .update({ token0, token1 })
            .eq('id', pos.id);

          if (error) {
            console.error(`❌ Failed to fix ${pos.pair}:`, error.message);
            errors.push({ issue, error: error.message });
          } else {
            console.log(`✅ Fixed: ${pos.pair} → token0: "${token0}", token1: "${token1}"`);
            fixed++;
          }
        }
      }

      if (issue.type === 'INVALID_PERCENTAGES') {
        // Recalculate percentages from token values
        if (pos.token0_value !== null && pos.token1_value !== null) {
          const total = pos.token0_value + pos.token1_value;
          if (total > 0) {
            const token0_percentage = (pos.token0_value / total) * 100;
            const token1_percentage = (pos.token1_value / total) * 100;

            const { error } = await supabase
              .from('positions')
              .update({
                token0_percentage: Math.round(token0_percentage * 10) / 10,
                token1_percentage: Math.round(token1_percentage * 10) / 10
              })
              .eq('id', pos.id);

            if (error) {
              console.error(`❌ Failed to fix percentages for ${pos.pair}:`, error.message);
              errors.push({ issue, error: error.message });
            } else {
              console.log(`✅ Fixed percentages for ${pos.pair}: ${token0_percentage.toFixed(1)}% / ${token1_percentage.toFixed(1)}%`);
              fixed++;
            }
          }
        }
      }

    } catch (err) {
      console.error(`❌ Exception fixing issue:`, err);
      errors.push({ issue, error: err.message });
    }
  }

  console.log(`\n📊 Fixed ${fixed}/${fixableIssues.length} issues`);

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} errors occurred during fixing`);
  }

  return { fixed, errors };
}

/**
 * AGENT 4: Verify Fixes
 * Re-check positions to confirm all fixable issues resolved
 */
async function verifyFixes(captureId, originalIssues) {
  console.log('\n\n✅ AGENT 4: Verifying Fixes');
  console.log('━'.repeat(60));

  // Re-run issue detection
  const { issues: newIssues } = await detectIssues(captureId);

  const fixableIssueTypes = originalIssues.filter(i => i.autoFixable).map(i => i.type);
  const remainingFixableIssues = newIssues.filter(i => i.autoFixable && fixableIssueTypes.includes(i.type));

  console.log(`\n📊 Verification Results:`);
  console.log(`   Original auto-fixable issues: ${originalIssues.filter(i => i.autoFixable).length}`);
  console.log(`   Remaining auto-fixable issues: ${remainingFixableIssues.length}`);

  if (remainingFixableIssues.length === 0) {
    console.log('\n✅ All auto-fixable issues have been resolved!');
  } else {
    console.log('\n⚠️  Some issues remain:');
    remainingFixableIssues.forEach(issue => {
      console.log(`   - ${issue.message}`);
    });
  }

  // Summary of non-fixable issues
  const nonFixableIssues = newIssues.filter(i => !i.autoFixable);
  if (nonFixableIssues.length > 0) {
    console.log(`\n📝 ${nonFixableIssues.length} non-fixable issues (require manual intervention):`);
    nonFixableIssues.forEach(issue => {
      console.log(`   - ${issue.message}`);
      if (issue.note) console.log(`     Note: ${issue.note}`);
    });
  }

  return {
    success: remainingFixableIssues.length === 0,
    remainingIssues: newIssues
  };
}

/**
 * Main QC Workflow
 */
async function runQCWorkflow(captureId) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       AUTOMATED QUALITY CONTROL WORKFLOW                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nProcessing Capture ID: ${captureId}\n`);

  try {
    // AGENT 1: Validate
    const validation = await validateCaptureData(captureId);
    if (!validation.valid) {
      console.error('\n❌ Capture data validation failed. Cannot proceed with QC.');
      return { success: false, stage: 'validation' };
    }

    // AGENT 2: Detect
    const { issues, positions } = await detectIssues(captureId);

    // AGENT 3: Auto-Fix
    const { fixed, errors } = await autoFixIssues(issues, positions);

    // AGENT 4: Verify
    const verification = await verifyFixes(captureId, issues);

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    QC WORKFLOW COMPLETE                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`   Capture ID: ${captureId}`);
    console.log(`   Issues detected: ${issues.length}`);
    console.log(`   Issues fixed: ${fixed}`);
    console.log(`   Remaining issues: ${verification.remainingIssues.length}`);
    console.log(`   Status: ${verification.success ? '✅ PASSED' : '⚠️  NEEDS ATTENTION'}\n`);

    return {
      success: verification.success,
      captureId,
      validation,
      issues,
      fixed,
      errors,
      verification
    };

  } catch (error) {
    console.error('\n❌ QC Workflow failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process multiple recent captures
 */
async function runQCOnRecentCaptures(limit = 5) {
  console.log(`\n🔄 Running QC on ${limit} most recent captures...\n`);

  const { data: captures, error } = await supabase
    .from('captures')
    .select('id, timestamp, protocol')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Failed to fetch recent captures:', error);
    return;
  }

  console.log(`Found ${captures.length} recent captures:\n`);
  captures.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.id} - ${c.protocol} (${c.timestamp})`);
  });

  const results = [];
  for (const capture of captures) {
    const result = await runQCWorkflow(capture.id);
    results.push(result);
    console.log('\n' + '─'.repeat(60) + '\n');
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              BATCH QC WORKFLOW COMPLETE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Batch Summary:`);
  console.log(`   Total captures processed: ${results.length}`);
  console.log(`   Passed QC: ${results.filter(r => r.success).length}`);
  console.log(`   Need attention: ${results.filter(r => !r.success).length}`);

  const totalFixed = results.reduce((sum, r) => sum + (r.fixed || 0), 0);
  console.log(`   Total issues fixed: ${totalFixed}\n`);
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n📖 Usage:');
  console.log('   node scripts/auto-qc-workflow.js <captureId>    # Check specific capture');
  console.log('   node scripts/auto-qc-workflow.js --all          # Check 5 most recent captures');
  console.log('   node scripts/auto-qc-workflow.js --all 10       # Check 10 most recent captures\n');
  process.exit(0);
}

if (args[0] === '--all') {
  const limit = parseInt(args[1]) || 5;
  runQCOnRecentCaptures(limit).then(() => process.exit(0));
} else {
  const captureId = args[0];
  runQCWorkflow(captureId).then(() => process.exit(0));
}

export {
  runQCWorkflow,
  runQCOnRecentCaptures,
  validateCaptureData,
  detectIssues,
  autoFixIssues,
  verifyFixes
};
