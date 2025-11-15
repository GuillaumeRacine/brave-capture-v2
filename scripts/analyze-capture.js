#!/usr/bin/env node
/**
 * Capture Analyzer
 *
 * Summarizes captured CLM data and flags potential anomalies.
 * Optionally uses Anthropic to generate a concise analysis when API key is set.
 *
 * Usage:
 *   node scripts/analyze-capture.js <path-to-capture.json>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

let Anthropic = null;
try {
  // Lazy import to avoid hard requirement if no key
  const mod = await import('@anthropic-ai/sdk');
  Anthropic = mod.default;
} catch (_) {}

loadEnv({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(p) {
  const text = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(text);
  return Array.isArray(data) ? data[0] : data;
}

function summarizeCapture(capture) {
  const clm = capture?.data?.content?.clmPositions;
  const positions = clm?.positions || [];

  const summary = {
    protocol: capture.protocol || capture?.data?.protocol || 'unknown',
    timestamp: capture.timestamp,
    url: capture.url,
    totalPositions: positions.length,
    totalValue: 0,
    inRange: 0,
    outOfRange: 0,
    missingTokenBreakdown: 0,
    topPairs: [],
    anomalies: [],
  };

  // Compute totals and flags
  const pairs = [];
  positions.forEach((p) => {
    const balance = Number(p.balance) || 0;
    summary.totalValue += balance;
    if (p.inRange) summary.inRange += 1; else summary.outOfRange += 1;
    if (p.token0Amount == null || p.token1Amount == null) summary.missingTokenBreakdown += 1;

    if (p.apy && p.apy > 10000) summary.anomalies.push(`${p.pair}: APY extremely high (${p.apy}%)`);
    if (p.rangeMin != null && p.rangeMax != null && p.rangeMin > p.rangeMax) summary.anomalies.push(`${p.pair}: rangeMin > rangeMax`);
    if (p.balance != null && p.balance < 0) summary.anomalies.push(`${p.pair}: negative balance`);

    pairs.push({ pair: p.pair || 'unknown', balance });
  });

  // Top 5 pairs by balance
  summary.topPairs = pairs.sort((a, b) => b.balance - a.balance).slice(0, 5);

  return summary;
}

async function anthropicAnalyze(capture, summary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!Anthropic || !apiKey) return null;

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are analyzing a DeFi CLM snapshot. Provide:
1) A 3-5 bullet executive summary
2) Top risks (range, APY, balance swings) in bullets
3) Concrete next actions the user should take

Data:
${JSON.stringify({ summary, clmPositions: capture?.data?.content?.clmPositions }, null, 2)}
`;

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  return res?.content?.[0]?.text || null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/analyze-capture.js <path-to-capture.json>');
    process.exit(1);
  }

  const abs = path.resolve(filePath);
  const capture = readJson(abs);
  const summary = summarizeCapture(capture);

  // Print summary
  console.log('\n📋 Capture Summary');
  console.log('────────────────────────────────────────');
  console.log(`Protocol:   ${summary.protocol}`);
  console.log(`Timestamp:  ${summary.timestamp}`);
  console.log(`URL:        ${summary.url}`);
  console.log(`Positions:  ${summary.totalPositions} (in-range: ${summary.inRange}, out-of-range: ${summary.outOfRange})`);
  console.log(`Total USD:  $${Math.round(summary.totalValue).toLocaleString('en-US')}`);
  console.log(`Missing token breakdown: ${summary.missingTokenBreakdown}`);
  if (summary.topPairs.length > 0) {
    console.log('\nTop Pairs:');
    summary.topPairs.forEach((p, i) => console.log(` ${i + 1}. ${p.pair} - $${Math.round(p.balance).toLocaleString('en-US')}`));
  }
  if (summary.anomalies.length > 0) {
    console.log('\nAnomalies:');
    summary.anomalies.forEach((a) => console.log(` - ${a}`));
  }

  // Optional Claude analysis
  try {
    const ai = await anthropicAnalyze(capture, summary);
    if (ai) {
      console.log('\n🤖 AI Analysis');
      console.log('────────────────────────────────────────');
      console.log(ai);
    } else {
      console.log('\nℹ️ AI analysis skipped (no API key or SDK not available).');
    }
  } catch (err) {
    console.warn('\n⚠️ AI analysis failed:', err?.message || err);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

