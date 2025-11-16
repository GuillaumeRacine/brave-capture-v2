console.log('Brave Capture background service worker started');

// Import background config first (contains API keys from .env.local)
try {
  importScripts('background-config.js');
  console.log('✅ Background config loaded');
} catch (error) {
  console.error('❌ Failed to load background config:', error);
  console.error('   Run "npm run build:config" to generate config files');
}

// Import Supabase library
try {
  importScripts('supabase.js');
  console.log('✅ Supabase library loaded');
} catch (error) {
  console.error('❌ Failed to load Supabase library:', error);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Brave Capture extension installed');

  chrome.storage.local.get(['captures'], (result) => {
    if (!result.captures) {
      chrome.storage.local.set({ captures: [] });
    }
  });

  chrome.storage.local.set({
    settings: {
      maxCaptures: 1000,
      autoExport: false,
      exportFormat: 'json',
      captureInterval: null
    }
  });

  // Set up background cleanup worker for missing token data
  // Check every 5 minutes for positions that need extraction
  chrome.alarms.create('cleanupTokenData', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
  console.log('✅ Background cleanup worker scheduled (checks every 5 minutes)');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureComplete') {
    handleCaptureComplete(request.capture);
  }

  if (request.action === 'exportData') {
    exportCaptures(request.format || 'json').then(sendResponse);
    return true;
  }

  if (request.action === 'getCaptureStats') {
    getCaptureStatistics().then(sendResponse);
    return true;
  }

  if (request.action === 'clearOldCaptures') {
    clearOldCaptures(request.daysToKeep || 30).then(sendResponse);
    return true;
  }

  if (request.action === 'scheduleCapture') {
    scheduleAutomaticCapture(request.url, request.interval).then(sendResponse);
    return true;
  }

  // Handle AI Vision extraction (background worker bypasses CORS)
  if (request.action === 'extractBalanceFromScreenshot') {
    extractAndSaveBalance(
      request.screenshot,
      request.captureTimestamp,
      request.allPositions,
      { model: request.model || 'claude-3-haiku-20240307' }
    )
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle position extraction with AI (text + image -> complete data -> database)
  if (request.action === 'extractAllPositions') {
    extractAllPositionsFromScreenshot(
      request.screenshot,
      request.textData,
      request.protocol,
      request.captureId  // Pass capture ID to function
    )
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

function handleCaptureComplete(capture) {
  chrome.storage.local.get(['captures', 'settings'], (result) => {
    const captures = result.captures || [];
    const settings = result.settings || {};
    
    const existingIndex = captures.findIndex(c => 
      c.url === capture.url && 
      Math.abs(new Date(c.timestamp) - new Date(capture.timestamp)) < 60000
    );
    
    if (existingIndex === -1) {
      console.log('New capture saved for:', capture.url);
      
      if (settings.autoExport) {
        exportCaptures(settings.exportFormat);
      }
      
      chrome.storage.local.get(['captureGroups'], (groupResult) => {
        const groups = groupResult.captureGroups || {};
        const domain = new URL(capture.url).hostname;
        
        if (!groups[domain]) {
          groups[domain] = [];
        }
        
        groups[domain].push({
          id: capture.id,
          timestamp: capture.timestamp,
          title: capture.title
        });
        
        chrome.storage.local.set({ captureGroups: groups });
      });
    }
  });
}

async function exportCaptures(format = 'json') {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], async (result) => {
      const captures = result.captures || [];
      
      if (captures.length === 0) {
        resolve({ success: false, message: 'No captures to export' });
        return;
      }
      
      let exportData;
      let filename;
      let mimeType;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      switch (format) {
        case 'json':
          exportData = JSON.stringify(captures, null, 2);
          filename = `brave-capture-export-${timestamp}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          exportData = convertToCSV(captures);
          filename = `brave-capture-export-${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'html':
          exportData = generateHTMLReport(captures);
          filename = `brave-capture-export-${timestamp}.html`;
          mimeType = 'text/html';
          break;
          
        default:
          exportData = JSON.stringify(captures, null, 2);
          filename = `brave-capture-export-${timestamp}.json`;
          mimeType = 'application/json';
      }
      
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, message: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true, filename: filename, downloadId: downloadId });
        }
        
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    });
  });
}

function convertToCSV(captures) {
  const headers = ['ID', 'URL', 'Title', 'Timestamp', 'Domain', 'Text Count', 'Links Count', 'Images Count'];
  
  const rows = captures.map(capture => {
    const textCount = capture.data?.text?.allText?.length || 0;
    const linksCount = capture.data?.links?.length || 0;
    const imagesCount = capture.data?.images?.length || 0;
    const domain = new URL(capture.url).hostname;
    
    return [
      capture.id,
      capture.url,
      capture.title?.replace(/,/g, ';'),
      capture.timestamp,
      domain,
      textCount,
      linksCount,
      imagesCount
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function generateHTMLReport(captures) {
  const groupedByDomain = {};
  
  captures.forEach(capture => {
    const domain = new URL(capture.url).hostname;
    if (!groupedByDomain[domain]) {
      groupedByDomain[domain] = [];
    }
    groupedByDomain[domain].push(capture);
  });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Brave Capture Export Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .domain-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .domain-title {
      color: #333;
      font-size: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #764ba2;
      padding-left: 10px;
    }
    .capture-item {
      border-left: 2px solid #e0e0e0;
      padding-left: 15px;
      margin: 15px 0;
    }
    .capture-meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .capture-data {
      background: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
      font-size: 13px;
      max-height: 200px;
      overflow-y: auto;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      font-size: 14px;
    }
    .stat-item {
      background: #667eea15;
      padding: 5px 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Brave Capture Export Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <p>Total Captures: ${captures.length}</p>
  
  ${Object.entries(groupedByDomain).map(([domain, domainCaptures]) => `
    <div class="domain-section">
      <h2 class="domain-title">${domain} (${domainCaptures.length} captures)</h2>
      ${domainCaptures.map(capture => `
        <div class="capture-item">
          <div class="capture-meta">
            <strong>${capture.title || 'Untitled'}</strong><br>
            ${new Date(capture.timestamp).toLocaleString()}<br>
            <a href="${capture.url}" target="_blank">${capture.url}</a>
          </div>
          <div class="stats">
            <span class="stat-item">Text: ${capture.data?.text?.allText?.length || 0} items</span>
            <span class="stat-item">Links: ${capture.data?.links?.length || 0}</span>
            <span class="stat-item">Images: ${capture.data?.images?.length || 0}</span>
            <span class="stat-item">Tables: ${capture.data?.tables?.length || 0}</span>
          </div>
          <details>
            <summary>View captured data</summary>
            <div class="capture-data">
              <pre>${JSON.stringify(capture.data, null, 2)}</pre>
            </div>
          </details>
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`;
  
  return html;
}

async function getCaptureStatistics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];
      
      const stats = {
        totalCaptures: captures.length,
        uniqueDomains: new Set(captures.map(c => new URL(c.url).hostname)).size,
        oldestCapture: captures.length > 0 ? captures[captures.length - 1].timestamp : null,
        newestCapture: captures.length > 0 ? captures[0].timestamp : null,
        averageDataSize: 0,
        topDomains: {}
      };
      
      const domainCounts = {};
      let totalSize = 0;
      
      captures.forEach(capture => {
        const domain = new URL(capture.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        
        totalSize += JSON.stringify(capture.data).length;
      });
      
      stats.averageDataSize = captures.length > 0 ? Math.round(totalSize / captures.length) : 0;
      
      stats.topDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((acc, [domain, count]) => {
          acc[domain] = count;
          return acc;
        }, {});
      
      resolve(stats);
    });
  });
}

async function clearOldCaptures(daysToKeep) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captures'], (result) => {
      const captures = result.captures || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const filteredCaptures = captures.filter(capture => {
        return new Date(capture.timestamp) > cutoffDate;
      });
      
      const removedCount = captures.length - filteredCaptures.length;
      
      chrome.storage.local.set({ captures: filteredCaptures }, () => {
        resolve({
          success: true,
          removedCount: removedCount,
          remainingCount: filteredCaptures.length
        });
      });
    });
  });
}

async function scheduleAutomaticCapture(url, intervalMinutes) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scheduledCaptures'], (result) => {
      const scheduled = result.scheduledCaptures || {};
      
      if (intervalMinutes <= 0) {
        delete scheduled[url];
      } else {
        scheduled[url] = {
          interval: intervalMinutes,
          lastCapture: null,
          nextCapture: new Date(Date.now() + intervalMinutes * 60000).toISOString()
        };
      }
      
      chrome.storage.local.set({ scheduledCaptures: scheduled }, () => {
        if (intervalMinutes > 0) {
          setupCaptureAlarm(url, intervalMinutes);
        } else {
          chrome.alarms.clear(`capture-${url}`);
        }
        
        resolve({
          success: true,
          scheduled: intervalMinutes > 0,
          url: url,
          interval: intervalMinutes
        });
      });
    });
  });
}

function setupCaptureAlarm(url, intervalMinutes) {
  const alarmName = `capture-${url}`;
  
  chrome.alarms.create(alarmName, {
    delayInMinutes: intervalMinutes,
    periodInMinutes: intervalMinutes
  });
}

// Only add alarm listener if alarms API is available
if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('capture-')) {
      const url = alarm.name.replace('capture-', '');
      performScheduledCapture(url);
    } else if (alarm.name === 'cleanupTokenData') {
      cleanupMissingTokenData();
    }
  });
}

async function performScheduledCapture(url) {
  try {
    const tabs = await chrome.tabs.query({ url: url });

    if (tabs.length === 0) {
      const newTab = await chrome.tabs.create({ url: url, active: false });

      setTimeout(async () => {
        const results = await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          files: ['content.js']
        });

        chrome.tabs.remove(newTab.id);
      }, 5000);
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });
    }
  } catch (error) {
    console.error('Error performing scheduled capture:', error);
  }
}

// AI Vision extraction function (runs in background to bypass CORS)
// Credentials are loaded from background-config.js via importScripts (see top of file)
// BACKGROUND_CONFIG is now available globally
const ANTHROPIC_API_KEY = BACKGROUND_CONFIG?.ANTHROPIC_API_KEY;
const SUPABASE_URL = BACKGROUND_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = BACKGROUND_CONFIG?.SUPABASE_ANON_KEY;
const AI_DISABLED = !ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('⚠️ ANTHROPIC_API_KEY not configured - AI Vision features disabled');
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials not configured');
}

// Initialize Supabase client (will be loaded from CDN)
let supabaseClient = null;

async function initSupabase() {
  if (!supabaseClient && typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized in background');
  }
  return supabaseClient;
}

/**
 * Extract ALL position data using both text capture AND screenshot
 * Simplest approach: text + image → AI → complete JSON → database
 *
 * IMPORTANT - Orca Workflow Pattern:
 * - User takes MULTIPLE captures (one per position) in rotation
 * - Each capture has ONE position expanded (side panel showing token breakdown)
 * - AI extracts complete token data ONLY for the expanded position
 * - All other positions get null token data (expected behavior)
 * - After N captures, database has complete data for all N positions
 *
 * Example with 5 positions:
 *   Capture 1: SOL/USDC expanded  → SOL/USDC has token data, others are null
 *   Capture 2: PUMP/SOL expanded  → PUMP/SOL has token data, others are null
 *   Capture 3: JLP/USDC expanded  → JLP/USDC has token data, others are null
 *   ... and so on
 *
 * See docs/CLAUDE.md for full documentation on this pattern.
 */
async function extractAllPositionsFromScreenshot(screenshotDataUrl, textData = null, protocol = 'Orca', captureId = null) {
  if (AI_DISABLED) {
    throw new Error('AI Vision disabled: missing ANTHROPIC_API_KEY');
  }

  console.log(`🤖 Extracting all ${protocol} positions using text + image...`);
  const base64Image = screenshotDataUrl.split(',')[1];

  const textContext = textData ? `

I have also extracted some basic data from the page DOM:
${JSON.stringify(textData, null, 2)}

Use this text data to help match and verify the visual information from the screenshot.` : '';

  // Determine if this is a lending protocol or CLM protocol
  const isLendingProtocol = ['Aave', 'Morpho'].includes(protocol);

  // Use different prompts for lending vs CLM protocols
  const prompt = isLendingProtocol ?
    `You are analyzing a ${protocol} lending/borrowing page showing collateral and loan positions.

You have BOTH a screenshot AND text data extracted from the page. Use BOTH sources to extract complete, accurate data.${textContext}

Analyze the screenshot and text to extract ALL positions.

For ${protocol === 'Aave' ? 'Aave supply positions' : 'Morpho borrow positions'}, extract:
${protocol === 'Aave' ? `
1. **asset** - Token symbol (e.g., "wstETH", "ETH", "USDC")
2. **amount** - Amount of tokens supplied
3. **usdValue** - USD value of the supply
4. **apy** - Supply APY percentage
5. **type** - Always "supply"

Return ONLY a JSON array (no markdown):
[
  {
    "asset": "wstETH",
    "amount": "16.5",
    "usdValue": "50073.87",
    "apy": "0.02",
    "type": "supply"
  }
]` : `
1. **collateralAsset** - Collateral token (e.g., "wstETH", "cbBTC")
2. **collateralAmount** - Amount of collateral
3. **collateralValue** - USD value (can include 'k' suffix like "68.97k")
4. **loanAsset** - Borrowed token (e.g., "USDC")
5. **loanAmount** - Amount borrowed (can include 'k' suffix)
6. **loanValue** - USD value of loan (can include 'k' suffix)
7. **rate** - Borrow rate percentage
8. **ltv** - Loan-to-value percentage
9. **liquidationLTV** - Max LTV before liquidation
10. **liquidationPrice** - Price at which liquidation occurs
11. **utilization** - Utilization percentage
12. **type** - Always "lending"

Return ONLY a JSON array (no markdown):
[
  {
    "collateralAsset": "wstETH",
    "collateralAmount": "17.9451",
    "collateralValue": "68.97k",
    "loanAsset": "USDC",
    "loanAmount": "25037.45",
    "loanValue": "25.03k",
    "rate": "4.15",
    "ltv": "36.35",
    "liquidationLTV": "86",
    "liquidationPrice": "1622.35",
    "utilization": "80.97",
    "type": "lending"
  }
]`}`
    : `You are analyzing a DeFi portfolio page showing CLM (Concentrated Liquidity Market) positions.

You have BOTH a screenshot AND text data extracted from the page. Use BOTH sources to extract complete, accurate data.${textContext}

IMPORTANT - Orca UI Pattern:
- The screenshot shows a LIST of positions on the left/main area
- If a position is expanded, a SIDE PANEL/DRAWER appears (usually on the right) showing detailed token breakdown
- Only ONE position can have an expanded side panel at a time
- Look carefully for this expanded panel - it will show individual token amounts, values, and percentages
- For the position with the expanded panel: extract complete token data
- For all other positions in the list: set token amounts/values/percentages to null

Analyze the screenshot and text data to extract ALL positions with complete information.

For EACH position, extract:
1. **pair** - Token pair (e.g., "SOL/USDC", "cbBTC/USDC")
2. **balance** - Total USD value of the position
3. **pendingYield** - Pending yield in USD
4. **apy** - Annual percentage yield
5. **currentPrice** - Current price
6. **rangeMin** - Minimum price of the range
7. **rangeMax** - Maximum price of the range
8. **inRange** - true if current price is within range, false otherwise
9. **token0Amount** - Amount of first token (ONLY if side panel is visible for this position)
10. **token1Amount** - Amount of second token (ONLY if side panel is visible for this position)
11. **token0Value** - USD value of first token (ONLY if side panel is visible for this position)
12. **token1Value** - USD value of second token (ONLY if side panel is visible for this position)
13. **token0Percentage** - Percentage of total value in first token 0-100 (ONLY if side panel is visible for this position)
14. **token1Percentage** - Percentage of total value in second token 0-100 (ONLY if side panel is visible for this position)

IMPORTANT:
- Extract data from ALL visible positions in the screenshot
- Check if there is an expanded SIDE PANEL/DRAWER showing token breakdown details
- If you see a side panel, identify WHICH position it belongs to (match the pair name)
- ONLY extract token amounts/values/percentages for the position with the expanded side panel
- For all other positions, set token amounts/values/percentages to null
- Token amounts may be displayed with K/M suffixes (e.g., "2.5K" = 2500, "1.2M" = 1200000)
- Percentages should sum to 100 for each position
- Remove any "0" suffixes from token names (e.g., "SOL0" → "SOL", "USDC0" → "USDC")

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "pair": "SOL/USDC",
    "balance": 18754,
    "pendingYield": 405,
    "apy": 169.1,
    "currentPrice": 141.76,
    "rangeMin": 126.65,
    "rangeMax": 190.00,
    "inRange": true,
    "token0Amount": 65.5,
    "token1Amount": 9250,
    "token0Value": 9377,
    "token1Value": 9250,
    "token0Percentage": 50.3,
    "token1Percentage": 49.7
  }
]`;

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
        model: 'claude-sonnet-4-5-20250929', // Updated to Claude Sonnet 4.5 (3.5 retired Oct 2025)
        max_tokens: 4096, // More tokens needed for multiple positions
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Claude API response received');

    const assistantMessage = data.content.find(block => block.type === 'text')?.text || '';
    console.log('Raw response:', assistantMessage);

    // Parse the JSON response
    const jsonMatch = assistantMessage.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Could not find JSON array in response');
      throw new Error('Failed to parse AI response');
    }

    const extractedPositions = JSON.parse(jsonMatch[0]);
    console.log(`✅ Successfully extracted ${extractedPositions.length} positions from screenshot`);

    // Save directly to Supabase
    const supabase = await initSupabase();
    const timestamp = new Date().toISOString();
    let savedCount = 0;

    // For lending protocols (Aave, Morpho), update the capture's content instead of positions table
    if (isLendingProtocol) {
      try {
        const contentKey = protocol === 'Aave' ? 'aavePositions' : 'morphoPositions';

        // Get current capture data
        const { data: currentCapture } = await supabase
          .from('captures')
          .select('data')
          .eq('id', captureId)
          .single();

        if (currentCapture) {
          const updatedData = { ...currentCapture.data };
          if (!updatedData.content) updatedData.content = {};

          updatedData.content[contentKey] = {
            positions: extractedPositions,
            positionCount: extractedPositions.length,
            totalValue: protocol === 'Aave' ?
              extractedPositions.reduce((sum, p) => sum + parseFloat(p.usdValue || 0), 0).toFixed(2) :
              (extractedPositions[0]?.collateralValue || '0')
          };

          const { error } = await supabase
            .from('captures')
            .update({ data: updatedData })
            .eq('id', captureId);

          if (error) {
            console.error(`❌ Error updating ${protocol} capture:`, error);
          } else {
            console.log(`✅ Updated ${protocol} capture with ${extractedPositions.length} positions`);
            savedCount = extractedPositions.length;
          }
        }
      } catch (err) {
        console.error(`❌ Exception updating ${protocol} capture:`, err);
      }
    } else {
      // For CLM protocols, save to positions table
      for (const pos of extractedPositions) {
        try {
          // Extract individual token names from pair (e.g., "SOL/USDC" -> "SOL", "USDC")
          const pairParts = (pos.pair || '').split('/');
          const token0 = (pairParts[0] || '').trim();
          const token1 = (pairParts[1] || '').trim();

          const { error } = await supabase
            .from('positions')
            .insert({
              capture_id: captureId,  // REQUIRED: Foreign key to captures table
              pair: pos.pair,
              token0: token0,  // Individual token names for display
              token1: token1,
              protocol: protocol,
              balance: pos.balance,
              pending_yield: pos.pendingYield,
              apy: pos.apy,
              current_price: pos.currentPrice,
              range_min: pos.rangeMin,
              range_max: pos.rangeMax,
              in_range: pos.inRange,
              token0_amount: pos.token0Amount,
              token1_amount: pos.token1Amount,
              token0_value: pos.token0Value,
              token1_value: pos.token1Value,
              token0_percentage: pos.token0Percentage,
              token1_percentage: pos.token1Percentage,
              captured_at: timestamp
            });

          if (error) {
            console.error(`❌ Error saving ${pos.pair}:`, error);
          } else {
            console.log(`✅ Saved ${pos.pair} to database`);
            savedCount++;
          }
        } catch (err) {
          console.error(`❌ Exception saving ${pos.pair}:`, err);
        }
      }
    }

    console.log(`💾 Saved ${savedCount}/${extractedPositions.length} positions to database`);

    // AUTOMATED QC: Validate and auto-fix data quality issues (only for CLM protocols)
    if (savedCount > 0 && !isLendingProtocol) {
      try {
        await runAutoQC(supabase, captureId, extractedPositions);
      } catch (qcError) {
        console.error('⚠️ QC validation failed (non-fatal):', qcError);
        // Don't fail the whole operation if QC fails
      }
    } else if (isLendingProtocol) {
      console.log('✅ Lending protocol - QC not needed (data validated by AI extraction)');
    }

    return { success: true, positions: extractedPositions, savedCount };

  } catch (error) {
    console.error('❌ Error extracting positions from screenshot:', error);
    throw error;
  }
}

/**
 * Automated Quality Control - Runs after positions are saved
 * Validates data quality and auto-fixes common issues
 */
async function runAutoQC(supabase, captureId, extractedPositions) {
  console.log('\n🔍 Running Automated QC...');

  const CLM_PROTOCOLS = ['Orca', 'Raydium', 'Aerodrome', 'Cetus', 'Hyperion', 'PancakeSwap', 'Uniswap', 'Ekubo', 'Beefy'];
  const HEDGE_PROTOCOLS = ['Hyperliquid', 'Morpho', 'Aave'];

  // Fetch saved positions from database
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('capture_id', captureId);

  if (error) {
    console.error('❌ QC: Failed to fetch positions:', error);
    return;
  }

  let issuesDetected = 0;
  let issuesFixed = 0;

  for (const pos of positions) {
    // QC Check 1: Missing token0/token1 names
    if ((!pos.token0 || !pos.token1) && pos.pair && pos.pair.includes('/')) {
      issuesDetected++;
      const pairParts = pos.pair.split('/');
      const token0 = (pairParts[0] || '').trim();
      const token1 = (pairParts[1] || '').trim();

      if (token0 && token1) {
        const { error: updateError } = await supabase
          .from('positions')
          .update({ token0, token1 })
          .eq('id', pos.id);

        if (!updateError) {
          console.log(`✅ QC: Fixed missing token names for ${pos.pair} → "${token0}", "${token1}"`);
          issuesFixed++;
        } else {
          console.error(`❌ QC: Failed to fix ${pos.pair}:`, updateError.message);
        }
      }
    }

    // QC Check 2: Invalid percentages (don't sum to 100%)
    if (pos.token0_percentage !== null && pos.token1_percentage !== null) {
      const percentageSum = pos.token0_percentage + pos.token1_percentage;
      if (Math.abs(percentageSum - 100) > 0.5) {
        issuesDetected++;

        // Recalculate from token values if available
        if (pos.token0_value !== null && pos.token1_value !== null) {
          const total = pos.token0_value + pos.token1_value;
          if (total > 0) {
            const token0_percentage = Math.round((pos.token0_value / total) * 1000) / 10;
            const token1_percentage = Math.round((pos.token1_value / total) * 1000) / 10;

            const { error: updateError } = await supabase
              .from('positions')
              .update({ token0_percentage, token1_percentage })
              .eq('id', pos.id);

            if (!updateError) {
              console.log(`✅ QC: Fixed percentages for ${pos.pair}: ${token0_percentage}% / ${token1_percentage}%`);
              issuesFixed++;
            }
          }
        }
      }
    }

    // QC Check 3: Balance mismatch (warning only)
    if (pos.token0_value !== null && pos.token1_value !== null && pos.balance !== null) {
      const calculatedBalance = pos.token0_value + pos.token1_value;
      const diff = Math.abs(calculatedBalance - pos.balance);
      if (diff > 1) {
        console.warn(`⚠️ QC: Balance mismatch for ${pos.pair}: reported $${pos.balance}, calculated $${calculatedBalance} (diff: $${diff})`);
      }
    }

    // QC Check 4: Protocol categorization (warning only - fixed in dashboard.js)
    if (HEDGE_PROTOCOLS.includes(pos.protocol)) {
      console.warn(`⚠️ QC: ${pos.protocol} position detected - will be filtered from CLM section by dashboard`);
    }
  }

  if (issuesDetected > 0) {
    console.log(`\n📊 QC Summary: ${issuesDetected} issues detected, ${issuesFixed} auto-fixed`);
  } else {
    console.log('✅ QC: No issues detected - data quality is good!');
  }
}

async function extractBalanceFromScreenshot(screenshotDataUrl, allPairs, options = {}) {
  if (AI_DISABLED) {
    throw new Error('AI Vision disabled: missing ANTHROPIC_API_KEY');
  }
  console.log('🤖 Background: Analyzing screenshot to find expanded position');

  // Use Haiku model by default for cost optimization ($0.0004 vs $0.03 for Opus)
  const model = options.model || 'claude-3-haiku-20240307';
  console.log(`Using model: ${model}`);

  const base64Image = screenshotDataUrl.split(',')[1];

  // First, ask Claude which pair is expanded
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.content.find(c => c.type === 'text');

  let responseText = textContent.text.trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  console.log('Claude response:', responseText);

  const balanceData = JSON.parse(responseText);

  // Check if Claude returned an error (no expanded position found)
  if (balanceData.error) {
    console.log(`   ⚠️ ${balanceData.error}`);
    throw new Error(balanceData.error);
  }

  // Validate we got all required fields
  if (!balanceData.pair || !balanceData.token0Amount || !balanceData.token1Amount) {
    throw new Error(`Incomplete data in Claude response`);
  }

  console.log(`   ✅ Found expanded position: ${balanceData.pair}`);
  console.log(`   ✅ Extracted: ${balanceData.token0Amount} ${balanceData.token0} (${balanceData.token0Percentage}%), ${balanceData.token1Amount} ${balanceData.token1} (${balanceData.token1Percentage}%)`);

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

// Token normalization mapping - handle all variants and OCR errors
const TOKEN_NORMALIZATION = {
  // BTC variants
  'WBTC': 'BTC', 'wBTC': 'BTC', 'xBTC': 'BTC', 'cbBTC': 'BTC', 'CBBTC': 'BTC',
  // ETH variants
  'WETH': 'ETH', 'wETH': 'ETH', 'whETH': 'ETH', 'WHETH': 'ETH', 'stETH': 'ETH',
  'STETH': 'ETH', 'wstETH': 'ETH', 'WSTETH': 'ETH',
  // USDC variants
  'USDC.e': 'USDC', 'USDC.E': 'USDC', 'USDbC': 'USDC',
  // Orca-specific "0" suffixes
  'USDC0': 'USDC', 'SOL0': 'SOL', 'USDT0': 'USDT', 'BTC0': 'BTC', 'ETH0': 'ETH',
  // Common OCR/extraction errors
  'JPL': 'JLP', 'JLF': 'JLP'  // Handle J-L-P confusion
};

// Normalize a single token name
function normalizeToken(token) {
  if (!token) return token;

  // Remove whitespace and convert to uppercase for comparison
  let normalized = token.trim().toUpperCase();

  // Remove trailing "0" suffix (Orca adds these)
  normalized = normalized.replace(/0+$/, '');

  // Apply token normalization mapping
  normalized = TOKEN_NORMALIZATION[normalized] || normalized;

  return normalized;
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Normalize a token pair (e.g., "wETH/SOL0" → "ETH/SOL")
function normalizePair(pair) {
  if (!pair) return '';

  // Remove extra spaces and split by slash
  const tokens = pair.split('/').map(t => t.trim());

  if (tokens.length !== 2) {
    console.warn(`Invalid pair format: ${pair}`);
    return pair.toUpperCase();
  }

  // Normalize each token
  const normalized0 = normalizeToken(tokens[0]);
  const normalized1 = normalizeToken(tokens[1]);

  return `${normalized0}/${normalized1}`;
}

// Find matching position using smart normalization and fuzzy matching
function findMatchingPosition(extractedPair, availablePositions) {
  const normalizedExtracted = normalizePair(extractedPair);

  console.log(`🔍 Matching AI pair: "${extractedPair}"`);
  console.log(`   Normalized: "${normalizedExtracted}"`);
  console.log(`   Available DB pairs: ${availablePositions.map(p => p.pair).join(', ')}`);

  // Try exact match after normalization
  for (const position of availablePositions) {
    const normalizedDb = normalizePair(position.pair);
    console.log(`   Comparing "${normalizedExtracted}" vs "${normalizedDb}" (from ${position.pair})`);

    // Exact match after normalization
    if (normalizedExtracted === normalizedDb) {
      console.log(`   ✅ EXACT MATCH: "${extractedPair}" → "${position.pair}"`);
      return position;
    }

    // Try reversed (SOL/USDC vs USDC/SOL)
    const [token0, token1] = normalizedExtracted.split('/');
    const reversedPair = `${token1}/${token0}`;

    if (reversedPair === normalizedDb) {
      console.log(`   ✅ REVERSED MATCH: "${extractedPair}" → "${position.pair}"`);
      return position;
    }
  }

  // Try fuzzy match with Levenshtein distance (allows for minor OCR errors)
  console.log(`   Trying fuzzy matching (Levenshtein distance <= 2)...`);
  for (const position of availablePositions) {
    const normalizedDb = normalizePair(position.pair);
    const distance = levenshteinDistance(normalizedExtracted, normalizedDb);

    if (distance <= 2 && distance > 0) {
      console.log(`   ✅ FUZZY MATCH (distance=${distance}): "${extractedPair}" → "${position.pair}"`);
      return position;
    }
  }

  console.error(`   ❌ NO MATCH for "${extractedPair}"`);
  console.error(`   Normalized DB pairs: ${availablePositions.map(p => normalizePair(p.pair)).join(', ')}`);
  return null;
}

// Extract balance AND save to database directly in background
async function extractAndSaveBalance(screenshotDataUrl, captureTimestamp, allPositions, options = {}) {
  console.log('🚀 Background: Extract and save balance');

  // Extract using AI Vision (use Haiku model by default for batch operations)
  const extracted = await extractBalanceFromScreenshot(
    screenshotDataUrl,
    allPositions.map(p => p.pair),
    { model: options.model || 'claude-3-haiku-20240307' }
  );

  // Match extracted pair to database position using smart normalization
  const matchedPosition = findMatchingPosition(extracted.pair, allPositions);

  if (!matchedPosition) {
    console.error(`❌ No match found for ${extracted.pair}`);
    console.error(`   Available positions:`, allPositions.map(p => p.pair));
    console.error(`   Normalized extracted: ${normalizePair(extracted.pair)}`);
    throw new Error(`Extracted pair ${extracted.pair} doesn't match any position`);
  }

  console.log(`🎯 Matched ${extracted.pair} to ${matchedPosition.pair}`);

  // Initialize Supabase if needed
  const client = await initSupabase();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }

  // Update database
  // Note: Use a time range instead of exact match because capture.timestamp and position.captured_at
  // are created at slightly different times (milliseconds apart)
  console.log(`📝 Updating database: pair="${matchedPosition.pair}", around timestamp="${captureTimestamp}"`);

  // Convert timestamp to Date and create a 5-second window
  const captureTime = new Date(captureTimestamp);
  const timeBefore = new Date(captureTime.getTime() - 5000).toISOString(); // 5 seconds before
  const timeAfter = new Date(captureTime.getTime() + 5000).toISOString();  // 5 seconds after

  let query = client
    .from('positions')
    .update({
      token0_amount: extracted.token0Amount,
      token1_amount: extracted.token1Amount,
      token0_percentage: extracted.token0Percentage,
      token1_percentage: extracted.token1Percentage
    })
    .eq('pair', matchedPosition.pair)
    .gte('captured_at', timeBefore)
    .lte('captured_at', timeAfter);

  const { data, error } = await query
    .order('captured_at', { ascending: false })
    .limit(1)
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
    console.warn('⚠️ No rows updated - position not found');
    throw new Error('Position not found in database');
  }
}

// ===== BACKGROUND CLEANUP WORKER =====
// Automatically finds and extracts positions with missing token data

async function cleanupMissingTokenData() {
  console.log('🧹 Background cleanup: Checking for positions with missing token data...');

  try {
    // Initialize Supabase if needed
    const client = await initSupabase();
    if (!client) {
      console.warn('⚠️ Supabase client not initialized - skipping cleanup');
      return;
    }

    // Query database for positions with NULL token data from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: positions, error } = await client
      .from('positions')
      .select('*')
      .gte('captured_at', sevenDaysAgo.toISOString())
      .is('token0_amount', null)
      .limit(50); // Limit to 50 positions to avoid overwhelming the system

    if (error) {
      console.error('❌ Error querying positions:', error);
      return;
    }

    if (!positions || positions.length === 0) {
      console.log('✅ No positions need token data extraction');
      return;
    }

    console.log(`📊 Found ${positions.length} positions missing token data (from last 7 days)`);
    console.log('   Note: Background extraction requires the Orca page to be open');
    console.log('   These positions will be extracted when the user next visits the page');

    // For now, just log the positions that need extraction
    // Full background extraction would require opening the Orca page automatically
    // which we should only do with explicit user permission
    positions.forEach(pos => {
      console.log(`   - ${pos.pair} (captured at ${pos.captured_at})`);
    });

    // Store the count of positions needing extraction
    chrome.storage.local.set({
      positionsNeedingExtraction: positions.length,
      lastCleanupCheck: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Background cleanup error:', error);
  }
}

// Run cleanup once on startup to check for any missed positions
setTimeout(() => {
  cleanupMissingTokenData();
}, 10000); // Wait 10 seconds after startup
