console.log('🟢🟢🟢 POPUP.JS FILE IS LOADING! 🟢🟢🟢');

let currentTab = null;
let extractionInProgress = false; // Track if extraction is running

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🟡🟡🟡 POPUP.JS DOMContentLoaded fired! 🟡🟡🟡');
  const captureBtn = document.getElementById('captureBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const currentUrlElement = document.getElementById('currentUrl');
  const messageElement = document.getElementById('message');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    currentUrlElement.textContent = tab.url || 'Unknown';

    loadRecentCaptures();
  } catch (error) {
    currentUrlElement.textContent = 'Error loading page info';
    console.error('Error getting current tab:', error);
  }

  // Export button removed - simplified UI

  // (Auth UI disabled until deployment)

  dashboardBtn.addEventListener('click', () => {
    // Open dashboard in a new tab
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    console.log('Opening dashboard:', dashboardUrl);
    chrome.tabs.create({ url: dashboardUrl });
  });

  // Batch extraction handler removed - now automatic after capture

  captureBtn.addEventListener('click', async () => {
    console.log('🚀🚀🚀 POPUP.JS: Capture button clicked! This is the POPUP console! 🚀🚀🚀');

    if (!currentTab) {
      showMessage('No active tab found', 'error');
      return;
    }

    // Immediate visual feedback
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Capturing<span class="spinner"></span>';
    captureBtn.style.opacity = '0.7';
    showMessage('⏳ Waiting for page data...', 'info');

    let response = null; // Initialize response

    try {
      console.log('📊 Starting capture for URL:', currentTab.url);
      console.log('Tab ID:', currentTab.id);

      // Send message to content script to capture data
      response = await chrome.tabs.sendMessage(currentTab.id, { action: 'captureData' });

      console.log('📦 Response from content script:', response);

      if (response && response.success) {
        showMessage('✅ Data captured! Taking screenshot...', 'info');

        // Capture screenshot of the current tab
        let screenshot = null;
        try {
          screenshot = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
            format: 'png',
            quality: 90
          });
          console.log('📸 Screenshot captured:', screenshot.substring(0, 50) + '...');
        } catch (error) {
          console.warn('Failed to capture screenshot:', error);
          // Continue without screenshot
        }

        showMessage('✅ Data captured! Saving...', 'info');

        const capture = {
          url: currentTab.url,
          title: currentTab.title,
          timestamp: new Date().toISOString(),
          data: response.data,
          protocol: response.data.protocol,
          id: generateId(),
          screenshot: screenshot // Store screenshot data URL
        };

        // Save to Supabase (using function from supabase-client.js)
        showMessage('💾 Saving to database...', 'info');
        console.log('🔍 Attempting to save to Supabase...');
        const saveResult = await window.saveCapture(capture);
        console.log('🔍 Supabase save result:', saveResult);

        if (!saveResult.success) {
          console.error('❌ Supabase save failed:', saveResult.error);
          // Don't throw - allow file save to continue even if Supabase fails
          showMessage('⚠️ Database save failed, but file saved locally', 'warning');
        } else {
          console.log('✅ Supabase save successful');
        }

        // ALSO save to local file with timestamped name
        const fileResult = await window.FileStorage.saveCaptureToFile(capture);
        let fileSaveMessage = '';
        if (fileResult.success) {
          console.log('✅ Saved to file:', fileResult.path);
          const fileName = fileResult.path.split('/').pop();
          fileSaveMessage = ` File: ${fileName}`;
        } else {
          console.warn('⚠️ Could not save to file:', fileResult.error);
        }

        // Save screenshot in the same folder as the JSON capture
        if (screenshot) {
          try {
            // Generate matching filename and path
            const url = new URL(capture.url);
            let hostname = url.hostname
              .replace(/^(www\.|app\.)/, '')
              .replace(/\./g, '-');

            let path = url.pathname
              .replace(/^\//, '')
              .replace(/\//g, '-')
              .replace(/[^a-zA-Z0-9-]/g, '');

            if (path && path.length > 0 && path !== 'index') {
              hostname += '-' + path;
            }

            const timestamp = new Date(capture.timestamp);
            const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
            const time = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const yearMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;

            const screenshotFilename = `captures/${hostname}/${yearMonth}/${hostname}_${date}_${time}.png`;

            // Convert data URL to blob and download
            await chrome.downloads.download({
              url: screenshot,
              filename: screenshotFilename,
              saveAs: false
            });
            console.log('📸 Screenshot saved:', screenshotFilename);
          } catch (error) {
            console.warn('Failed to save screenshot file:', error);
          }
        }

        // Show success immediately - don't wait for validation/comparison
        const screenshotMsg = screenshot ? ' + Screenshot' : '';
        showMessage(`✅ Captured! ${fileSaveMessage}${screenshotMsg}`, 'success');

        // Run validation and comparison in background (don't block UI)
        Promise.all([
          validateCapture(capture),
          compareWithPrevious(capture)
        ]).then(([validation, comparison]) => {
          // Log results in console for debugging
          if (validation.issues.length > 0) {
            console.warn('⚠️ Validation issues:', validation.issues);
          }
          if (validation.warnings.length > 0) {
            console.log('⚠️ Validation warnings:', validation.warnings);
          }
          if (comparison) {
            console.log('📊 Changes detected:', {
              added: comparison.positionsAdded.length,
              removed: comparison.positionsRemoved.length,
              significant: comparison.significantChanges.length,
              critical: comparison.criticalChanges.length
            });
          }
        }).catch(err => {
          console.warn('Background validation/comparison failed:', err);
        });

        // Run AI extraction if screenshot exists (text + image -> complete data)
        console.log('💡 Checking screenshot for AI extraction:', screenshot ? 'EXISTS' : 'NULL');
        if (screenshot) {
          console.log(`🤖 Extracting all positions using AI (text + image)...`);

          // Set flag to prevent popup from closing during extraction
          extractionInProgress = true;

          // Send BOTH text data AND screenshot to AI
          // For lending protocols, send the appropriate position data
          const protocol = capture.data?.protocol || 'Orca';
          let textData = null;
          if (protocol === 'Aave' && capture.data?.content?.aavePositions) {
            textData = capture.data.content.aavePositions;
          } else if (protocol === 'Morpho' && capture.data?.content?.morphoPositions) {
            textData = capture.data.content.morphoPositions;
          } else {
            textData = capture.data?.content?.clmPositions || null;
          }

          chrome.runtime.sendMessage({
            action: 'extractAllPositions',
            screenshot: screenshot,
            textData: textData,
            protocol: protocol,
            captureId: capture.id  // Pass capture ID for database foreign key
          })
          .then(result => {
            if (result.success) {
              console.log(`✅ AI extraction successful! ${result.savedCount}/${result.positions.length} positions saved`);
              showMessage(`✅ Extracted & saved ${result.savedCount} positions`, 'success');
            } else {
              console.error('❌ AI extraction failed:', result.error);
              showMessage('⚠️ AI extraction failed - check console', 'error');
            }
          })
          .catch(err => {
            console.error('❌ Extraction error:', err);
            showMessage('⚠️ Extraction error - check console', 'error');
          })
          .finally(() => {
            extractionInProgress = false;
          });
        } else {
          console.warn('⚠️ No screenshot available - skipping AI extraction');
        }

        loadRecentCaptures();

        // Check if there are positions with missing token breakdown
        checkForMissingBalances(capture);

        chrome.runtime.sendMessage({
          action: 'captureComplete',
          capture: capture
        });

      } else {
        console.error('❌ No success response from content script');
        console.error('Response received:', response);
        throw new Error(response?.error || 'Failed to capture page data - no valid response');
      }
    } catch (error) {
      console.error('❌ CAPTURE ERROR:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        url: currentTab?.url,
        tabId: currentTab?.id
      });

      // Better error messages for users
      let userMessage = 'Failed to capture page data';

      if (error.message && error.message.includes('Could not establish connection')) {
        userMessage = '⚠️ Content script not loaded. Please reload the page and extension, then try again.';
      } else if (error.message && error.message.includes('protocol')) {
        userMessage = '⚠️ Unsupported protocol or page. Try the positions/liquidity page.';
      } else if (response?.error) {
        userMessage = `❌ ${response.error}`;
      }

      showMessage(userMessage, 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = '📸 Capture Positions';
      captureBtn.style.opacity = '1';

      // Auto-close popup after successful capture (only if no extraction is running)
      if (response && response.success) {
        setTimeout(() => {
          // Don't close if extraction is in progress
          if (!extractionInProgress) {
            window.close();
          }
        }, 1500); // Close after 1.5 seconds
      }
    }
  });
});

function capturePageData() {
  const data = {
    text: {},
    links: [],
    images: [],
    tables: [],
    metadata: {}
  };
  
  data.metadata.capturedAt = new Date().toISOString();
  data.metadata.url = window.location.href;
  data.metadata.title = document.title;
  
  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, li, td, th');
  const textContent = new Set();
  
  textElements.forEach(element => {
    const text = element.innerText?.trim();
    if (text && text.length > 0 && text.length < 5000) {
      textContent.add(text);
    }
  });
  
  data.text.allText = Array.from(textContent);
  
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    if (elements.length > 0) {
      headings[`h${i}`] = Array.from(elements).map(el => el.innerText?.trim()).filter(Boolean);
    }
  }
  data.text.headings = headings;
  
  const links = document.querySelectorAll('a[href]');
  data.links = Array.from(links).map(link => ({
    text: link.innerText?.trim() || link.title || '',
    href: link.href,
    isExternal: !link.href.includes(window.location.hostname)
  })).filter(link => link.text || link.href);
  
  const images = document.querySelectorAll('img[src]');
  data.images = Array.from(images).map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title || '',
    width: img.naturalWidth,
    height: img.naturalHeight
  }));
  
  const tables = document.querySelectorAll('table');
  data.tables = Array.from(tables).map(table => {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText?.trim());
    const rows = Array.from(table.querySelectorAll('tr')).map(tr => {
      return Array.from(tr.querySelectorAll('td')).map(td => td.innerText?.trim());
    }).filter(row => row.length > 0);
    
    return {
      headers,
      rows,
      summary: table.getAttribute('summary') || ''
    };
  });
  
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLdScripts.length > 0) {
    data.metadata.structuredData = Array.from(jsonLdScripts).map(script => {
      try {
        return JSON.parse(script.textContent);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }
  
  const metaTags = document.querySelectorAll('meta');
  data.metadata.meta = {};
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (name && content) {
      data.metadata.meta[name] = content;
    }
  });
  
  const customDataElements = document.querySelectorAll('[data-capture], [data-track], .capture-this');
  if (customDataElements.length > 0) {
    data.customElements = Array.from(customDataElements).map(el => ({
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      text: el.innerText?.trim(),
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        if (attr.name.startsWith('data-')) {
          acc[attr.name] = attr.value;
        }
        return acc;
      }, {})
    }));
  }
  
  return data;
}

async function compareWithPrevious(capture) {
  // Only compare if we have CLM position data
  if (!capture.data?.content?.clmPositions) {
    return null;
  }

  try {
    // Get previous captures from Supabase
    const previousCaptures = await window.getCaptures({
      protocol: capture.protocol,
      limit: 10
    });

    // Find the most recent previous capture (excluding current one)
    const previousCapture = previousCaptures.find(c =>
      c.id !== capture.id &&
      c.data?.content?.clmPositions
    );

    if (!previousCapture) {
      return null;
    }

    const current = capture.data.content.clmPositions;
    const previous = previousCapture.data.content.clmPositions;

    const criticalChanges = [];
    const significantChanges = [];
    const positionsAdded = [];
    const positionsRemoved = [];

    // Create maps for easier comparison
    const currentPairs = new Map();
    current.positions.forEach(pos => {
      if (pos.pair) currentPairs.set(pos.pair, pos);
    });

    const previousPairs = new Map();
    previous.positions.forEach(pos => {
      if (pos.pair) previousPairs.set(pos.pair, pos);
    });

    // Find added positions
    currentPairs.forEach((pos, pair) => {
      if (!previousPairs.has(pair)) {
        positionsAdded.push(pair);
      }
    });

    // Find removed positions
    previousPairs.forEach((pos, pair) => {
      if (!currentPairs.has(pair)) {
        positionsRemoved.push(pair);
      }
    });

    // Compare existing positions
    currentPairs.forEach((currentPos, pair) => {
      const previousPos = previousPairs.get(pair);
      if (!previousPos) return;

      // Check if position went out of range
      if (previousPos.inRange && !currentPos.inRange) {
        criticalChanges.push(`${pair}: Position went OUT OF RANGE`);
      }

      // Check if position came back in range
      if (!previousPos.inRange && currentPos.inRange) {
        significantChanges.push(`${pair}: Position came back IN RANGE`);
      }

      // Check for large balance changes (>50%)
      if (previousPos.balance && currentPos.balance) {
        const balanceChange = Math.abs(currentPos.balance - previousPos.balance) / previousPos.balance;
        if (balanceChange > 0.5) {
          const direction = currentPos.balance > previousPos.balance ? 'increased' : 'decreased';
          const percentChange = (balanceChange * 100).toFixed(1);
          criticalChanges.push(`${pair}: Balance ${direction} by ${percentChange}%`);
        }
      }

      // Check for significant APY changes (>20% absolute change)
      if (previousPos.apy && currentPos.apy) {
        const apyChange = Math.abs(currentPos.apy - previousPos.apy);
        if (apyChange > 20) {
          const direction = currentPos.apy > previousPos.apy ? 'increased' : 'decreased';
          significantChanges.push(`${pair}: APY ${direction} from ${previousPos.apy.toFixed(1)}% to ${currentPos.apy.toFixed(1)}%`);
        }
      }

      // Check for price moving close to range boundaries
      if (currentPos.inRange && currentPos.currentPrice && currentPos.rangeMin && currentPos.rangeMax) {
        const rangeSize = currentPos.rangeMax - currentPos.rangeMin;
        const distanceToMin = Math.abs(currentPos.currentPrice - currentPos.rangeMin);
        const distanceToMax = Math.abs(currentPos.currentPrice - currentPos.rangeMax);

        if (distanceToMin < rangeSize * 0.1 || distanceToMax < rangeSize * 0.1) {
          criticalChanges.push(`${pair}: Price approaching range boundary`);
        }
      }
    });

    // Check for total portfolio value changes
    if (previous.summary?.totalValue && current.summary?.totalValue) {
      const prevValue = parseFloat(previous.summary.totalValue);
      const currValue = parseFloat(current.summary.totalValue);
      const valueChange = Math.abs(currValue - prevValue) / prevValue;

      if (valueChange > 0.2) {
        const direction = currValue > prevValue ? 'increased' : 'decreased';
        const percentChange = (valueChange * 100).toFixed(1);
        significantChanges.push(`Total portfolio value ${direction} by ${percentChange}%`);
      }
    }

    return {
      previousTimestamp: previousCapture.timestamp,
      criticalChanges,
      significantChanges,
      positionsAdded,
      positionsRemoved
    };
  } catch (error) {
    console.error('Error comparing with previous:', error);
    return null;
  }
}

async function validateCapture(capture) {
  const issues = [];
  const warnings = [];

  // Only validate if we have CLM position data
  if (!capture.data?.content?.clmPositions) {
    return { issues, warnings, passed: true };
  }

  const { clmPositions } = capture.data.content;
  const { positions, summary } = clmPositions;

  // Check summary data
  if (!summary?.totalValue) {
    warnings.push('Missing total portfolio value');
  }

  if (summary?.totalValue && parseFloat(summary.totalValue) < 0) {
    issues.push('Negative total portfolio value');
  }

  // Validate each position
  positions.forEach((pos, index) => {
    const posId = `${pos.pair || 'Position ' + (index + 1)}`;

    // Missing critical data
    if (!pos.pair) warnings.push(`${posId}: Missing pair name`);
    if (pos.balance === null || pos.balance === undefined) {
      warnings.push(`${posId}: Missing balance`);
    }

    // Range validation
    if (pos.rangeMin !== null && pos.rangeMax !== null) {
      if (pos.rangeMin > pos.rangeMax) {
        issues.push(`${posId}: Range min (${pos.rangeMin}) > range max (${pos.rangeMax})`);
      }

      // In-range logic validation
      if (pos.currentPrice && pos.rangeMin && pos.rangeMax) {
        const shouldBeInRange = pos.currentPrice >= pos.rangeMin && pos.currentPrice <= pos.rangeMax;
        if (shouldBeInRange !== pos.inRange) {
          issues.push(`${posId}: In-range logic error`);
        }
      }
    }

    // Outlier detection
    if (pos.apy && pos.apy > 10000) {
      warnings.push(`${posId}: Very high APY (${pos.apy}%)`);
    }

    if (pos.apy && pos.apy < 0) {
      issues.push(`${posId}: Negative APY`);
    }

    if (pos.balance && pos.balance < 0) {
      issues.push(`${posId}: Negative balance`);
    }
  });

  return {
    issues,
    warnings,
    passed: issues.length === 0
  };
}

// saveCapture function is now provided by supabase-client.js
// No longer using Chrome local storage

async function loadRecentCaptures() {
  try {
    // Load from Supabase instead of local storage
    const recentCaptures = await window.getRecentCaptures(5);

    if (recentCaptures.length > 0) {
      const capturesContainer = document.getElementById('recentCaptures');
      const capturesList = document.getElementById('capturesList');

      capturesContainer.style.display = 'block';
      capturesList.innerHTML = recentCaptures.map(capture => {
        const date = new Date(capture.timestamp);
        const timeStr = date.toLocaleTimeString();
        const dateStr = date.toLocaleDateString();
        const domain = new URL(capture.url).hostname;

        return `
          <div class="capture-item">
            <strong>${domain}</strong><br>
            ${dateStr} at ${timeStr}
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading recent captures:', error);
  }
}

function showMessage(text, type) {
  const messageElement = document.getElementById('message');
  messageElement.className = `message ${type}`;
  messageElement.textContent = text;
  
  setTimeout(() => {
    messageElement.innerHTML = '';
    messageElement.className = '';
  }, 3000);
}

function generateId() {
  return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check for positions with missing token breakdown and show manual input UI
function checkForMissingBalances(capture) {
  const manualSection = document.getElementById('manualBalanceSection');
  const positionSpan = document.getElementById('missingBalancePosition');
  const balanceInput = document.getElementById('balanceInput');
  const parseBtn = document.getElementById('parseBalanceBtn');

  // Look for positions with null token amounts
  const positions = capture.data?.content?.clmPositions?.positions || [];
  const missingPositions = positions.filter(pos =>
    pos.token0Amount === null || pos.token1Amount === null
  );

  if (missingPositions.length > 0) {
    // Show the manual input section for the first position with missing data
    const firstMissing = missingPositions[0];
    positionSpan.textContent = `${firstMissing.pair} ($${firstMissing.balance})`;
    manualSection.style.display = 'block';

    // Store the capture and position info for later use
    window.currentMissingBalance = {
      captureId: capture.id,
      position: firstMissing,
      allMissing: missingPositions
    };

    // Set up the parse button handler
    parseBtn.onclick = async () => {
      const pastedText = balanceInput.value.trim();
      if (!pastedText) {
        showMessage('Please paste balance data first', 'error');
        return;
      }

      parseBtn.disabled = true;
      parseBtn.textContent = 'Parsing...';

      try {
        console.log('=== PARSING BALANCE ===');
        console.log('Position object:', firstMissing);
        console.log('token0:', firstMissing.token0);
        console.log('token1:', firstMissing.token1);
        console.log('pair:', firstMissing.pair);

        // If token0/token1 aren't set, try to extract from pair name
        let token0 = firstMissing.token0;
        let token1 = firstMissing.token1;

        if (!token0 || !token1) {
          console.log('token0/token1 not set, extracting from pair:', firstMissing.pair);
          const pairMatch = firstMissing.pair.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
          if (pairMatch) {
            token0 = pairMatch[1];
            token1 = pairMatch[2];
            console.log('Extracted from pair:', token0, token1);
          }
        }

        console.log('Calling parseBalanceText with:', token0, token1);
        const parsed = parseBalanceText(pastedText, token0, token1);
        console.log('Parse result:', parsed);

        if (!parsed.token0Amount) {
          showMessage('Could not parse balance data. Check format.', 'error');
          console.error('Parsing failed - no token0Amount found');
          parseBtn.disabled = false;
          parseBtn.textContent = 'Parse & Save Balance';
          return;
        }

        // Update the position in database
        const updated = await updatePositionBalance(firstMissing.pair, capture.timestamp, parsed);

        if (updated) {
          showMessage('✅ Balance updated!', 'success');
          balanceInput.value = '';

          // If there are more missing positions, show the next one
          const remainingMissing = missingPositions.slice(1);
          if (remainingMissing.length > 0) {
            setTimeout(() => {
              const nextMissing = remainingMissing[0];
              positionSpan.textContent = `${nextMissing.pair} ($${nextMissing.balance})`;
              window.currentMissingBalance.position = nextMissing;
              window.currentMissingBalance.allMissing = remainingMissing;
            }, 1000);
          } else {
            // All done!
            setTimeout(() => {
              manualSection.style.display = 'none';
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error parsing balance:', error);
        showMessage('Failed to update balance', 'error');
      } finally {
        parseBtn.disabled = false;
        parseBtn.textContent = 'Parse & Save Balance';
      }
    };
  } else {
    manualSection.style.display = 'none';
  }
}

// Parse pasted balance text to extract token amounts and percentages
function parseBalanceText(text, token0, token1) {
  const result = {
    token0Amount: null,
    token1Amount: null,
    token0Percentage: null,
    token1Percentage: null
  };

  console.log('Parsing balance text:', text);
  console.log('Looking for tokens:', token0, token1);

  // Strip trailing zeros from token names (e.g., "USDC0" -> "USDC")
  // This handles the fee tier suffix that Orca adds
  token0 = token0.replace(/0+$/, '');
  token1 = token1.replace(/0+$/, '');

  console.log('Tokens after stripping trailing zeros:', token0, token1);

  // Normalize text - replace multiple spaces/newlines with single space
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Pattern 1: Token name followed by amount, percentage, and USD value
  // Example: "cbBTC 0.03512628 36.7% $3,722"
  const pattern1Token0 = new RegExp(`${token0}\\s+([0-9.,]+)\\s+([0-9.]+)%`, 'i');
  const pattern1Token1 = new RegExp(`${token1}\\s+([0-9.,]+)\\s+([0-9.]+)%`, 'i');

  let match0 = normalized.match(pattern1Token0);
  let match1 = normalized.match(pattern1Token1);

  // Pattern 2: Separate lines
  // Orca format: Amount\nToken\nPercentage%\n$Value
  if (!match0 || !match1) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);

    // Find token0 - look for standalone token name (exact match or very close)
    // Avoid matching "USDC per cbBTC", only match standalone "cbBTC"
    const token0Index = lines.findIndex(l => {
      const line = l.toLowerCase().trim();
      const token = token0.toLowerCase();
      // Exact match or token is the only thing on the line
      return line === token || line === `${token}0` ||
             (line.includes(token) && line.split(/\s+/).length === 1);
    });

    if (token0Index >= 0) {
      // Amount is on the line BEFORE token name
      if (token0Index > 0 && token0Index + 1 < lines.length) {
        const amount = lines[token0Index - 1]; // Line before token name
        const percentage = lines[token0Index + 1].replace('%', ''); // Line after token name

        if (amount && percentage && /^[0-9.,]+$/.test(amount)) {
          result.token0Amount = parseFloat(amount.replace(/,/g, ''));
          result.token0Percentage = parseFloat(percentage);
        }
      }
    }

    // Find token1 - same logic
    const token1Index = lines.findIndex(l => {
      const line = l.toLowerCase().trim();
      const token = token1.toLowerCase();
      // Exact match or token is the only thing on the line
      return line === token || line === `${token}0` ||
             (line.includes(token) && line.split(/\s+/).length === 1);
    });

    if (token1Index >= 0) {
      // Amount is on the line BEFORE token name
      if (token1Index > 0 && token1Index + 1 < lines.length) {
        const amount = lines[token1Index - 1]; // Line before token name
        const percentage = lines[token1Index + 1].replace('%', ''); // Line after token name

        if (amount && percentage && /^[0-9.,]+$/.test(amount)) {
          result.token1Amount = parseFloat(amount.replace(/,/g, ''));
          result.token1Percentage = parseFloat(percentage);
        }
      }
    }
  } else {
    // Use pattern 1 matches
    result.token0Amount = parseFloat(match0[1].replace(/,/g, ''));
    result.token0Percentage = parseFloat(match0[2]);
    result.token1Amount = parseFloat(match1[1].replace(/,/g, ''));
    result.token1Percentage = parseFloat(match1[2]);
  }

  console.log('Parsed result:', result);
  return result;
}

// Update position balance in Supabase database
async function updatePositionBalance(pair, capturedAt, balanceData) {
  console.log(`📝 Updating database for ${pair}:`, balanceData);
  console.log(`   Looking for: pair="${pair}", captured_at="${capturedAt}"`);

  try {
    const { data, error } = await window.supabase
      .from('positions')
      .update({
        token0_amount: balanceData.token0Amount,
        token1_amount: balanceData.token1Amount,
        token0_percentage: balanceData.token0Percentage,
        token1_percentage: balanceData.token1Percentage
      })
      .eq('pair', pair)
      .eq('captured_at', capturedAt)
      .select();  // Add .select() to return the updated row

    if (error) {
      console.error('❌ Supabase update error:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully updated position in database:', data);
      return true;
    } else {
      console.warn('⚠️  No rows updated - position not found with pair and timestamp');
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating position:', error);
    return false;
  }
}

// Auto-extract token data (runs automatically after list view capture)
async function autoExtractTokenDataPrompt(missingPositions) {
  // Calculate cost estimate
  const costPerPosition = 0.0005; // $0.0005 for Haiku model (typical cost per image analysis)
  const estimatedCost = (missingPositions.length * costPerPosition).toFixed(4);

  // Always auto-extract - no confirmation needed
  console.log(`🤖 Auto-extracting token data for ${missingPositions.length} positions (cost: ~$${estimatedCost}, time: ~${Math.ceil(missingPositions.length * 1.5)}s)`);

  // Mark extraction as in progress to prevent popup from closing
  extractionInProgress = true;

  try {
    // Prepare positions for batch extraction (need to get their indices)
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getBatchPositions'
    });

    if (response && response.success) {
      const positions = response.positions;
      const positionsNeedingExtraction = positions.filter(p => p.needsExtraction);

      if (positionsNeedingExtraction.length > 0) {
        await startBatchExtraction(positionsNeedingExtraction);
      } else {
        console.log('ℹ️ All positions already have token data');
        showMessage('All positions already have token data', 'success');
      }
    } else {
      console.error('❌ Failed to prepare batch extraction:', response?.error);
      showMessage('Failed to prepare batch extraction', 'error');
    }
  } finally {
    // Mark extraction as complete
    extractionInProgress = false;
  }
}

// Batch extraction coordinator
async function startBatchExtraction(positions) {
  const progressBar = document.getElementById('batchProgress');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  const progressStats = document.getElementById('progressStats');
  const captureBtn = document.getElementById('captureBtn');

  // Disable capture button and show progress
  captureBtn.disabled = true;
  captureBtn.textContent = 'Extracting token data...';
  progressBar.classList.add('active');

  let successCount = 0;
  let failedCount = 0;
  const total = positions.length;
  const startTime = Date.now();

  try {
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const current = i + 1;

      // Update progress UI
      progressText.textContent = `Extracting ${current}/${total}: ${position.pair}`;
      progressFill.style.width = `${(current / total) * 100}%`;
      progressStats.textContent = `Success: ${successCount} | Failed: ${failedCount}`;

      try {
        // Step 1: Expand position
        progressText.textContent = `Expanding ${position.pair}... (${current}/${total})`;
        const expandResponse = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'expandPosition',
          index: position.index,
          protocol: position.protocol
        });

        if (!expandResponse || !expandResponse.success) {
          console.warn(`Failed to expand position ${position.pair}:`, expandResponse?.error);
          failedCount++;
          continue;
        }

        // Step 2: Wait for drawer to fully open
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 3: Capture screenshot
        progressText.textContent = `Capturing ${position.pair}... (${current}/${total})`;
        const screenshot = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
          format: 'png',
          quality: 90
        });

        // Step 4: Extract and save via background script
        progressText.textContent = `Analyzing ${position.pair}... (${current}/${total})`;

        // Get current capture timestamp from database
        const captures = await window.getRecentCaptures(1);
        const captureTimestamp = captures.length > 0 ? captures[0].timestamp : new Date().toISOString();

        const extractResult = await chrome.runtime.sendMessage({
          action: 'extractBalanceFromScreenshot',
          screenshot: screenshot,
          captureTimestamp: captureTimestamp,
          allPositions: [{ pair: position.pair }]
        });

        if (extractResult && extractResult.success) {
          successCount++;
          console.log(`✅ Successfully extracted ${position.pair}`);
        } else {
          failedCount++;
          console.warn(`❌ Failed to extract ${position.pair}:`, extractResult?.error);
        }

        // Step 5: Close position
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'closePosition',
          protocol: position.protocol
        });

        // Brief delay before next position
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Error processing ${position.pair}:`, error);
        failedCount++;

        // Try to close position on error
        try {
          await chrome.tabs.sendMessage(currentTab.id, {
            action: 'closePosition',
            protocol: position.protocol
          });
        } catch (closeError) {
          console.warn('Failed to close position after error:', closeError);
        }
      }
    }

    // Show completion message
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const message = `Extraction complete! ${successCount}/${total} successful (${duration}s)`;

    progressText.textContent = message;
    progressStats.textContent = `Extracted ${successCount} positions in ${duration} seconds`;

    if (successCount > 0) {
      showMessage(`✅ ${message}`, 'success');
    } else {
      showMessage(`❌ Extraction failed for all positions`, 'error');
    }

    // Hide progress bar and auto-close popup after showing results
    setTimeout(() => {
      progressBar.classList.remove('active');
      // Auto-close popup after extraction completes
      setTimeout(() => {
        window.close();
      }, 1000);
    }, 2000);

  } catch (error) {
    console.error('Batch extraction error:', error);
    showMessage('Batch extraction failed: ' + error.message, 'error');
    progressBar.classList.remove('active');
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = '📸 Capture Positions';
  }
}

// Extract balance data from screenshot using AI Vision for all positions with missing data
async function extractBalancesFromScreenshot(capture, screenshot) {
  console.log('🤖 Starting AI Vision extraction for capture:', capture.id);

  const positions = capture.data?.content?.clmPositions?.positions || [];
  const missingPositions = positions.filter(pos =>
    pos.token0Amount === null || pos.token1Amount === null
  );

  if (missingPositions.length === 0) {
    console.log('No positions with missing balance data');
    return;
  }

  console.log(`Found ${missingPositions.length} position(s) with missing balance data`);
  console.log('Note: Only ONE position should be expanded in the screenshot');

  // Call background worker ONCE to discover which position is expanded
  console.log('\n🔍 Analyzing screenshot to identify expanded position...');

  const allPairs = missingPositions.map(p => p.pair);
  console.log(`   Available pairs: ${allPairs.join(', ')}`);

  const result = await chrome.runtime.sendMessage({
    action: 'extractBalanceFromScreenshot',
    screenshot: screenshot,
    allPairs: allPairs  // Send all pairs for context
  });

  console.log('   API call result:', result);

  if (!result.success) {
    console.log('⚠️  No expanded position found in screenshot');
    console.log('   Make sure to expand ONE position before capturing');
    return;
  }

  const extracted = result.data;
  console.log(`✅ Found expanded position: ${extracted.pair}`);
  console.log(`   ${extracted.token0}: ${extracted.token0Amount} (${extracted.token0Percentage}%)`);
  console.log(`   ${extracted.token1}: ${extracted.token1Amount} (${extracted.token1Percentage}%)`);

  // Match extracted pair to database position
  // Handle variants like "SOL/USDC0" vs "SOL/USDC"
  console.log(`🔍 Matching against positions:`, missingPositions.map(p => p.pair));

  const matchedPosition = missingPositions.find(pos => {
    const posTokens = pos.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
    const extractedTokens = extracted.pair.split('/').map(t => t.trim().replace(/0+$/, ''));
    console.log(`   Comparing ${pos.pair} [${posTokens}] vs ${extracted.pair} [${extractedTokens}]`);
    return posTokens[0] === extractedTokens[0] && posTokens[1] === extractedTokens[1];
  });

  if (!matchedPosition) {
    console.error(`❌ Extracted pair ${extracted.pair} doesn't match any position in the capture`);
    console.error(`   Available positions: ${allPairs.join(', ')}`);
    return;
  }

  console.log(`🎯 Matched to database position: ${matchedPosition.pair}`);

  // Update the CORRECT position in database
  const updated = await updatePositionBalance(
    matchedPosition.pair,
    capture.timestamp,
    {
      token0Amount: extracted.token0Amount,
      token1Amount: extracted.token1Amount,
      token0Percentage: extracted.token0Percentage,
      token1Percentage: extracted.token1Percentage
    }
  );

  if (updated) {
    console.log(`✅ Database updated for ${matchedPosition.pair}`);
    console.log(`🤖 AI Vision extraction completed successfully`);
  } else {
    console.error(`❌ Failed to update database for ${matchedPosition.pair}`);
  }
}
