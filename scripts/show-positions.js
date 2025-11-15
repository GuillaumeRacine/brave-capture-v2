#!/usr/bin/env node

/**
 * Show CLM Positions - CLI Display
 *
 * Displays positions in a formatted table matching the dashboard view
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Format timestamp as "X min/hours/days ago"
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = new Date();
  const capturedAt = new Date(timestamp);
  const diffMs = now - capturedAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

// Format number with proper decimals
function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (num >= 100) return num.toFixed(2);
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  return num.toFixed(6);
}

// Format token amount
function formatTokenAmount(amount) {
  if (!amount || amount === 0) return '0';
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
  if (amount >= 100) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(4);
}

async function showPositions() {
  console.log('\n📊 CLM POSITIONS\n');
  console.log('═'.repeat(150));

  // Get latest positions
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching positions:', error.message);
    return;
  }

  if (!positions || positions.length === 0) {
    console.log('No positions found');
    return;
  }

  // Group by protocol-pair and keep only latest
  const latestMap = new Map();
  positions.forEach(pos => {
    const key = `${pos.protocol}-${pos.pair}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(pos.captured_at) > new Date(existing.captured_at)) {
      latestMap.set(key, pos);
    }
  });

  const latestPositions = Array.from(latestMap.values());

  // Filter positions >= $1000
  const displayPositions = latestPositions.filter(p => parseFloat(p.balance) >= 1000);

  console.log(`Total Positions: ${latestPositions.length} | Showing: ${displayPositions.length} (≥$1,000)\n`);

  // Table header
  const header = [
    'Pair'.padEnd(25),
    'Status'.padEnd(8),
    'Balance'.padEnd(12),
    'Token 0'.padEnd(28),
    'Token 1'.padEnd(28),
    'Yield'.padEnd(10),
    'APY'.padEnd(8),
    'Price Range'.padEnd(30)
  ].join(' | ');

  console.log(header);
  console.log('─'.repeat(150));

  // Display each position
  displayPositions.forEach(pos => {
    const timeAgo = formatTimeAgo(pos.captured_at);
    const pair = `${pos.pair} · ${pos.protocol} · ${timeAgo}`;
    const status = pos.in_range ? '✓' : '✗';
    const balance = `$${Math.round(pos.balance).toLocaleString('en-US')}`;

    // Calculate percentages
    const token0Amt = pos.token0_amount || 0;
    const token1Amt = pos.token1_amount || 0;
    const token0Val = pos.token0_value || 0;
    const token1Val = pos.token1_value || 0;

    let token0Pct = pos.token0_percentage || 0;
    let token1Pct = pos.token1_percentage || 0;

    // Fallback calculation if percentages not in DB
    if (!token0Pct && !token1Pct && pos.balance > 0) {
      if (token0Val > 0 || token1Val > 0) {
        const total = token0Val + token1Val;
        token0Pct = total > 0 ? (token0Val / total) * 100 : 50;
        token1Pct = total > 0 ? (token1Val / total) * 100 : 50;
      } else {
        token0Pct = token1Pct = 50;
      }
    }

    const token0Display = `${formatTokenAmount(token0Amt)} ($${Math.round(token0Val).toLocaleString('en-US')} • ${token0Pct.toFixed(0)}%)`;
    const token1Display = `${formatTokenAmount(token1Amt)} ($${Math.round(token1Val).toLocaleString('en-US')} • ${token1Pct.toFixed(0)}%)`;

    const yieldDisplay = `$${Math.round(pos.pending_yield || 0).toLocaleString('en-US')}`;
    const apyDisplay = `${(pos.apy || 0).toFixed(1)}%`;

    const priceRange = [
      formatNumber(pos.current_price),
      formatNumber(pos.range_min),
      formatNumber(pos.range_max)
    ].join(' / ');

    const row = [
      pair.padEnd(25).substring(0, 25),
      status.padEnd(8),
      balance.padEnd(12),
      token0Display.padEnd(28).substring(0, 28),
      token1Display.padEnd(28).substring(0, 28),
      yieldDisplay.padEnd(10),
      apyDisplay.padEnd(8),
      priceRange.padEnd(30)
    ].join(' | ');

    console.log(row);
  });

  console.log('─'.repeat(150));

  // Summary stats
  const totalValue = displayPositions.reduce((sum, p) => sum + parseFloat(p.balance || 0), 0);
  const totalYield = displayPositions.reduce((sum, p) => sum + parseFloat(p.pending_yield || 0), 0);
  const inRangeCount = displayPositions.filter(p => p.in_range).length;
  const weightedAPY = displayPositions.reduce((sum, p) => {
    const weight = parseFloat(p.balance || 0) / totalValue;
    return sum + (parseFloat(p.apy || 0) * weight);
  }, 0);

  console.log(`\n📈 Summary:`);
  console.log(`   Total Value: $${Math.round(totalValue).toLocaleString('en-US')}`);
  console.log(`   Total Yield: $${Math.round(totalYield).toLocaleString('en-US')}`);
  console.log(`   In Range: ${inRangeCount}/${displayPositions.length} (${((inRangeCount/displayPositions.length)*100).toFixed(1)}%)`);
  console.log(`   Weighted APY: ${weightedAPY.toFixed(1)}%`);
  console.log();
}

showPositions().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
