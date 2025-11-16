console.log('🎯 Brave Capture content script loaded on:', window.location.href);

let isCapturing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received in content script:', request);

  if (request.action === 'captureData') {
    console.log('🚀 Starting capture process...');

    if (isCapturing) {
      console.warn('⚠️ Capture already in progress');
      sendResponse({ error: 'Capture already in progress' });
      return true;
    }

    isCapturing = true;

    // Use smart waiting for all protocol pages
    (async () => {
      try {
        // Wait for data to be fully loaded
        if (typeof window.smartWaitForData === 'function') {
          console.log('🧠 Smart wait for data...');
          const waitStartTime = Date.now();
          await window.smartWaitForData();
          const waitTime = Date.now() - waitStartTime;
          console.log(`⏱️ Wait completed in ${waitTime}ms`);
        } else {
          // Fallback to basic wait if smart wait not available
          console.log('⚠️ Smart wait not available, using 1s delay');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Capture after data is ready
        console.log('📸 Starting DOM parsing...');
        const captureStartTime = Date.now();
        const captureData = performDetailedCapture();
        const captureTime = Date.now() - captureStartTime;
        console.log(`✅ Capture completed in ${captureTime}ms`);
        sendResponse({ success: true, data: captureData });
      } catch (error) {
        console.error('Error capturing data:', error);
        console.error('Error stack:', error.stack);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      } finally {
        isCapturing = false;
      }
    })();

    return true; // Keep connection open for async response
  }

  if (request.action === 'highlightElements') {
    highlightCaptureElements();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getBatchPositions') {
    (async () => {
      try {
        const positions = await getBatchPositionsList();
        sendResponse({ success: true, positions: positions });
      } catch (error) {
        console.error('Error getting batch positions:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'expandPosition') {
    (async () => {
      try {
        await expandPosition(request.index, request.protocol);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error expanding position:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'closePosition') {
    (async () => {
      try {
        await closePosition(request.protocol);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error closing position:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

function performDetailedCapture() {
  console.log('📸 performDetailedCapture() called');
  console.log('URL:', window.location.href);
  console.log('Hostname:', window.location.hostname);

  const capture = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    domain: window.location.hostname,
    path: window.location.pathname,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    },
    content: {},
    performance: {}
  };

  capture.content.forms = captureForms();
  capture.content.media = captureMedia();
  capture.content.dynamicContent = captureDynamicContent();
  capture.content.dataAttributes = captureDataAttributes();
  capture.content.textHierarchy = captureTextHierarchy();
  capture.content.images = captureImages();
  capture.content.links = captureLinks();
  capture.content.tables = captureTables();
  capture.content.text = captureText();

  // Detect and parse CLM positions (protocol-specific)
  if (window.location.hostname.includes('orca.so')) {
    try {
      capture.content.clmPositions = captureOrcaCLMPositions();
      capture.protocol = 'Orca';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Orca';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('raydium.io')) {
    try {
      capture.content.clmPositions = captureRaydiumCLMPositions();
      capture.protocol = 'Raydium';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Raydium';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('aerodrome.finance')) {
    try {
      capture.content.clmPositions = captureAerodromeCLMPositions();
      capture.protocol = 'Aerodrome';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Aerodrome';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('cetus.zone') || window.location.hostname.includes('app.cetus.zone')) {
    try {
      capture.content.clmPositions = captureCetusCLMPositions();
      capture.protocol = 'Cetus';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Cetus';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('hyperion')) {
    try {
      capture.content.clmPositions = captureHyperionCLMPositions();
      capture.protocol = 'Hyperion';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Hyperion';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('pancakeswap.finance')) {
    try {
      capture.content.clmPositions = capturePancakeSwapCLMPositions();
      capture.protocol = 'PancakeSwap';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'PancakeSwap';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('uniswap.org')) {
    try {
      capture.content.clmPositions = captureUniswapCLMPositions();
      capture.protocol = 'Uniswap';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Uniswap';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('ekubo.org')) {
    try {
      capture.content.clmPositions = captureEkuboCLMPositions();
      capture.protocol = 'Ekubo';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Ekubo';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('beefy')) {
    try {
      capture.content.clmPositions = captureBeefyCLMPositions();
      capture.protocol = 'Beefy';
    } catch (error) {
      console.error('Error parsing CLM positions:', error);
      capture.protocol = 'Beefy';
      capture.content.clmPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('hyperliquid.xyz')) {
    try {
      capture.content.hyperliquidPositions = captureHyperliquidPositions();
      capture.protocol = 'Hyperliquid';
    } catch (error) {
      console.error('Error parsing Hyperliquid positions:', error);
      capture.protocol = 'Hyperliquid';
      capture.content.hyperliquidPositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('aave.com')) {
    try {
      capture.content.aavePositions = captureAavePositions();
      capture.protocol = 'Aave';
    } catch (error) {
      console.error('Error parsing Aave positions:', error);
      capture.protocol = 'Aave';
      capture.content.aavePositions = { error: error.message };
    }
  } else if (window.location.hostname.includes('morpho.org')) {
    try {
      // Check if it's a position detail page or dashboard
      if (window.location.pathname.includes('/market/')) {
        console.log('Detected Morpho position detail page');
        const detailData = captureMorphoPositionDetail();
        capture.content.morphoPositions = {
          positions: detailData.hasData ? [detailData.position] : [],
          positionCount: detailData.hasData ? 1 : 0,
          totalCollateral: detailData.totalCollateral,
          isDetailPage: true
        };
        capture.protocol = 'Morpho';
      } else {
        console.log('Detected Morpho dashboard page');
        capture.content.morphoPositions = captureMorphoPositions();
        capture.protocol = 'Morpho';
      }
    } catch (error) {
      console.error('Error parsing Morpho positions:', error);
      capture.protocol = 'Morpho';
      capture.content.morphoPositions = { error: error.message };
    }
  }

  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    capture.performance = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: timing.responseStart - timing.navigationStart
    };
  }

  return capture;
}

function captureForms() {
  const forms = document.querySelectorAll('form');
  return Array.from(forms).map(form => {
    const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
      type: input.type || input.tagName.toLowerCase(),
      name: input.name,
      id: input.id,
      value: input.type === 'password' ? '[REDACTED]' : input.value,
      placeholder: input.placeholder || '',
      required: input.required,
      checked: input.checked,
      options: input.tagName === 'SELECT' ? Array.from(input.options).map(opt => ({
        text: opt.text,
        value: opt.value,
        selected: opt.selected
      })) : undefined
    }));
    
    return {
      action: form.action,
      method: form.method,
      id: form.id,
      name: form.name,
      inputs: inputs
    };
  });
}

function captureMedia() {
  const videos = document.querySelectorAll('video');
  const audios = document.querySelectorAll('audio');
  const iframes = document.querySelectorAll('iframe');
  
  return {
    videos: Array.from(videos).map(video => ({
      src: video.src || video.currentSrc,
      duration: video.duration,
      currentTime: video.currentTime,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      width: video.width,
      height: video.height
    })),
    audios: Array.from(audios).map(audio => ({
      src: audio.src || audio.currentSrc,
      duration: audio.duration,
      currentTime: audio.currentTime,
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume
    })),
    iframes: Array.from(iframes).map(iframe => ({
      src: iframe.src,
      width: iframe.width,
      height: iframe.height,
      title: iframe.title
    }))
  };
}

function captureDynamicContent() {
  const dynamic = {
    ajaxElements: [],
    lazyLoadedImages: [],
    infiniteScrollElements: []
  };
  
  const observedElements = document.querySelectorAll('[data-loaded], [data-src], .lazy-load, .ajax-content');
  dynamic.ajaxElements = Array.from(observedElements).map(el => ({
    tag: el.tagName.toLowerCase(),
    classes: Array.from(el.classList),
    dataSrc: el.getAttribute('data-src'),
    loaded: el.getAttribute('data-loaded') === 'true',
    content: el.innerText?.trim().substring(0, 200)
  }));
  
  const lazyImages = document.querySelectorAll('img[data-src], img.lazy, img[loading="lazy"]');
  dynamic.lazyLoadedImages = Array.from(lazyImages).map(img => ({
    currentSrc: img.src,
    dataSrc: img.getAttribute('data-src'),
    loaded: img.complete && img.naturalWidth > 0,
    alt: img.alt
  }));
  
  const scrollContainers = document.querySelectorAll('[data-infinite-scroll], .infinite-scroll, [data-pagination]');
  dynamic.infiniteScrollElements = Array.from(scrollContainers).map(container => ({
    tag: container.tagName.toLowerCase(),
    id: container.id,
    classes: Array.from(container.classList),
    childCount: container.children.length,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight
  }));
  
  return dynamic;
}

function captureDataAttributes() {
  const elementsWithData = document.querySelectorAll('*[data-id], *[data-value], *[data-price], *[data-name], *[data-category], *[data-tracking]');
  
  return Array.from(elementsWithData).map(el => {
    const dataAttrs = {};
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        dataAttrs[attr.name] = attr.value;
      }
    });
    
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      classes: Array.from(el.classList),
      text: el.innerText?.trim().substring(0, 100),
      dataAttributes: dataAttrs
    };
  });
}

function captureTextHierarchy() {
  const hierarchy = {
    mainContent: '',
    sections: [],
    lists: [],
    emphasis: []
  };
  
  const main = document.querySelector('main, [role="main"], #main, .main-content');
  if (main) {
    hierarchy.mainContent = main.innerText?.trim().substring(0, 1000);
  }
  
  const sections = document.querySelectorAll('section, article, [role="article"]');
  hierarchy.sections = Array.from(sections).slice(0, 10).map(section => ({
    heading: section.querySelector('h1, h2, h3')?.innerText?.trim(),
    text: section.innerText?.trim().substring(0, 500),
    id: section.id,
    classes: Array.from(section.classList)
  }));
  
  const lists = document.querySelectorAll('ul, ol');
  hierarchy.lists = Array.from(lists).slice(0, 10).map(list => ({
    type: list.tagName.toLowerCase(),
    itemCount: list.children.length,
    items: Array.from(list.children).slice(0, 5).map(li => li.innerText?.trim())
  }));
  
  const emphasisElements = document.querySelectorAll('strong, b, em, i, mark, .highlight, .important');
  hierarchy.emphasis = Array.from(emphasisElements).slice(0, 20).map(el => ({
    tag: el.tagName.toLowerCase(),
    text: el.innerText?.trim(),
    classes: Array.from(el.classList)
  }));
  
  return hierarchy;
}

/**
 * Helper function to extract token breakdown from text
 * Looks for patterns like:
 * - "46.5366441 SOL 37.6%" with "$7,612.31" nearby
 * - "12654.5291 USDC (62.4%) $12,652.93"
 *
 * @param {string} text - The text to search in
 * @param {string} token0 - First token symbol (e.g., "SOL")
 * @param {string} token1 - Second token symbol (e.g., "USDC")
 * @returns {object} - Token breakdown with amounts, percentages, and values
 */
function extractTokenBreakdown(text, token0, token1) {
  const breakdown = {};

  if (!text || !token0 || !token1) {
    return breakdown;
  }

  // Orca displays token data in multi-line format:
  // 38.3322071
  // SOL
  // 31.5%
  // $6,432.82
  //
  // Pattern: amount (newline) token name (newline) percentage (newline) dollar value

  // Replace newlines with spaces to make regex easier, but keep original for debugging
  const textOneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  // Try multiple patterns for token0
  // Pattern 1: "46.5366441 SOL 37.6%"
  // Pattern 2: "46.5366441 SOL (37.6%)"
  // Pattern 3: Multi-line: amount...token...percentage
  const token0Patterns = [
    new RegExp(`([0-9,.]+)\\s+${token0}\\s+([0-9.]+)%`, 'i'),
    new RegExp(`([0-9,.]+)\\s+${token0}\\s*\\(\\s*([0-9.]+)%\\s*\\)`, 'i'),
    new RegExp(`([0-9,.]+)\\s+${token0}\\s+([0-9.]+)(?!\\d)`, 'i')
  ];

  for (const pattern of token0Patterns) {
    const match = textOneLine.match(pattern);
    if (match) {
      breakdown.token0Amount = parseFloat(match[1].replace(/,/g, ''));
      breakdown.token0Percentage = parseFloat(match[2]);

      // Look for USD value nearby (within 150 chars)
      const matchIndex = textOneLine.indexOf(match[0]);
      const section = textOneLine.substring(matchIndex, matchIndex + 150);
      const valueMatch = section.match(/\$([0-9,]+\.?[0-9]*)/);
      if (valueMatch) {
        breakdown.token0Value = parseFloat(valueMatch[1].replace(/,/g, ''));
      }
      break;
    }
  }

  // Try same patterns for token1
  const token1Patterns = [
    new RegExp(`([0-9,.]+)\\s+${token1}\\s+([0-9.]+)%`, 'i'),
    new RegExp(`([0-9,.]+)\\s+${token1}\\s*\\(\\s*([0-9.]+)%\\s*\\)`, 'i'),
    new RegExp(`([0-9,.]+)\\s+${token1}\\s+([0-9.]+)(?!\\d)`, 'i')
  ];

  for (const pattern of token1Patterns) {
    const match = textOneLine.match(pattern);
    if (match) {
      breakdown.token1Amount = parseFloat(match[1].replace(/,/g, ''));
      breakdown.token1Percentage = parseFloat(match[2]);

      // Look for USD value nearby
      const matchIndex = textOneLine.indexOf(match[0]);
      const section = textOneLine.substring(matchIndex, matchIndex + 150);
      const valueMatch = section.match(/\$([0-9,]+\.?[0-9]*)/);
      if (valueMatch) {
        breakdown.token1Value = parseFloat(valueMatch[1].replace(/,/g, ''));
      }
      break;
    }
  }

  return breakdown;
}

/**
 * Set token breakdown fields to null when real data isn't available
 * DO NOT calculate or estimate - only use real extracted data
 */
function setTokenBreakdownNull(position) {
  position.token0Amount = null;
  position.token1Amount = null;
  position.token0Value = null;
  position.token1Value = null;
  position.token0Percentage = null;
  position.token1Percentage = null;
}

function extractExpandedOrcaPositions() {
  console.log('🔍 Looking for manually expanded Orca position details...');
  const tokenBreakdowns = new Map();

  // Look for the drawer/panel that appears when positions are expanded
  // Based on the HTML you showed: right-sliding drawer with position details
  const drawerSelectors = [
    '.fixed.inset-0.z-50',
    '[role="dialog"]',
    '[data-sentry-component="LaunchpadRewards"]',
    '[class*="drawer"]',
    '.shadow-right'
  ];

  let detailsPanel = null;
  let detailsText = '';

  for (const selector of drawerSelectors) {
    const panels = document.querySelectorAll(selector);

    for (const panel of panels) {
      // Check if panel is visible
      if (panel.offsetHeight > 0 && panel.offsetWidth > 0) {
        // Try different methods to extract text from the drawer
        let text = panel.textContent || panel.innerText || '';

        // Check for Shadow DOM
        if (text.length === 0) {
          const getAllTextWithShadow = (element, depth = 0) => {
            const texts = [];
            if (element.shadowRoot) {
              const shadowText = element.shadowRoot.textContent || element.shadowRoot.innerText || '';
              if (shadowText) texts.push(shadowText);
              for (const child of element.shadowRoot.children) {
                texts.push(...getAllTextWithShadow(child, depth + 1));
              }
            }
            for (const child of element.children || []) {
              texts.push(...getAllTextWithShadow(child, depth + 1));
            }
            for (const node of element.childNodes) {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                texts.push(node.textContent.trim());
              }
            }
            return texts;
          };
          text = getAllTextWithShadow(panel).join(' ');
        }

        // Check child containers if still no text
        if (text.length === 0) {
          const containers = panel.querySelectorAll('div, section, article, main');
          for (const container of containers) {
            const containerText = container.innerText || container.textContent || '';
            if (containerText.length > text.length) text = containerText;
          }
        }

        // Check if we found text with balance data
        if (text.includes('Balance') && (text.match(/%/g) || []).length >= 2) {
          detailsPanel = panel;
          detailsText = text;
          console.log(`   ✅ Found details panel with: ${selector}`);
          break;
        } else if (text.length > detailsText.length) {
          detailsPanel = panel;
          detailsText = text;
        }
      }
    }
    if (detailsPanel && detailsText.includes('Balance')) break;
  }

  if (detailsPanel && detailsText.length > 0) {
    // Try to extract the pair name from the panel
    const pairMatch = detailsText.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)(?:[0-9.]+%)?/);
    if (pairMatch) {
      let token0 = pairMatch[1];
      let token1 = pairMatch[2].replace(/0+$/, ''); // Remove trailing zeros
      const pair = `${token0}/${token1}`;

      // Look for balance breakdown section
      let balanceSection = null;
      const balanceElements = detailsPanel.querySelectorAll('[class*="balance"], [class*="Balance"], [class*="token"]');

      for (const el of balanceElements) {
        const elText = el.innerText || el.textContent || '';
        if (elText.includes('%') && elText.length > 10) {
          balanceSection = elText;
          break;
        }
      }

      if (!balanceSection) {
        const allElements = detailsPanel.querySelectorAll('*');
        for (const el of allElements) {
          const elText = el.innerText || el.textContent || '';
          if (elText.includes(token0) && elText.includes(token1) && (elText.match(/%/g) || []).length >= 2) {
            balanceSection = elText;
            break;
          }
        }
      }

      const textToSearch = balanceSection || detailsText;
      const breakdown = extractTokenBreakdown(textToSearch, token0, token1);

      if (breakdown.token0Amount) {
        // Store with variants for matching
        tokenBreakdowns.set(pair, breakdown);
        tokenBreakdowns.set(`${token0}0/${token1}0`, breakdown);
        tokenBreakdowns.set(`${token0}/${token1}0`, breakdown);
        tokenBreakdowns.set(`${token0}0/${token1}`, breakdown);

        console.log(`   ✅ Extracted: ${token0} ${breakdown.token0Amount} (${breakdown.token0Percentage}%), ${token1} ${breakdown.token1Amount} (${breakdown.token1Percentage}%)`);
      }
    }
  } else {
    console.log('   ℹ️ No expanded position details found. Screenshot will be analyzed by AI.');
  }

  console.log(`🎯 Extracted token breakdown for ${tokenBreakdowns.size / 4} position(s)`);
  return tokenBreakdowns;
}

function captureOrcaCLMPositions() {
  console.log('🐋 Parsing Orca positions...');
  const positions = [];

  // Extract token breakdown from any manually expanded positions
  const tokenBreakdowns = extractExpandedOrcaPositions();

  // Try to capture portfolio summary
  const portfolioSummary = {};

  // Total Value - look for the heading and nearby value
  const totalValueHeading = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.trim() === 'Total Value'
  );
  if (totalValueHeading) {
    // Look for sibling or parent with the dollar amount
    let parent = totalValueHeading.parentElement;
    for (let i = 0; i < 3; i++) {
      const match = parent?.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
      if (match) {
        portfolioSummary.totalValue = match[1].replace(/,/g, '');
        console.log('Found Total Value:', match[1]);
        break;
      }
      parent = parent?.parentElement;
    }
  }

  // Estimated Yield (365D)
  const yieldHeading = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.includes('Estimated Yield') && el.textContent.includes('365D')
  );
  if (yieldHeading) {
    let parent = yieldHeading.parentElement;
    for (let i = 0; i < 3; i++) {
      const text = parent?.textContent || '';
      const amountMatch = text.match(/\$([0-9,]+\.[0-9]{2})/);
      const percentMatch = text.match(/([0-9]+\.[0-9]+)%/);
      if (amountMatch) {
        portfolioSummary.estimatedYieldAmount = amountMatch[1].replace(/,/g, '');
        console.log('Found Estimated Yield Amount:', amountMatch[1]);
      }
      if (percentMatch) {
        portfolioSummary.estimatedYieldPercent = percentMatch[1];
        console.log('Found Estimated Yield Percent:', percentMatch[1] + '%');
      }
      if (amountMatch && percentMatch) break;
      parent = parent?.parentElement;
    }
  }

  // Pending Yield
  const pendingHeading = Array.from(document.querySelectorAll('*')).find(el =>
    el.textContent.trim() === 'Pending Yield'
  );
  if (pendingHeading) {
    let parent = pendingHeading.parentElement;
    for (let i = 0; i < 3; i++) {
      const match = parent?.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
      if (match) {
        portfolioSummary.pendingYield = match[1].replace(/,/g, '');
        console.log('Found Pending Yield:', match[1]);
        break;
      }
      parent = parent?.parentElement;
    }
  }

  // Find all table rows with position data
  const rows = document.querySelectorAll('table tbody tr, [role="row"]');
  console.log(`Found ${rows.length} potential position rows`);

  rows.forEach((row, rowIndex) => {
    try {
      const cells = row.querySelectorAll('td, [role="cell"]');
      console.log(`Row ${rowIndex}: ${cells.length} cells`);

      if (cells.length < 6) {
        return; // Need at least 6 cells for position data
      }

      const position = {};

      // Pool name and fee tier (first cell)
      const poolText = cells[0]?.textContent?.trim();
      if (poolText && poolText.includes('/')) {
        const poolMatch = poolText.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
        const feeMatch = poolText.match(/([0-9.]+)%/);
        if (poolMatch) {
          position.token0 = poolMatch[1];
          position.token1 = poolMatch[2];
          position.pair = `${poolMatch[1]}/${poolMatch[2]}`;
        }
        if (feeMatch) {
          position.feeTier = feeMatch[1];
        }
      }

      // Balance (second cell)
      const balanceText = cells[1]?.textContent?.trim();
      const balanceMatch = balanceText?.match(/\$([0-9,]+\.[0-9]{2})/);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        position.balanceFormatted = balanceMatch[1];
      }

      // Pending Yield (third cell)
      const pendingYieldText = cells[2]?.textContent?.trim();
      const pendingYieldMatch = pendingYieldText?.match(/\$([0-9,]+\.[0-9]{2})/);
      if (pendingYieldMatch) {
        position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
        position.pendingYieldFormatted = pendingYieldMatch[1];
      }

      // Est. Yield APY (fourth cell)
      const apyText = cells[3]?.textContent?.trim();
      const apyMatch = apyText?.match(/([0-9.]+)%/);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
      }

      // Position Range (fifth cell) - use innerText which preserves line breaks
      const rangeCell = cells[4];
      const rangeText = rangeCell?.innerText || rangeCell?.textContent || '';

      // Split by line breaks to get individual values
      const lines = rangeText.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

      const rangeNumbers = [];
      const percentages = [];

      // Parse each line
      for (const line of lines) {
        if (line.includes('%')) {
          // This is a percentage line
          const pcts = line.match(/([+-]?[0-9.]+%)/g);
          if (pcts) percentages.push(...pcts);
        } else {
          // This should be a range values line
          // Extract all decimal numbers from this line
          const nums = line.match(/([0-9]+\.?[0-9]+)/g);
          if (nums) {
            nums.forEach(n => rangeNumbers.push(parseFloat(n)));
          }
        }
      }

      // Remove duplicates by converting to Set and back to array
      const uniqueRangeNumbers = [...new Set(rangeNumbers)];

      if (uniqueRangeNumbers.length >= 2) {
        position.rangeMin = uniqueRangeNumbers[0];
        position.rangeMax = uniqueRangeNumbers[1];
      }

      // Filter percentages to only include actual percentage strings
      const actualPercentages = percentages.filter(p => p.includes('%') && p.match(/^[+-]?\d/));
      if (actualPercentages.length >= 2) {
        position.rangeMinPercent = actualPercentages[0];
        position.rangeMaxPercent = actualPercentages[1];
      }

      // Current Price (sixth cell)
      const priceText = cells[5]?.textContent?.trim();
      if (priceText) {
        const priceMatch = priceText.match(/([0-9.]+)/);
        if (priceMatch) {
          position.currentPrice = parseFloat(priceMatch[1]);
          position.currentPriceFormatted = priceText;
        }
      }

      // Calculate if position is in range
      if (position.rangeMin && position.rangeMax && position.currentPrice) {
        position.inRange = position.currentPrice >= position.rangeMin &&
                          position.currentPrice <= position.rangeMax;

        // Calculate distance from range boundaries
        if (position.currentPrice < position.rangeMin) {
          position.rangeStatus = 'below';
          const distancePercent = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
          position.distanceFromRange = `-${distancePercent.toFixed(2)}%`;
        } else if (position.currentPrice > position.rangeMax) {
          position.rangeStatus = 'above';
          const distancePercent = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
          position.distanceFromRange = `+${distancePercent.toFixed(2)}%`;
        } else {
          position.rangeStatus = 'in-range';
          position.distanceFromRange = '0%';
        }
      }

      // Use pre-extracted token breakdown from auto-expansion
      if (position.pair && tokenBreakdowns.has(position.pair)) {
        const breakdown = tokenBreakdowns.get(position.pair);
        Object.assign(position, breakdown);
        console.log(`📊 Using extracted breakdown for ${position.pair}`);
      }

      // If token breakdown still not found, set to null (do NOT estimate)
      if (!position.token0Amount) {
        console.log(`ℹ️ No breakdown data for ${position.pair}, setting token fields to null`);
        setTokenBreakdownNull(position);
      }

      // Add timestamp
      position.capturedAt = new Date().toISOString();

      // Only add if we have essential data
      if (position.pair && position.balance) {
        console.log(`✅ Parsed position: ${position.pair} - $${position.balance}`);
        if (position.token0Amount) {
          console.log(`   💰 ${position.token0}: ${position.token0Amount} (${position.token0Percentage}%) = $${position.token0Value}`);
          console.log(`   💰 ${position.token1}: ${position.token1Amount} (${position.token1Percentage}%) = $${position.token1Value}`);
        }
        positions.push(position);
      } else {
        console.log(`⚠️ Skipped row ${rowIndex}: missing pair or balance`);
      }
    } catch (error) {
      console.error(`❌ Error parsing position row ${rowIndex}:`, error);
    }
  });

  console.log(`🎯 Final result: ${positions.length} positions captured`);
  console.log('Summary:', portfolioSummary);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

// Uniswap (V3/V4 UI) CLM parser
function captureUniswapCLMPositions() {
  console.log('🦄 Parsing Uniswap positions...');
  const positions = [];
  const portfolioSummary = {};

  // Network from URL path if present (e.g., /positions/v3/arbitrum/5072987)
  let detectedNetwork = null;
  try {
    const path = window.location.pathname || '';
    const netMatch = path.match(/positions\/v\d+\/(\w+)/i);
    if (netMatch) detectedNetwork = netMatch[1];
  } catch {}

  // Try to detect a summary total on the page
  const bodyText = document.body.innerText || '';
  const totalMatch = bodyText.match(/Total\s+(?:Value|Portfolio|Positions?)\s*\$([0-9,]+\.?[0-9]*)/i);
  if (totalMatch) {
    portfolioSummary.totalValue = totalMatch[1].replace(/,/g, '');
  }

  // Strategy: anchor on the pair heading, then locate the nearest container
  // that contains labeled price fields and a labeled position value.
  const pairHeadings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .filter(h => /\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\-/]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/.test((h.innerText || '').trim()));
  console.log(`Uniswap: found ${pairHeadings.length} pair headings`);

  const seenPairs = new Set();

  pairHeadings.forEach((heading, idx) => {
    try {
      // Extract pair strictly from heading
      const headingText = (heading.innerText || '').trim();
      const pairMatch = headingText.match(/\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\-/]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/);
      if (pairMatch) {
        var position = {};
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      if (!position || !position.pair || seenPairs.has(position.pair)) return;

      // Walk up to find a container with required labels
      let container = heading.parentElement;
      let attempts = 0;
      const hasPriceLabels = (t) => (/Min\s+Price|Lower\s+Price/i.test(t) && /Max\s+Price|Upper\s+Price/i.test(t));
      const hasCurrentLabel = (t) => (/Current\s+Price|Spot\s+Price|Market\s+Price/i.test(t));
      const hasValueLabel = (t) => (/\b(Position(?:\s+Value)?|Value|Liquidity)\b/i.test(t));
      while (container && attempts < 8) {
        const t = (container.innerText || '').trim();
        if (t.length < 60 || t.length > 5000) { container = container.parentElement; attempts++; continue; }
        if (hasPriceLabels(t) && hasCurrentLabel(t) && hasValueLabel(t)) {
          break;
        }
        container = container.parentElement;
        attempts++;
      }

      if (!container) {
        console.log(`Uniswap: No qualifying container for ${position.pair}`);
        return;
      }

      const text = container.innerText || '';

      // Fee tier
      // Fee tier: prefer explicit "Fee 0.3%"; fallback to allowed tiers only
      let feeTierVal = null;
      const feeLabel = text.match(/\bFee\b[^\d]*([0-9]+\.?[0-9]*)%/i);
      if (feeLabel) feeTierVal = parseFloat(feeLabel[1]);
      if (feeTierVal == null) {
        const allowed = text.match(/\b(0\.01|0\.05|0\.3|1)\s*%\b/);
        if (allowed) feeTierVal = parseFloat(allowed[1]);
      }
      if (feeTierVal != null && [0.01, 0.05, 0.3, 1].includes(feeTierVal)) {
        position.feeTier = String(feeTierVal);
      }

      // Balance / value (STRICT: must be labeled as Position or Liquidity)
      let valueMatch = text.match(/\b(?:Position(?:\s+Value)?|Liquidity)\b[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (valueMatch) {
        position.balance = parseFloat(valueMatch[1].replace(/,/g, ''));
        position.balanceFormatted = valueMatch[1];
      }

      // Unclaimed fees (STRICT: require label)
      const feesMatch = text.match(/\b(?:Unclaimed\s*Fees|Fees\s*Earned)\b[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      if (feesMatch) position.pendingYield = parseFloat(feesMatch[1].replace(/,/g, ''));

      // APY/APR if shown (optional)
      const apyMatch = text.match(/\bAP[RY]\b[^\d]*([0-9]+\.?[0-9]*)%/i);
      if (apyMatch) position.apy = parseFloat(apyMatch[1]);

      // Labeled prices
      // Support Uniswap v3/v4 label variants (Min/Lower, Max/Upper, Current/Spot/Market)
      const minMatch = text.match(/(?:Min|Lower)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
      const maxMatch = text.match(/(?:Max|Upper)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
      const curMatch = text.match(/(?:Current|Spot|Market)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
      if (minMatch) position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
      if (maxMatch) position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
      if (curMatch) position.currentPrice = parseFloat(curMatch[1].replace(/,/g, ''));

      // In-range calc
      if (position.rangeMin != null && position.rangeMax != null && position.currentPrice != null) {
        position.inRange = position.currentPrice >= position.rangeMin && position.currentPrice <= position.rangeMax;
        if (position.currentPrice < position.rangeMin) {
          position.rangeStatus = 'below';
          const pct = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
          position.distanceFromRange = `-${pct.toFixed(2)}%`;
        } else if (position.currentPrice > position.rangeMax) {
          position.rangeStatus = 'above';
          const pct = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
          position.distanceFromRange = `+${pct.toFixed(2)}%`;
        } else {
          position.rangeStatus = 'in-range';
          position.distanceFromRange = '0%';
        }
      }

      if (detectedNetwork) position.network = detectedNetwork;
      // Attempt to extract token breakdown if present
      try {
        if (position.token0 && position.token1) {
          const t0Sym = position.token0;
          const t1Sym = position.token1;
          const t0Regex = new RegExp(`\\$([0-9,]+\\.?[0-9]*)\\s+([0-9,]+\\.?[0-9]*)\\s+${t0Sym}\\b`);
          const t1Regex = new RegExp(`\\$([0-9,]+\\.?[0-9]*)\\s+([0-9,]+\\.?[0-9]*)\\s+${t1Sym}\\b`);
          const t0m = text.match(t0Regex);
          const t1m = text.match(t1Regex);
          if (t0m) {
            position.token0Value = parseFloat(t0m[1].replace(/,/g, ''));
            position.token0Amount = parseFloat(t0m[2].replace(/,/g, ''));
          }
          if (t1m) {
            position.token1Value = parseFloat(t1m[1].replace(/,/g, ''));
            position.token1Amount = parseFloat(t1m[2].replace(/,/g, ''));
          }
          // If both token USD values present, compute percentages deterministically
          if (position.token0Value != null && position.token1Value != null) {
            const total = position.token0Value + position.token1Value;
            if (total > 0) {
              position.token0Percentage = Number(((position.token0Value / total) * 100).toFixed(2));
              position.token1Percentage = Number(((position.token1Value / total) * 100).toFixed(2));
            }
          }
        }
      } catch {}

      // Prefer sum of token USD values if available and clearly larger than a tiny labeled value
      if (position.token0Value != null && position.token1Value != null) {
        const total = position.token0Value + position.token1Value;
        if (position.balance == null || position.balance < total * 0.2) {
          position.balance = Number(total.toFixed(2));
          position.balanceFormatted = String(position.balance);
        }
      }

      position.capturedAt = new Date().toISOString();

      // Only accept when we have a labeled balance (or computed) and both min/max present
      if (position.pair && position.balance != null && position.rangeMin != null && position.rangeMax != null) {
        positions.push(position);
        seenPairs.add(position.pair);
        console.log(`Uniswap: Parsed position ${position.pair} $${position.balance}`);
      } else {
        console.log(`Uniswap: Skipped ${position.pair} due to missing labeled data (balance=${position.balance}, min=${position.rangeMin}, max=${position.rangeMax})`);
      }
    } catch (e) {
      console.warn('Uniswap: Error parsing heading', idx, e);
    }
  });

  // Fallback: if no positions found via heading-anchored approach, use container scan
  if (positions.length === 0) {
    const allContainers = document.querySelectorAll('section, article, div, li');
    const candidates = Array.from(allContainers).filter(el => {
      const t = (el.innerText || '').trim();
      if (t.length < 80 || t.length > 5000) return false;
      const hasPair = /\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\-/]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/.test(t);
      const hasPriceLabels = /(?:Min|Lower)\s+Price[\s\S]*?(?:Max|Upper)\s+Price[\s\S]*?(?:Current|Spot|Market)\s+Price/i.test(t);
      const hasValue = /\b(?:Position(?:\s+Value)?|Liquidity)\b[\s\S]*?\$[0-9,]+/i.test(t);
      return hasPair && hasPriceLabels && hasValue;
    });
    console.log(`Uniswap: fallback found ${candidates.length} candidate containers`);

    const seen = new Set();
    candidates.forEach((container, idx) => {
      try {
        const text = container.innerText || '';
        let pairMatch = text.match(/\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\-/]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/);
        let position;
        if (pairMatch) {
          position = {
            token0: pairMatch[1],
            token1: pairMatch[2],
            pair: `${pairMatch[1]}/${pairMatch[2]}`
          };
        } else {
          // Fallback: parse from relation "0.2397 USDT = 1 ARB" → pair ARB/USDT
          const rel = text.match(/([0-9.,]+)\s+([A-Za-z][A-Za-z0-9]{1,10})\s*=\s*1\s+([A-Za-z][A-Za-z0-9]{1,10})/);
          if (rel) {
            position = {
              token0: rel[3],
              token1: rel[2],
              pair: `${rel[3]}/${rel[2]}`
            };
          } else {
            return;
          }
        }
        if (seen.has(position.pair)) return;

        // Labeled value
        const val = text.match(/\b(?:Position(?:\s+Value)?|Liquidity)\b[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
        if (!val) return;
        position.balance = parseFloat(val[1].replace(/,/g, ''));
        position.balanceFormatted = val[1];

        // Prices
        const minMatch = text.match(/(?:Min|Lower)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
        const maxMatch = text.match(/(?:Max|Upper)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
        const curMatch = text.match(/(?:Current|Spot|Market)\s+Price[\s\S]*?([0-9,]+\.?[0-9]*)/i);
        if (!minMatch || !maxMatch) return;
        position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
        position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
        if (curMatch) position.currentPrice = parseFloat(curMatch[1].replace(/,/g, ''));

        // In-range
        if (position.currentPrice != null) {
          position.inRange = position.currentPrice >= position.rangeMin && position.currentPrice <= position.rangeMax;
          position.rangeStatus = position.inRange ? 'in-range' : (position.currentPrice < position.rangeMin ? 'below' : 'above');
        }

        // Fees earned
        const feesMatch = text.match(/\b(?:Unclaimed\s*Fees|Fees\s*Earned)\b[^\$]*\$([0-9,]+\.?[0-9]*)/i);
        if (feesMatch) position.pendingYield = parseFloat(feesMatch[1].replace(/,/g, ''));

        // Fee tier (allowed set only)
        let feeTierVal = null;
        const feeLbl = text.match(/\bFee\b[^\d]*([0-9]+\.?[0-9]*)%/i) || text.match(/([0-9]+\.?[0-9]*)%\s*fee/i);
        if (feeLbl) feeTierVal = parseFloat(feeLbl[1]);
        if (feeTierVal == null) {
          const allowed = text.match(/\b(0\.01|0\.05|0\.3|1)\s*%\b/);
          if (allowed) feeTierVal = parseFloat(allowed[1]);
        }
        if (feeTierVal != null && [0.01, 0.05, 0.3, 1].includes(feeTierVal)) {
          position.feeTier = String(feeTierVal);
        }

        // Token breakdown
        try {
          const t0Regex = new RegExp(`\\$([0-9,]+\\.?[0-9]*)\\s+([0-9,]+\\.?[0-9]*)\\s+${position.token0}\\b`);
          const t1Regex = new RegExp(`\\$([0-9,]+\\.?[0-9]*)\\s+([0-9,]+\\.?[0-9]*)\\s+${position.token1}\\b`);
          const t0m = text.match(t0Regex);
          const t1m = text.match(t1Regex);
          if (t0m) { position.token0Value = parseFloat(t0m[1].replace(/,/g, '')); position.token0Amount = parseFloat(t0m[2].replace(/,/g, '')); }
          if (t1m) { position.token1Value = parseFloat(t1m[1].replace(/,/g, '')); position.token1Amount = parseFloat(t1m[2].replace(/,/g, '')); }
        } catch {}

        // Compute percentages when token USD values are present
        if (position.token0Value != null && position.token1Value != null) {
          const total = position.token0Value + position.token1Value;
          if (total > 0) {
            position.token0Percentage = Number(((position.token0Value / total) * 100).toFixed(2));
            position.token1Percentage = Number(((position.token1Value / total) * 100).toFixed(2));
          }
        }

        // If token USD sum is available and clearly larger than a tiny labeled balance, prefer the sum
        if (position.token0Value != null && position.token1Value != null) {
          const total = position.token0Value + position.token1Value;
          if (position.balance == null || position.balance < total * 0.2) {
            position.balance = Number(total.toFixed(2));
            position.balanceFormatted = String(position.balance);
          }
        }

        // Network
        if (detectedNetwork) position.network = detectedNetwork;
        position.capturedAt = new Date().toISOString();

        positions.push(position);
        seen.add(position.pair);
        console.log(`Uniswap: Parsed (fallback) ${position.pair} $${position.balance}`);
      } catch (e) {
        console.warn('Uniswap fallback parse error', idx, e);
      }
    });
  }
  // Populate summary total value if missing by summing balances
  if (!portfolioSummary.totalValue && positions.length > 0) {
    const sum = positions.reduce((acc, p) => acc + (parseFloat(p.balance) || 0), 0);
    if (sum > 0) portfolioSummary.totalValue = String(sum.toFixed(2));
  }
  console.log(`Uniswap: total positions parsed ${positions.length}`);

  return {
    summary: portfolioSummary,
    positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

// Ekubo (Starknet) CLM parser
function captureEkuboCLMPositions() {
  console.log('🐙 Parsing Ekubo positions...');
  const positions = [];
  const portfolioSummary = {};

  const allContainers = document.querySelectorAll('section, article, div');
  const candidates = Array.from(allContainers).filter(el => {
    const t = (el.innerText || '').trim();
    if (t.length < 40 || t.length > 3000) return false;
    const hasPair = /\b[A-Za-z0-9]{2,}[\s\-/][A-Za-z0-9]{2,}\b/.test(t);
    const hasRange = /Range|Min\s+Price|Max\s+Price/i.test(t);
    const hasCurrent = /Current\s+Price|Spot\s+Price/i.test(t);
    const hasValue = /\$[0-9,]+/.test(t) || /Value\s*[:\s]/i.test(t);
    return hasPair && (hasRange || hasCurrent) && hasValue;
  });

  console.log(`Ekubo: Found ${candidates.length} candidate containers`);

  const seenPairs = new Set();

  candidates.forEach((container, idx) => {
    try {
      const text = container.innerText || '';
      const position = {};

      // Pair
      const pairMatch = text.match(/\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\-/]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      if (position.pair && seenPairs.has(position.pair)) return;

      // Fee tier if present
      const feeMatch = text.match(/Fee[^\d]*([0-9]+\.?[0-9]*)%/i);
      if (feeMatch) position.feeTier = feeMatch[1];

      // Balance / principal value (prefer Principal, then Position Value/Liquidity)
      let principalMatch = text.match(/Principal[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      let positionValueMatch = text.match(/(?:Position\s+Value|Liquidity)[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      let genericValueMatch = null;
      if (!principalMatch && !positionValueMatch) {
        // As a last resort, pick the largest $ amount that is not a fee
        const amounts = [];
        const dollarRegex = /\$([0-9,]+\.?[0-9]*)/g;
        let m;
        while ((m = dollarRegex.exec(text)) !== null) {
          // Exclude amounts near the word Fee(s)
          const contextStart = Math.max(0, m.index - 20);
          const contextEnd = Math.min(text.length, m.index + m[0].length + 20);
          const ctx = text.substring(contextStart, contextEnd);
          if (/fee/i.test(ctx)) continue;
          amounts.push(parseFloat(m[1].replace(/,/g, '')));
        }
        if (amounts.length > 0) {
          genericValueMatch = [null, String(Math.max(...amounts))];
        }
      }
      const chosen = principalMatch || positionValueMatch || genericValueMatch;
      if (chosen) {
        position.balance = parseFloat(chosen[1].replace(/,/g, ''));
        position.balanceFormatted = chosen[1];
      }

      // Pending fees
      const pendingMatch = text.match(/(?:Unclaimed|Pending|Fees\s*Earned)[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      if (pendingMatch) position.pendingYield = parseFloat(pendingMatch[1].replace(/,/g, ''));

      // Implied APR/APY
      const aprMatch = text.match(/Implied\s+APR\s*:?\s*[~≈]??\s*([0-9]+\.?[0-9]*)%/i) ||
                       text.match(/AP[RY][^0-9]*([0-9]+\.?[0-9]*)%/i);
      if (aprMatch) position.apy = parseFloat(aprMatch[1]);

      // Range and price
      const minMatch = text.match(/(?:Min|Lower)\s+Price[^0-9]*([0-9,]+\.?[0-9]*)/i);
      const maxMatch = text.match(/(?:Max|Upper)\s+Price[^0-9]*([0-9,]+\.?[0-9]*)/i);
      const curMatch = text.match(/(?:Current|Spot)\s+Price[^0-9]*([0-9,]+\.?[0-9]*)/i);
      if (minMatch) position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
      if (maxMatch) position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
      if (curMatch) position.currentPrice = parseFloat(curMatch[1].replace(/,/g, ''));

      if (position.rangeMin != null && position.rangeMax != null && position.currentPrice != null) {
        position.inRange = position.currentPrice >= position.rangeMin && position.currentPrice <= position.rangeMax;
        if (position.currentPrice < position.rangeMin) {
          position.rangeStatus = 'below';
          const pct = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
          position.distanceFromRange = `-${pct.toFixed(2)}%`;
        } else if (position.currentPrice > position.rangeMax) {
          position.rangeStatus = 'above';
          const pct = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
          position.distanceFromRange = `+${pct.toFixed(2)}%`;
        } else {
          position.rangeStatus = 'in-range';
          position.distanceFromRange = '0%';
        }
      }

      position.capturedAt = new Date().toISOString();

      // Try to capture raw token amounts if present (e.g., "22098.9 STRK", "3.19718 ETH")
      try {
        if (position.token0) {
          const a0 = new RegExp(`([0-9,]+\\.?[0-9]*)\\s+${position.token0}\\b`).exec(text);
          if (a0) position.token0Amount = parseFloat(a0[1].replace(/,/g, ''));
        }
        if (position.token1) {
          const a1 = new RegExp(`([0-9,]+\\.?[0-9]*)\\s+${position.token1}\\b`).exec(text);
          if (a1) position.token1Amount = parseFloat(a1[1].replace(/,/g, ''));
        }
      } catch {}

      if (position.pair && position.balance) {
        positions.push(position);
        seenPairs.add(position.pair);
        console.log(`Ekubo: Parsed position ${position.pair} $${position.balance}`);
      }
    } catch (e) {
      console.warn('Ekubo: Error parsing candidate', idx, e);
    }
  });

  return {
    summary: portfolioSummary,
    positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureRaydiumCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Raydium uses card-based layout
  // Strategy: Find containers that have BOTH "My Position" header AND "CLMM" indicator
  const allElements = document.querySelectorAll('div');

  // First find the main liquidity/position section
  const liquiditySection = Array.from(allElements).find(el => {
    const text = el.innerText || '';
    return text.includes('My Position') &&
           text.includes('Pending Yield') &&
           text.includes('CLMM') &&
           text.includes('Current Price');
  });

  if (!liquiditySection) {
    console.log('Raydium: No liquidity section found');
    return {
      summary: portfolioSummary,
      positions: positions,
      positionCount: 0,
      inRangeCount: 0,
      outOfRangeCount: 0
    };
  }

  // Extract all text from this section
  const sectionText = liquiditySection.innerText || '';
  console.log('Raydium: Found liquidity section');

  // Parse the position data from the section
  const position = {};

  // Extract pair
  const pairMatch = sectionText.match(/([A-Z][A-Za-z0-9]+)\s*\/\s*([A-Z][A-Za-z0-9]+)/);
  if (pairMatch) {
    position.token0 = pairMatch[1];
    position.token1 = pairMatch[2];
    position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
  }

  // Extract position balance - look for pattern "Position\n$X,XXX.XX"
  const balanceMatch = sectionText.match(/Position\s*\$([0-9,]+\.?[0-9]*)/);
  if (balanceMatch) {
    position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    position.balanceFormatted = balanceMatch[1];
  }

  // Extract APR
  const aprMatch = sectionText.match(/APR\s*([0-9]+\.?[0-9]*)%/);
  if (aprMatch) {
    position.apy = parseFloat(aprMatch[1]);
  }

  // Extract current price
  const priceMatch = sectionText.match(/Current Price:\s*([0-9]+\.?[0-9]*)/);
  if (priceMatch) {
    position.currentPrice = parseFloat(priceMatch[1]);
  }

  // Extract range
  const rangeMatch = sectionText.match(/([0-9]+\.?[0-9]+)\s*-\s*([0-9]+\.?[0-9]+)/);
  if (rangeMatch) {
    position.rangeMin = parseFloat(rangeMatch[1]);
    position.rangeMax = parseFloat(rangeMatch[2]);
  }

  // Extract pending yield - allow for newlines and extra text between label and value
  const pendingYieldMatch = sectionText.match(/Pending Yield[^\$]*\$([0-9,]+\.?[0-9]*)/);
  if (pendingYieldMatch) {
    position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
    position.pendingYieldFormatted = pendingYieldMatch[1];
  } else {
    // Try alternative pattern - sometimes the value might be without $
    const altPendingMatch = sectionText.match(/Pending Yield[^\d]*([0-9,]+\.?[0-9]+)/);
    if (altPendingMatch) {
      position.pendingYield = parseFloat(altPendingMatch[1].replace(/,/g, ''));
      position.pendingYieldFormatted = altPendingMatch[1];
    }
  }

  // Calculate in-range status
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                      position.currentPrice <= position.rangeMax;

    if (position.currentPrice < position.rangeMin) {
      position.rangeStatus = 'below';
      const distancePercent = ((position.rangeMin - position.currentPrice) / position.currentPrice) * 100;
      position.distanceFromRange = `-${distancePercent.toFixed(2)}%`;
    } else if (position.currentPrice > position.rangeMax) {
      position.rangeStatus = 'above';
      const distancePercent = ((position.currentPrice - position.rangeMax) / position.rangeMax) * 100;
      position.distanceFromRange = `+${distancePercent.toFixed(2)}%`;
    } else {
      position.rangeStatus = 'in-range';
      position.distanceFromRange = '0%';
    }
  }

  // Try to extract token breakdown
  if (position.token0 && position.token1 && sectionText) {
    const breakdown = extractTokenBreakdown(sectionText, position.token0, position.token1);
    if (breakdown.token0Amount) {
      Object.assign(position, breakdown);
    }
  }

  // Fallback: calculate approximate breakdown if not found
  if (!position.token0Amount) {
    setTokenBreakdownNull(position);
  }

  position.capturedAt = new Date().toISOString();

  console.log('Raydium parsed position:', {
    pair: position.pair,
    balance: position.balance,
    pendingYield: position.pendingYield,
    apy: position.apy,
    currentPrice: position.currentPrice,
    rangeMin: position.rangeMin,
    rangeMax: position.rangeMax,
    inRange: position.inRange,
    token0Amount: position.token0Amount,
    token1Amount: position.token1Amount
  });

  // Only add if we have essential data
  if (position.pair && position.balance) {
    positions.push(position);
  }

  // Extract wallet overview and pending yield from the My Position section
  const walletOverviewEl = Array.from(allElements).find(el => {
    const text = el.innerText || '';
    return text.includes('Wallet Overview') && text.includes('$');
  });

  if (walletOverviewEl) {
    const text = walletOverviewEl.innerText || '';
    const totalValueMatch = text.match(/\$([0-9,]+\.?[0-9]*)/);
    if (totalValueMatch) {
      portfolioSummary.totalValue = totalValueMatch[1].replace(/,/g, '');
    }
  }

  // Try to get total pending yield from the My Position header section
  if (liquiditySection) {
    const headerText = liquiditySection.innerText || '';
    // Look for "Pending Yield" in the header area (before the position details)
    const headerPendingMatch = headerText.match(/Pending Yield[^\d]*([0-9,]+\.?[0-9]*)/);
    if (headerPendingMatch) {
      portfolioSummary.pendingYield = headerPendingMatch[1].replace(/,/g, '');
    }
  }

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureAerodromeCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Token address to symbol mapping for Base chain (Aerodrome)
  const tokenMap = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC',
    '0x4200000000000000000000000000000000000006': 'WETH',
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 'AERO',
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
    '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
    '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': 'EURC',
    '0x04d5ddf5f3a8939889f11e97f8c4bb48317f1938': 'USDz',
    '0x236aa50979d5f3de3bd1eeb40e81137f22ab794b': 'tBTC',
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'USDbC'
  };

  // Find all deposit links - these indicate positions
  const depositLinks = document.querySelectorAll('a[href*="/deposit?token0="]');
  console.log(`Aerodrome: Found ${depositLinks.length} deposit links`);

  // Group by token pair (multiple deposits for same pair)
  const positionMap = new Map();

  depositLinks.forEach((link, index) => {
    try {
      const href = link.getAttribute('href');

      // Extract token addresses from URL
      const token0Match = href.match(/token0=(0x[a-fA-F0-9]+)/);
      const token1Match = href.match(/token1=(0x[a-fA-F0-9]+)/);

      if (!token0Match || !token1Match) return;

      const token0Addr = token0Match[1].toLowerCase();
      const token1Addr = token1Match[1].toLowerCase();

      const token0 = tokenMap[token0Addr] || `Token${token0Addr.substring(0, 6)}`;
      const token1 = tokenMap[token1Addr] || `Token${token1Addr.substring(0, 6)}`;
      const pair = `${token0}/${token1}`;

      // Find the parent container that has "Deposited" and balance
      let container = link.closest('div');
      let attempts = 0;
      while (container && attempts < 10) {
        const text = container.innerText || '';
        if (text.includes('Deposited') && text.includes('~$')) {
          break;
        }
        container = container.parentElement;
        attempts++;
      }

      if (!container) {
        console.log(`Aerodrome: Could not find container for ${pair}`);
        return;
      }

      const allText = container.innerText || container.textContent || '';

      // Extract deposited value
      const depositMatch = allText.match(/Deposited[\s\S]*?~\$([0-9,]+\.?[0-9]*)/i);
      if (!depositMatch) return;

      const balance = parseFloat(depositMatch[1].replace(/,/g, ''));

      // Skip closed positions
      if (balance < 0.01) {
        console.log(`Aerodrome: Skipping closed position ${pair} with balance $${balance}`);
        return;
      }

      // Check if we already have this pair
      if (positionMap.has(pair)) {
        const existing = positionMap.get(pair);
        // Keep the one with more data or higher balance
        if (balance > existing.balance) {
          positionMap.set(pair, { container, balance, pair, token0, token1 });
        }
        return;
      }

      positionMap.set(pair, { container, balance, pair, token0, token1 });

    } catch (error) {
      console.error(`Aerodrome: Error parsing deposit link ${index}:`, error);
    }
  });

  console.log(`Aerodrome: Found ${positionMap.size} unique token pairs`);

  // Now extract full position data for each unique pair
  positionMap.forEach(({ container, balance, pair, token0, token1 }) => {
    try {
      const allText = container.innerText || container.textContent || '';
      const position = {
        pair,
        token0,
        token1,
        balance,
        capturedAt: new Date().toISOString()
      };

      // Check if ALM
      const isALM = allText.includes('ALM') ||
                    allText.includes('Automated') ||
                    container.querySelector('a[href*="&alm="]') !== null;

      if (isALM) {
        position.isAutomated = true;
        position.rangeMin = null;
        position.rangeMax = null;
        position.inRange = true;
        position.rangeStatus = 'alm-managed';
      } else {
        // Extract range for non-ALM positions
        const rangeMatch = allText.match(/Range[^\d]*([0-9]+\.?[0-9]+)[^\d]+([0-9]+\.?[0-9]+)/i);
        if (rangeMatch) {
          position.rangeMin = parseFloat(rangeMatch[1]);
          position.rangeMax = parseFloat(rangeMatch[2]);
        }

        const priceMatch = allText.match(/Current[^\d]*([0-9]+\.?[0-9]+)/i);
        if (priceMatch) {
          position.currentPrice = parseFloat(priceMatch[1]);
        }

        if (position.rangeMin && position.rangeMax && position.currentPrice) {
          position.inRange = position.currentPrice >= position.rangeMin &&
                            position.currentPrice <= position.rangeMax;
          position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';
        }
      }

      // Extract highest APR (optional - may not be in container)
      const aprMatches = allText.matchAll(/APR[^\d]*([0-9]+\.?[0-9]*)%/gi);
      let maxAPR = 0;
      for (const match of aprMatches) {
        const apr = parseFloat(match[1]);
        if (apr > maxAPR) maxAPR = apr;
      }
      if (maxAPR > 0) {
        position.apy = maxAPR;
      }

      // Extract pending yield (optional - may not be in container)
      let totalPendingUSD = 0;

      // Trading fees (USDC)
      const tradingFeeMatches = allText.matchAll(/Trading Fees[\s\S]*?([0-9]+\.?[0-9]*)\s+USDC/gi);
      for (const match of tradingFeeMatches) {
        const amt = parseFloat(match[1]);
        if (amt > 0) totalPendingUSD += amt;
      }

      // Emissions (AERO ≈ $1)
      const emissionMatches = allText.matchAll(/Emissions[\s\S]*?([0-9]+\.?[0-9]*)\s+AERO/gi);
      for (const match of emissionMatches) {
        const amt = parseFloat(match[1]);
        if (amt > 0) totalPendingUSD += amt * 1.0;
      }

      if (totalPendingUSD > 0) {
        position.pendingYield = totalPendingUSD;
      }

      // Extract token breakdown
      if (position.token0 && position.token1) {
        const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
        if (breakdown.token0Amount) {
          Object.assign(position, breakdown);
        } else {
          // Fallback to approximate calculation
          setTokenBreakdownNull(position);
        }
      }

      console.log(`Aerodrome: ${position.pair} - $${position.balance.toFixed(2)}`);

      positions.push(position);

    } catch (error) {
      console.error(`Aerodrome: Error parsing position for ${pair}:`, error);
    }
  });

  console.log(`Aerodrome: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureCetusCLMPositions() {
  const positions = [];
  const portfolioSummary = {};

  // Cetus uses card-based layout, not tables
  // Look for containers that have pair names and liquidity values
  const allDivs = document.querySelectorAll('div');

  const positionCards = Array.from(allDivs).filter(div => {
    const text = div.innerText || '';
    // Must have pair format (TOKEN - TOKEN), APR, and Liquidity
    return /[A-Z]+\s*-\s*[A-Z]+/.test(text) &&
           text.includes('APR') &&
           text.includes('Liquidity') &&
           text.length > 50 && text.length < 2000;
  });

  console.log(`Cetus: Found ${positionCards.length} potential position cards`);

  positionCards.forEach((card, index) => {
    try {
      const allText = card.innerText || card.textContent || '';
      const position = {};

      // Extract pair (format: "SUI - USDC" or "wBTC - USDC")
      // Match at word boundaries to get full token names like wBTC, not just BTC
      const pairMatch = allText.match(/\b([A-Za-z][A-Za-z0-9]*)\s*-\s*([A-Z][A-Za-z0-9]+)\b/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract fee tier (e.g., "0.25%")
      const feeTierMatch = allText.match(/([0-9]+\.?[0-9]+)%(?!\s*APR)/);
      if (feeTierMatch) {
        position.feeTier = feeTierMatch[1];
      }

      // Extract liquidity (balance)
      const liquidityMatch = allText.match(/Liquidity[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (liquidityMatch) {
        position.balance = parseFloat(liquidityMatch[1].replace(/,/g, ''));
      }

      // Extract APR
      const aprMatch = allText.match(/APR[\s\S]*?([0-9]+\.?[0-9]*)%/i);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
        console.log(`Cetus: APR found for ${position.pair}: ${position.apy}%`);
      } else {
        console.log(`Cetus: APR not found for ${position.pair}, container text:`, allText.substring(0, 300));
      }

      // Extract claimable yield (pending yield)
      const yieldMatch = allText.match(/Claimable Yield[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (yieldMatch) {
        position.pendingYield = parseFloat(yieldMatch[1].replace(/,/g, ''));
      }

      // Extract price range - prefer "Min Price" and "Max Price" labels (most accurate)
      const minMatch = allText.match(/Min\s+Price[:\s]+([0-9,]+\.?[0-9]*)/i);
      const maxMatch = allText.match(/Max\s+Price[:\s]+([0-9,]+\.?[0-9]*)/i);

      if (minMatch && maxMatch) {
        // Use labeled min/max prices (remove commas)
        position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
        position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
        console.log(`Cetus: Extracted range for ${position.pair}: Min ${position.rangeMin} - Max ${position.rangeMax}`);
      } else {
        // Fallback: Try "Price Range: X - Y" format (avoid "30D Price Range")
        let rangeMatch = allText.match(/(?<!30D\s)Price\s+Range[:\s]+([0-9,]+\.?[0-9]*)\s*[-~]\s*([0-9,]+\.?[0-9]*)/i);
        if (rangeMatch) {
          let val1 = parseFloat(rangeMatch[1].replace(/,/g, ''));
          let val2 = parseFloat(rangeMatch[2].replace(/,/g, ''));
          position.rangeMin = Math.min(val1, val2);
          position.rangeMax = Math.max(val1, val2);
        }
      }

      // Extract current price - handle commas in numbers
      let priceMatch = allText.match(/Current\s+(?:Pool\s+)?Price[:\s]+([0-9,]+\.?[0-9]*)/i);
      if (!priceMatch) {
        // Try just "Price:" followed by a number
        priceMatch = allText.match(/(?:^|\n)Price[:\s]+([0-9,]+\.?[0-9]*)/im);
      }
      if (!priceMatch) {
        // Try looking for price near the pair name
        priceMatch = allText.match(/([0-9,]+\.?[0-9]+)\s*(?:SUI|USDC|ETH|BTC|wBTC)/);
      }
      if (priceMatch) {
        position.currentPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
        console.log(`Cetus: Current price found for ${position.pair}: ${position.currentPrice}`);
      } else {
        console.log(`Cetus: Current price NOT found for ${position.pair}, text sample:`, allText.substring(0, 500));
      }

      // Check if active (in-range)
      const isActive = allText.includes('Active');
      if (position.rangeMin && position.rangeMax && position.currentPrice) {
        position.inRange = position.currentPrice >= position.rangeMin &&
                          position.currentPrice <= position.rangeMax;
        position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';
      } else if (isActive !== undefined) {
        position.inRange = isActive;
        position.rangeStatus = isActive ? 'in-range' : 'out-of-range';
      }

      // Extract token breakdown
      if (position.token0 && position.token1 && allText) {
        const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
        if (breakdown.token0Amount) {
          Object.assign(position, breakdown);
        } else {
          setTokenBreakdownNull(position);
        }
      }

      position.capturedAt = new Date().toISOString();

      console.log(`Cetus: ${position.pair} - $${position.balance}`);

      if (position.pair && position.balance) {
        positions.push(position);
      } else {
        console.warn(`Cetus: SKIPPED position ${index} - Missing required data:`, {
          hasPair: !!position.pair,
          hasBalance: !!position.balance,
          pair: position.pair,
          balance: position.balance,
          textSample: allText.substring(0, 300)
        });
      }
    } catch (error) {
      console.error(`Cetus: Error parsing position card ${index}:`, error);
    }
  });

  // Deduplicate by pair + balance (keep smallest balance as it's most specific)
  const uniquePositions = [];
  const seen = new Map();
  positions.forEach(pos => {
    const key = pos.pair;
    const existing = seen.get(key);
    if (!existing || pos.balance < existing.balance) {
      seen.set(key, pos);
    }
  });
  seen.forEach(pos => uniquePositions.push(pos));

  console.log(`Cetus: Found ${positionCards.length} cards → Parsed ${positions.length} positions → ${uniquePositions.length} unique`);
  if (positionCards.length > positions.length) {
    console.warn(`Cetus: WARNING - ${positionCards.length - positions.length} position(s) were skipped! Check console warnings above for details.`);
  }

  return {
    summary: portfolioSummary,
    positions: uniquePositions,
    positionCount: uniquePositions.length,
    inRangeCount: uniquePositions.filter(p => p.inRange).length,
    outOfRangeCount: uniquePositions.filter(p => !p.inRange).length
  };
}

function captureHyperionCLMPositions() {
  // Check if we're on a position details page
  const url = window.location.href;
  if (url.includes('/position/')) {
    return captureHyperionPositionDetails();
  }

  // Otherwise, parse the positions list page
  const positions = [];
  const portfolioSummary = {};

  // Hyperion uses table rows for positions
  // Look for rows that contain pair names and "Add / Remove" button
  const allElements = document.querySelectorAll('div, tr');

  const positionRows = Array.from(allElements).filter(el => {
    const text = el.innerText || '';
    // Must have pair format (APT-USDC), fee tier, and "Add / Remove"
    return /[A-Z]+\-[A-Z]+/.test(text) &&
           text.includes('%') &&
           (text.includes('Add / Remove') || text.includes('Active') || text.includes('Inactive')) &&
           text.length > 20 && text.length < 500;
  });

  console.log(`Hyperion: Found ${positionRows.length} potential position rows`);

  positionRows.forEach((row, index) => {
    try {
      const allText = row.innerText || row.textContent || '';
      const position = {};

      // Extract pair (format: "APT-USDC" or "WBTC-USDC")
      const pairMatch = allText.match(/([A-Z][A-Za-z0-9]+)\-([A-Z][A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract fee tier (e.g., "0.05%")
      const feeTierMatch = allText.match(/([0-9]+\.?[0-9]+)%/);
      if (feeTierMatch) {
        position.feeTier = feeTierMatch[1];
      }

      // Extract value (balance) - look for "$16K" or "$8.89K" or "$499.9"
      const valueMatch = allText.match(/\$([0-9]+\.?[0-9]*)K/i) ||
                         allText.match(/\$([0-9,]+\.?[0-9]*)/);
      if (valueMatch) {
        let value = parseFloat(valueMatch[1].replace(/,/g, ''));
        // If it had "K", multiply by 1000
        if (allText.match(/\$[0-9]+\.?[0-9]*K/i)) {
          value *= 1000;
        }
        position.balance = value;
      }

      // Extract APR - look for percentage after fee tier
      const aprMatch = allText.match(/[0-9]+\.?[0-9]+%[\s\S]*?([0-9]+\.?[0-9]+)%/);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
      }

      // Extract rewards (pending yield) - look for "$194.75" etc after APR
      const rewardsMatches = allText.matchAll(/\$([0-9]+\.?[0-9]+)/g);
      const dollarAmounts = [];
      for (const match of rewardsMatches) {
        dollarAmounts.push(parseFloat(match[1]));
      }
      // Last dollar amount is usually rewards
      if (dollarAmounts.length > 1) {
        position.pendingYield = dollarAmounts[dollarAmounts.length - 1];
      }

      // Check if active (in-range)
      const isActive = allText.includes('Active');
      position.inRange = isActive;
      position.rangeStatus = isActive ? 'in-range' : 'out-of-range';

      // Extract token breakdown
      if (position.token0 && position.token1 && allText) {
        const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
        if (breakdown.token0Amount) {
          Object.assign(position, breakdown);
        } else {
          setTokenBreakdownNull(position);
        }
      }

      position.capturedAt = new Date().toISOString();

      console.log(`Hyperion: ${position.pair} - $${position.balance}`);

      if (position.pair && position.balance) {
        positions.push(position);
      } else {
        console.warn(`Hyperion: SKIPPED position ${index} - Missing required data:`, {
          hasPair: !!position.pair,
          hasBalance: !!position.balance,
          pair: position.pair,
          balance: position.balance,
          textSample: allText.substring(0, 300)
        });
      }
    } catch (error) {
      console.error(`Hyperion: Error parsing position row ${index}:`, error);
    }
  });

  console.log(`Hyperion: Found ${positionRows.length} rows → Parsed ${positions.length} positions`);
  if (positionRows.length > positions.length) {
    console.warn(`Hyperion: WARNING - ${positionRows.length - positions.length} position(s) were skipped! Check console warnings above for details.`);
  }

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureHyperionPositionDetails() {
  console.log('Hyperion: Parsing position details page');

  const position = {};

  // Get all text on the page
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Hyperion Details: Page text length:', pageText.length);

  // Automatic token pair detection (no hardcoded mappings needed!)
  console.log('🔍 Auto-detecting token pair...');

  // Common website/UI words to filter out (not crypto tokens)
  const nonTokenWords = ['Hyperion', 'Fully', 'Onchain', 'Perps', 'Trade', 'Swap', 'Pool', 'Liquidity', 'Position', 'Earn', 'Bridge', 'Dashboard', 'Portfolio'];

  // Method 1: Extract from page title (must be uppercase crypto tokens)
  const pageTitle = document.title || '';
  let titleTokens = null;
  // Require UPPERCASE tokens (crypto symbols) - filters out "Hyperion/Fully" branding
  const titleMatch = pageTitle.match(/\b([A-Z][A-Z0-9]{1,9})\s*[\-\/]\s*([A-Z][A-Z0-9]{1,9})\b/);
  if (titleMatch) {
    const token0 = titleMatch[1];
    const token1 = titleMatch[2];
    // Validate tokens are not common UI words
    if (!nonTokenWords.includes(token0) && !nonTokenWords.includes(token1)) {
      titleTokens = { token0, token1 };
      console.log('   ✓ Found in title:', `${titleTokens.token0}/${titleTokens.token1}`);
    }
  }

  // Method 2: Extract from token logo alt attributes (very reliable)
  const tokenLogos = Array.from(document.querySelectorAll('img[alt], img[title]'));
  const logoTokens = [];
  tokenLogos.forEach(img => {
    const alt = img.alt || img.title || '';
    // Match "xBTC logo", "USDC", "SOL token", "wBTC icon", etc.
    const logoMatch = alt.match(/^([A-Za-z][A-Za-z0-9]{1,9})(?:\s+(?:logo|token|icon|image))?$/i);
    if (logoMatch) {
      const token = logoMatch[1];
      // Validate it looks like a crypto token (2+ chars, not common UI words)
      if (token.length >= 2 && !['Logo', 'Icon', 'Token', 'Image', 'Img', 'Alt'].includes(token)) {
        if (!logoTokens.includes(token) && !nonTokenWords.includes(token)) {
          logoTokens.push(token);
        }
      }
    }
  });
  if (logoTokens.length >= 2) {
    console.log('   ✓ Found in logo alts:', logoTokens.slice(0, 2).join('/'));
  }

  // Method 3: Extract from prominent headings
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
  let headingTokens = null;
  for (const h of headings) {
    const text = h.innerText || '';
    const headingMatch = text.match(/\b([A-Z][A-Z0-9]{1,9})\s*[\-\/]\s*([A-Z][A-Z0-9]{1,9})\b/);
    if (headingMatch) {
      const token0 = headingMatch[1];
      const token1 = headingMatch[2];
      // Filter out UI words
      if (!nonTokenWords.includes(token0) && !nonTokenWords.includes(token1)) {
        headingTokens = { token0, token1 };
        console.log('   ✓ Found in heading:', `${headingTokens.token0}/${headingTokens.token1}`);
        break;
      }
    }
  }

  // Method 4: Extract from URL params (Hyperion/Aptos specific)
  const urlParams = new URLSearchParams(window.location.search);
  const currencyA = urlParams.get('currencyA');
  const currencyB = urlParams.get('currencyB');

  // Known token address mappings (minimal, only for common tokens as fallback)
  const knownTokens = {
    '0x1::aptos_coin::AptosCoin': 'APT',
    '0x000000000000000000000000000000000000000000000000000000000000000a': 'APT',
    '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b': 'USDC',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa': 'USDC',
    '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387': 'xBTC',
    '0x68844a0d7f2587e726ad0579f3d640865bb4162c08a4589eeda3f9689ec52a3d': 'WBTC',
    '0xae478ff7d83ed072dbc5e264250e67ef58f57c99d89b447efd8a0a2e8b2be76e': 'WBTC',
  };

  let urlTokens = null;
  if (currencyA && currencyB) {
    let token0 = knownTokens[currencyA];
    let token1 = knownTokens[currencyB];

    // If not in known mappings, try to extract from address structure
    if (!token0) {
      const addressMatch = currencyA.match(/::([A-Za-z0-9]+)$/);
      token0 = addressMatch ? addressMatch[1].toUpperCase() : null;
    }
    if (!token1) {
      const addressMatch = currencyB.match(/::([A-Za-z0-9]+)$/);
      token1 = addressMatch ? addressMatch[1].toUpperCase() : null;
    }

    if (token0 && token1) {
      urlTokens = { token0, token1 };
      console.log('   ✓ Found in URL params:', `${token0}/${token1}`);
    }
  }

  // Priority: title > logos > headings > URL params > page text
  if (titleTokens) {
    position.token0 = titleTokens.token0;
    position.token1 = titleTokens.token1;
    position.pair = `${titleTokens.token0}/${titleTokens.token1}`;
    console.log('Hyperion Details: Using pair from TITLE:', position.pair);
  } else if (logoTokens.length >= 2) {
    position.token0 = logoTokens[0];
    position.token1 = logoTokens[1];
    position.pair = `${logoTokens[0]}/${logoTokens[1]}`;
    console.log('Hyperion Details: Using pair from LOGOS:', position.pair);
  } else if (headingTokens) {
    position.token0 = headingTokens.token0;
    position.token1 = headingTokens.token1;
    position.pair = `${headingTokens.token0}/${headingTokens.token1}`;
    console.log('Hyperion Details: Using pair from HEADING:', position.pair);
  } else if (urlTokens) {
    position.token0 = urlTokens.token0;
    position.token1 = urlTokens.token1;
    position.pair = `${urlTokens.token0}/${urlTokens.token1}`;
    console.log('Hyperion Details: Using pair from URL:', position.pair);
  }

  // Final fallback: Search page text for pair pattern
  if (!position.pair && pageText) {
    const pairMatch = pageText.match(/([A-Z][A-Z0-9]{2,})\s*[-\/]\s*([A-Z][A-Z0-9]{2,})/);
    if (pairMatch) {
      position.token0 = pairMatch[1];
      position.token1 = pairMatch[2];
      position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      console.log('Hyperion Details: Using pair from PAGE TEXT:', position.pair);
    }
  }

  // Method 5: Extract from main page content (look for prominent token symbols)
  if (!position.pair) {
    // Find all uppercase 2-10 character words that appear multiple times (likely tokens)
    const tokenPattern = /\b([A-Z][A-Z0-9]{1,9})\b/g;
    const allMatches = pageText.match(tokenPattern) || [];

    // Count occurrences of each potential token
    const tokenCounts = {};
    allMatches.forEach(token => {
      if (!nonTokenWords.includes(token)) {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      }
    });

    // Get tokens that appear at least 2 times (indicates they're important)
    const frequentTokens = Object.entries(tokenCounts)
      .filter(([token, count]) => count >= 2 && token.length >= 2)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([token]) => token);

    if (frequentTokens.length >= 2) {
      position.token0 = frequentTokens[0];
      position.token1 = frequentTokens[1];
      position.pair = `${frequentTokens[0]}/${frequentTokens[1]}`;
      console.log('   ✓ Found frequent tokens:', position.pair, `(${tokenCounts[frequentTokens[0]]}x, ${tokenCounts[frequentTokens[1]]}x)`);
    }
  }

  if (!position.pair) {
    console.log('   ⚠️ Could not auto-detect token pair');
  }

  // Search all divs and spans for labeled data
  const allElements = document.querySelectorAll('div, span, p, td, th');

  allElements.forEach(el => {
    const text = el.innerText || el.textContent || '';

    // Look for "Price Range" with tilde separator: "93,044.05864 ~ 124,096.405935"
    if (!position.rangeMin || !position.rangeMax) {
      const rangeMatch = text.match(/Price\s+Range[:\s]+([0-9,]+\.?[0-9]*)\s*~\s*([0-9,]+\.?[0-9]*)/i);
      if (rangeMatch) {
        position.rangeMin = parseFloat(rangeMatch[1].replace(/,/g, ''));
        position.rangeMax = parseFloat(rangeMatch[2].replace(/,/g, ''));
        console.log('Hyperion Details: Found price range:', position.rangeMin, '~', position.rangeMax);
      }
    }

    // Look for "Min" or "Low" price (fallback)
    if (!position.rangeMin) {
      const minMatch = text.match(/(?:Min|Low|Lower)(?:\s+Price)?[:\s]+([0-9,]+\.?[0-9]*)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
        console.log('Hyperion Details: Found min price:', position.rangeMin);
      }
    }

    // Look for "Max" or "High" price (fallback)
    if (!position.rangeMax) {
      const maxMatch = text.match(/(?:Max|High|Upper)(?:\s+Price)?[:\s]+([0-9,]+\.?[0-9]*)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
        console.log('Hyperion Details: Found max price:', position.rangeMax);
      }
    }

    // Look for "Current Price" - handle commas in large numbers
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current\s+Price[:\s]+([0-9,]+\.?[0-9]*)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1].replace(/,/g, ''));
        console.log('Hyperion Details: Found current price:', position.currentPrice);
      }
    }

    // Look for "Value" with K suffix: "$16.02K"
    if (!position.balance) {
      const valueMatch = text.match(/Value[:\s]+\$([0-9]+\.?[0-9]*)K/i);
      if (valueMatch) {
        position.balance = parseFloat(valueMatch[1]) * 1000;
        console.log('Hyperion Details: Found value (K):', position.balance);
      } else {
        const balanceMatch = text.match(/(?:Total\s+)?(?:Balance|Value|Liquidity)[:\s]+\$([0-9,]+\.?[0-9]*)/i);
        if (balanceMatch) {
          position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
          console.log('Hyperion Details: Found balance:', position.balance);
        }
      }
    }

    // Look for "Position APR" - more specific to avoid wrong match
    if (!position.apy) {
      const posAprMatch = text.match(/Position\s+APR[^0-9]*([0-9]+\.?[0-9]*)%/i);
      if (posAprMatch) {
        position.apy = parseFloat(posAprMatch[1]);
        console.log('Hyperion Details: Found Position APR:', position.apy);
      } else {
        // Fallback to generic APR
        const aprMatch = text.match(/APR[:\s]+([0-9]+\.?[0-9]*)%/i);
        if (aprMatch) {
          position.apy = parseFloat(aprMatch[1]);
          console.log('Hyperion Details: Found APR:', position.apy);
        }
      }
    }

    // Look for "Claimable Rewards" total with ≈ symbol
    if (!position.pendingYield) {
      const claimableMatch = text.match(/Claimable\s+Rewards[\s\S]*?≈\s*\$([0-9]+\.?[0-9]+)/i);
      if (claimableMatch) {
        position.pendingYield = parseFloat(claimableMatch[1]);
        console.log('Hyperion Details: Found claimable rewards:', position.pendingYield);
      } else {
        const rewardMatch = text.match(/(?:Rewards?|Claimable|Pending)[:\s]+\$([0-9]+\.?[0-9]+)/i);
        if (rewardMatch) {
          position.pendingYield = parseFloat(rewardMatch[1]);
          console.log('Hyperion Details: Found rewards:', position.pendingYield);
        }
      }
    }
  });

  // Also try searching the full page text with simpler patterns
  if (!position.rangeMin) {
    // Look for pattern like "10.5" or "0.05" that could be min price
    const allNumbers = pageText.match(/([0-9]+\.[0-9]+)/g);
    if (allNumbers && allNumbers.length >= 2) {
      console.log('Hyperion Details: Found numeric values:', allNumbers.slice(0, 10));
    }
  }

  // Check in-range status if we have range data
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.inRange) {
      const rangeSize = position.rangeMax - position.rangeMin;
      const distanceToMin = position.currentPrice - position.rangeMin;
      const distanceToMax = position.rangeMax - position.currentPrice;
      const minDistance = Math.min(distanceToMin, distanceToMax);
      const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
      position.distanceFromRange = `${distancePercent}%`;
    } else {
      if (position.currentPrice < position.rangeMin) {
        const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
        position.distanceFromRange = `-${distance}%`;
      } else {
        const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
        position.distanceFromRange = `+${distance}%`;
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('Hyperion Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function capturePancakeSwapCLMPositions() {
  console.log('PancakeSwap: Parsing CLM positions');

  // Check if we're on a position details page
  const url = window.location.href;
  if (url.includes('/liquidity/')) {
    return capturePancakeSwapPositionDetails();
  }

  // Otherwise, parse the positions list page
  const positions = [];
  const portfolioSummary = {};

  const rows = document.querySelectorAll('table tbody tr, [role="row"], .position-row, [data-position]');

  rows.forEach((row, rowIndex) => {
    try {
      const cells = row.querySelectorAll('td, [role="cell"], .cell');

      if (cells.length < 3) return;

      const position = {};
      const allText = row.innerText || row.textContent;

      // Extract pair
      const pairMatch = allText.match(/([A-Za-z0-9]+)[\s\-\/]+([A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Balance
      const balanceMatch = allText.match(/\$([0-9,]+\.?[0-9]*)/);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      }

      // APR
      const aprMatch = allText.match(/([0-9]+\.?[0-9]*)%/);
      if (aprMatch) {
        position.apy = parseFloat(aprMatch[1]);
      }

      // Pending yield
      const pendingYieldMatch = allText.match(/(?:Pending|Unclaimed|Rewards?)[^\$]*\$([0-9,]+\.?[0-9]*)/i);
      if (pendingYieldMatch) {
        position.pendingYield = parseFloat(pendingYieldMatch[1].replace(/,/g, ''));
      }

      // Range detection
      const numbers = allText.match(/([0-9]+\.?[0-9]+)/g);
      if (numbers && numbers.length >= 3) {
        const unique = [...new Set(numbers.map(parseFloat))];
        if (unique.length >= 3) {
          position.rangeMin = unique[0];
          position.rangeMax = unique[1];
          position.currentPrice = unique[2];
          position.inRange = position.currentPrice >= position.rangeMin &&
                           position.currentPrice <= position.rangeMax;
        }
      }

      // Extract token breakdown
      if (position.token0 && position.token1 && allText) {
        const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
        if (breakdown.token0Amount) {
          Object.assign(position, breakdown);
        } else {
          setTokenBreakdownNull(position);
        }
      }

      position.capturedAt = new Date().toISOString();

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error('Error parsing PancakeSwap position row:', error);
    }
  });

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function capturePancakeSwapPositionDetails() {
  console.log('PancakeSwap: Parsing position details page');

  const position = {};
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('PancakeSwap Details: Page text length:', pageText.length);

  // Try to extract pair from page title FIRST (most reliable)
  const pageTitle = document.title || '';
  const titlePairMatch = pageTitle.match(/([A-Za-z][A-Za-z0-9]+)\s*[\-\/]\s*([A-Z][A-Z0-9]+)/);
  if (titlePairMatch) {
    position.token0 = titlePairMatch[1];
    position.token1 = titlePairMatch[2];
    position.pair = `${titlePairMatch[1]}/${titlePairMatch[2]}`;
    console.log('PancakeSwap Details: Found pair from title:', position.pair);
  }

  // Search all elements for data
  const allElements = document.querySelectorAll('div, span, p, h1, h2, h3');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Extract pair from page content (only if not already found in title)
    if (!position.pair) {
      // Filter out common non-token words that might be misidentified
      const nonTokenWords = ['Trade', 'Perps', 'Liquidity', 'Pool', 'Position', 'Swap', 'Earn', 'Bridge', 'More', 'Back', 'Farms', 'Staking', 'Solana', 'Base', 'Ethereum'];

      // Try exact match first (just the pair on one line) - allow tokens starting with lowercase like cbBTC
      let pairMatch = text.match(/^([A-Za-z][A-Za-z0-9]+)[\s\-\/]+([A-Za-z][A-Za-z0-9]+)$/);
      if (!pairMatch && text.length < 50) {
        // Try looser match allowing some extra text
        pairMatch = text.match(/\b([A-Za-z][A-Za-z0-9]+)[\s\-\/]+([A-Za-z][A-Za-z0-9]+)\b/);
      }

      if (pairMatch) {
        const token0 = pairMatch[1];
        const token1 = pairMatch[2];

        // Reject if either token is a known non-token word
        if (!nonTokenWords.includes(token0) && !nonTokenWords.includes(token1)) {
          // Prefer pairs where at least one token is uppercase (3+ chars) or matches known patterns
          const isLikelyToken = (t) => {
            return (t === t.toUpperCase() && t.length >= 3) || // Fully uppercase 3+ chars (BTC, ETH, USDC)
                   t.match(/^[wc]b?[A-Z]{3,}$/i) || // Wrapped tokens (wBTC, cbBTC, cETH)
                   ['SOL', 'ETH', 'BTC', 'USDC', 'USDT', 'DAI'].includes(t.toUpperCase()); // Exact known tokens
          };

          if (isLikelyToken(token0) || isLikelyToken(token1)) {
            position.token0 = token0;
            position.token1 = token1;
            position.pair = `${token0}/${token1}`;
            console.log('PancakeSwap Details: Found pair:', position.pair);
          }
        }
      }
    }

    // Extract balance/liquidity
    if (!position.balance) {
      // Try with label first - look for larger amounts (position value should be > $100)
      let balanceMatch = text.match(/(?:Liquidity|Value|Position\s+Value)[:\s]+\$([0-9,]+\.?[0-9]*)/i);
      if (!balanceMatch && text.length < 30) {
        // Try just a dollar amount on its own line (e.g., "$ 10,133.97")
        balanceMatch = text.match(/^\$\s*([0-9,]+\.?[0-9]*)$/);
      }
      if (balanceMatch) {
        const value = parseFloat(balanceMatch[1].replace(/,/g, ''));
        // Only accept values > $100 as position balance (filters out small fees/rewards)
        if (value > 100) {
          position.balance = value;
          console.log('PancakeSwap Details: Found balance:', position.balance);
        }
      }
    }

    // Extract APY/APR - look for "APR" followed by percentage
    if (!position.apy) {
      const apyMatch = text.match(/APR[^0-9]*([0-9]+\.?[0-9]*)%/i);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
        console.log('PancakeSwap Details: Found APY:', position.apy);
      }
    }

    // Extract Unclaimed Fees / Earnings
    if (!position.pendingYield) {
      // Try "Unclaimed Fees" first
      let unclaimedMatch = text.match(/Unclaimed\s+Fees[:\s]+\$([0-9,]+\.?[0-9]+)/i);
      if (!unclaimedMatch) {
        // Try "EARNINGS" format (for farming positions)
        unclaimedMatch = text.match(/(?:EARNINGS|Earnings|Total\s+Earnings)[:\s]+\$\s*([0-9,]+\.?[0-9]+)/i);
      }
      if (unclaimedMatch) {
        position.pendingYield = parseFloat(unclaimedMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found pending yield:', position.pendingYield);
      }
    }

    // Extract Min Price with label (EVM chains format)
    if (!position.rangeMin) {
      const minMatch = text.match(/Min\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found min price:', position.rangeMin);
      }
    }

    // Extract Max Price with label (EVM chains format)
    if (!position.rangeMax) {
      const maxMatch = text.match(/Max\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found max price:', position.rangeMax);
      }
    }

    // Extract Current Price with label
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current\s+Price[:\s]+([0-9,]+\.?[0-9]+)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1].replace(/,/g, ''));
        console.log('PancakeSwap Details: Found current price:', position.currentPrice);
      }
    }

    // Solana-specific: Extract price ranges from percentage format
    // Format: "126.5779\n-19.1%" (min) and "189.7748\n+21.3%" (max)
    if (!position.rangeMin || !position.rangeMax) {
      // Look for price followed by negative percentage (min price)
      const minPercentMatch = text.match(/^([0-9]+\.?[0-9]+)\s*\n?\s*-([0-9]+\.?[0-9]+)%/);
      if (minPercentMatch && !position.rangeMin) {
        position.rangeMin = parseFloat(minPercentMatch[1]);
        console.log('PancakeSwap Details: Found min price (Solana format):', position.rangeMin);
      }

      // Look for price followed by positive percentage (max price)
      const maxPercentMatch = text.match(/^([0-9]+\.?[0-9]+)\s*\n?\s*\+([0-9]+\.?[0-9]+)%/);
      if (maxPercentMatch && !position.rangeMax) {
        position.rangeMax = parseFloat(maxPercentMatch[1]);
        console.log('PancakeSwap Details: Found max price (Solana format):', position.rangeMax);
      }
    }
  });

  // Calculate in-range status
  if (position.rangeMin && position.rangeMax && position.currentPrice) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.inRange) {
      const rangeSize = position.rangeMax - position.rangeMin;
      const distanceToMin = position.currentPrice - position.rangeMin;
      const distanceToMax = position.rangeMax - position.currentPrice;
      const minDistance = Math.min(distanceToMin, distanceToMax);
      const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
      position.distanceFromRange = `${distancePercent}%`;
    } else {
      if (position.currentPrice < position.rangeMin) {
        const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
        position.distanceFromRange = `-${distance}%`;
      } else {
        const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
        position.distanceFromRange = `+${distance}%`;
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('PancakeSwap Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureBeefyCLMPositions() {
  console.log('Beefy: Parsing CLM positions');

  // Check if we're on a vault details page
  const url = window.location.href;
  if (url.includes('/vault/')) {
    return captureBeefyVaultDetails();
  }

  // Otherwise, parse the main dashboard page
  const positions = [];
  const portfolioSummary = {};

  // Get page text for debugging
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Beefy: Page text length:', pageText.length);

  // Extract portfolio summary from the top
  const allElements = document.querySelectorAll('div, span, p');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Look for "Deposited" amount
    if (!portfolioSummary.totalValue) {
      const depositedMatch = text.match(/Deposited[:\s]+\$([0-9,]+)/i);
      if (depositedMatch) {
        portfolioSummary.totalValue = depositedMatch[1];
        console.log('Beefy: Found deposited:', portfolioSummary.totalValue);
      }
    }

    // Look for "Avg. APY"
    if (!portfolioSummary.avgAPY) {
      const avgApyMatch = text.match(/Avg\.?\s+APY[:\s]+([0-9]+\.?[0-9]*)%/i);
      if (avgApyMatch) {
        portfolioSummary.avgAPY = avgApyMatch[1];
        console.log('Beefy: Found avg APY:', portfolioSummary.avgAPY);
      }
    }

    // Look for "Daily yield"
    if (!portfolioSummary.dailyYield) {
      const dailyMatch = text.match(/Daily\s+yield[:\s]+\$([0-9.]+)/i);
      if (dailyMatch) {
        portfolioSummary.dailyYield = dailyMatch[1];
        console.log('Beefy: Found daily yield:', portfolioSummary.dailyYield);
      }
    }
  });

  // Find position links - Beefy positions are clickable links
  const allLinks = document.querySelectorAll('a[href*="vault"]');

  const positionLinks = Array.from(allLinks).filter(link => {
    const text = link.innerText || '';
    // Must contain: "CLM" and dollar amount (token pair check happens during parsing)
    return /CLM/i.test(text) &&
           /\$[0-9,]+/.test(text) &&
           text.length > 30 && text.length < 1000;
  });

  console.log(`Beefy: Found ${positionLinks.length} position links`);

  if (positionLinks.length > 0) {
    console.log(`Beefy: Sample link text (first 200 chars):`, positionLinks[0].innerText.substring(0, 200));
  }

  positionLinks.forEach((container, index) => {
    try {
      const allText = container.innerText || container.textContent || '';
      const position = {};

      // Extract pair FIRST (before network) - format: "WBTC-WETH" or "cbBTC-USDC"
      // Note: Beefy uses special Unicode dash character
      // Match any dash-like character, and capture full token names (including prefixes like "cb", "W", etc.)
      // Use greedy match to get full token name before the dash
      const pairMatch = allText.match(/([a-z]*[A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([a-z]*[A-Z][A-Za-z0-9]+)/);
      if (pairMatch) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
      }

      // Extract network/chain - Beefy shows network name in the card but separate from the link
      let networkMatch = allText.match(/(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC|Avalanche|Fantom)/i);

      if (!networkMatch) {
        // The network is usually in a parent container that holds both the network label and the position link
        // Walk up the DOM tree to find a container that has the network name
        let parent = container.parentElement;
        let attempts = 0;
        while (parent && !networkMatch && attempts < 10) {
          const parentText = parent.innerText || '';
          // Check if this container has the network name and isn't too large (avoid capturing entire page)
          if (parentText.length < 2000 && parentText.includes(position.pair)) {
            // This parent contains our position, so search for network name
            networkMatch = parentText.match(/(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC|Avalanche|Fantom)/i);
            if (networkMatch) {
              console.log(`Beefy: Found network "${networkMatch[1]}" in parent container for ${position.pair}`);
              break;
            }
          }
          parent = parent.parentElement;
          attempts++;
        }
      }

      if (networkMatch) {
        position.network = networkMatch[1];
      } else {
        console.log(`Beefy: Could not find network for ${position.pair}`);
      }

      // Extract protocol (Uniswap, etc)
      const protocolMatch = allText.match(/(Uniswap|PancakeSwap|SushiSwap|Balancer|Curve)/i);
      if (protocolMatch) {
        position.protocol = protocolMatch[1];
      }

      // Extract balance - look for dollar amounts
      const dollarAmounts = allText.matchAll(/\$([0-9,]+\.?[0-9]*)/g);
      const amounts = [];
      for (const match of dollarAmounts) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (value > 0 && value < 1000000000) { // Reasonable range for a position
          amounts.push(value);
        }
      }

      // First dollar amount is usually the position balance
      if (amounts.length > 0) {
        position.balance = amounts[0];
      }

      // Extract APY - look for percentage that's not a tiny daily rate
      const percentages = allText.matchAll(/([0-9]+\.?[0-9]+)%/g);
      const apyValues = [];
      for (const match of percentages) {
        const value = parseFloat(match[1]);
        // APY is usually > 1% and < 1000%
        if (value > 1 && value < 1000) {
          apyValues.push(value);
        }
      }

      // First reasonable percentage is usually APY
      if (apyValues.length > 0) {
        position.apy = apyValues[0];
      }

      // Extract daily yield percentage (smaller percentage like 0.027%)
      const dailyYieldMatch = allText.match(/0\.0*[0-9]+%/);
      if (dailyYieldMatch) {
        position.dailyYield = dailyYieldMatch[0];
      }

      // Extract token breakdown
      if (position.token0 && position.token1 && allText) {
        const breakdown = extractTokenBreakdown(allText, position.token0, position.token1);
        if (breakdown.token0Amount) {
          Object.assign(position, breakdown);
        } else {
          setTokenBreakdownNull(position);
        }
      }

      // IMPORTANT: Beefy vaults don't have traditional ranges, always mark as in-range
      position.inRange = true;
      position.rangeStatus = 'vault-managed';

      position.capturedAt = new Date().toISOString();

      console.log(`Beefy Position ${index + 1}:`, position.pair, '-', position.network, '-', `$${position.balance}`, '-', `${position.apy}%`);

      if (position.pair && position.balance) {
        positions.push(position);
      }
    } catch (error) {
      console.error(`Beefy: Error parsing position container ${index}:`, error);
    }
  });

  console.log(`Beefy: Parsed ${positions.length} positions`);

  return {
    summary: portfolioSummary,
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureBeefyVaultDetails() {
  console.log('Beefy: Parsing vault details page');

  const position = {};
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Beefy Details: Page text length:', pageText.length);

  // Search all elements for data
  const allElements = document.querySelectorAll('div, span, p, h1, h2, h3');

  allElements.forEach(el => {
    const text = el.innerText || '';

    // Extract pair from heading (format: "WBTC-​WETH")
    if (!position.pair) {
      const pairMatch = text.match(/^([A-Z][A-Za-z0-9]+)[\u002D\u2013\u2014\u200B\-​]+([A-Z][A-Za-z0-9]+)$/);
      if (pairMatch && text.length < 30) {
        position.token0 = pairMatch[1];
        position.token1 = pairMatch[2];
        position.pair = `${pairMatch[1]}/${pairMatch[2]}`;
        console.log('Beefy Details: Found pair:', position.pair);
      }
    }

    // Extract chain
    if (!position.network) {
      const chainMatch = text.match(/CHAIN:\s*(Arbitrum|Base|Optimism|Polygon|Ethereum|BSC)/i);
      if (chainMatch) {
        position.network = chainMatch[1];
        console.log('Beefy Details: Found chain:', position.network);
      }
    }

    // Extract platform
    if (!position.protocol) {
      const platformMatch = text.match(/PLATFORM:\s*(Uniswap|PancakeSwap|SushiSwap|Balancer|Curve)/i);
      if (platformMatch) {
        position.protocol = platformMatch[1];
        console.log('Beefy Details: Found platform:', position.protocol);
      }
    }

    // Extract APY
    if (!position.apy) {
      const apyMatch = text.match(/^APY\s+([0-9]+\.?[0-9]*)%$/i);
      if (apyMatch) {
        position.apy = parseFloat(apyMatch[1]);
        console.log('Beefy Details: Found APY:', position.apy);
      }
    }

    // Extract Your Deposit balance
    if (!position.balance) {
      const balanceMatch = text.match(/Your Deposit[\s\S]*?\$([0-9,]+\.?[0-9]*)/i);
      if (balanceMatch) {
        position.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        console.log('Beefy Details: Found balance:', position.balance);
      }
    }

    // Extract Min Price
    if (!position.rangeMin) {
      const minMatch = text.match(/Min Price\s+([0-9]+\.?[0-9]+)/i);
      if (minMatch) {
        position.rangeMin = parseFloat(minMatch[1]);
        console.log('Beefy Details: Found min price:', position.rangeMin);
      }
    }

    // Extract Max Price
    if (!position.rangeMax) {
      const maxMatch = text.match(/Max Price\s+([0-9]+\.?[0-9]+)/i);
      if (maxMatch) {
        position.rangeMax = parseFloat(maxMatch[1]);
        console.log('Beefy Details: Found max price:', position.rangeMax);
      }
    }

    // Extract Current Price and in-range status
    if (!position.currentPrice) {
      const currentMatch = text.match(/Current Price\s*\(In Range\)\s+([0-9]+\.?[0-9]+)/i);
      if (currentMatch) {
        position.currentPrice = parseFloat(currentMatch[1]);
        position.inRange = true;
        console.log('Beefy Details: Found current price (in range):', position.currentPrice);
      } else {
        const currentOutMatch = text.match(/Current Price\s*\(Out of Range\)\s+([0-9]+\.?[0-9]+)/i);
        if (currentOutMatch) {
          position.currentPrice = parseFloat(currentOutMatch[1]);
          position.inRange = false;
          console.log('Beefy Details: Found current price (out of range):', position.currentPrice);
        } else {
          const currentSimpleMatch = text.match(/Current Price\s+([0-9]+\.?[0-9]+)/i);
          if (currentSimpleMatch) {
            position.currentPrice = parseFloat(currentSimpleMatch[1]);
            console.log('Beefy Details: Found current price:', position.currentPrice);
          }
        }
      }
    }
  });

  // Calculate in-range status if we have all price data
  if (position.rangeMin && position.rangeMax && position.currentPrice && position.inRange === undefined) {
    position.inRange = position.currentPrice >= position.rangeMin &&
                       position.currentPrice <= position.rangeMax;
  }

  if (position.inRange !== undefined) {
    position.rangeStatus = position.inRange ? 'in-range' : 'out-of-range';

    // Calculate distance from range
    if (position.rangeMin && position.rangeMax && position.currentPrice) {
      if (position.inRange) {
        const rangeSize = position.rangeMax - position.rangeMin;
        const distanceToMin = position.currentPrice - position.rangeMin;
        const distanceToMax = position.rangeMax - position.currentPrice;
        const minDistance = Math.min(distanceToMin, distanceToMax);
        const distancePercent = ((minDistance / rangeSize) * 100).toFixed(1);
        position.distanceFromRange = `${distancePercent}%`;
      } else {
        if (position.currentPrice < position.rangeMin) {
          const distance = ((position.rangeMin - position.currentPrice) / position.rangeMin * 100).toFixed(1);
          position.distanceFromRange = `-${distance}%`;
        } else {
          const distance = ((position.currentPrice - position.rangeMax) / position.rangeMax * 100).toFixed(1);
          position.distanceFromRange = `+${distance}%`;
        }
      }
    }
  }

  position.capturedAt = new Date().toISOString();

  const positions = position.pair ? [position] : [];

  console.log('Beefy Details: Final position:', JSON.stringify(position, null, 2));

  return {
    summary: {},
    positions: positions,
    positionCount: positions.length,
    inRangeCount: positions.filter(p => p.inRange).length,
    outOfRangeCount: positions.filter(p => !p.inRange).length
  };
}

function captureImages() {
  const images = document.querySelectorAll('img[src]');
  return Array.from(images).map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title || '',
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height
  }));
}

function captureLinks() {
  const links = document.querySelectorAll('a[href]');
  return Array.from(links).map(link => ({
    text: link.innerText?.trim() || link.title || '',
    href: link.href,
    isExternal: !link.href.includes(window.location.hostname)
  })).filter(link => link.text || link.href);
}

function captureTables() {
  const tables = document.querySelectorAll('table');
  return Array.from(tables).map(table => {
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
}

function captureText() {
  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
  const textContent = new Set();

  textElements.forEach(element => {
    const text = element.innerText?.trim();
    if (text && text.length > 0 && text.length < 5000) {
      textContent.add(text);
    }
  });

  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    if (elements.length > 0) {
      headings[`h${i}`] = Array.from(elements).map(el => el.innerText?.trim()).filter(Boolean);
    }
  }

  return {
    allText: Array.from(textContent),
    headings: headings
  };
}

function captureHyperliquidPositions() {
  console.log('Hyperliquid: Parsing positions');

  const positions = [];
  const summary = {};

  // Get all text content for easier parsing
  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Hyperliquid: Page text length:', pageText.length);

  // Look for position rows
  // Hyperliquid displays positions in a table/list format
  // Each position has: symbol, leverage, size, USD value, entry price, mark price, PnL, liquidation, margin, funding

  const allElements = document.querySelectorAll('div, span, td, tr');

  let currentPosition = null;
  const positionData = [];

  // Common crypto symbols to detect
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'APT', 'SUI', 'PUMP', 'AVAX', 'ARB', 'OP', 'MATIC', 'LINK', 'UNI', 'AAVE'];

  allElements.forEach(el => {
    const text = (el.innerText || el.textContent || '').trim();

    // Detect position by crypto symbol followed by leverage (e.g., "BTC  20x")
    const symbolMatch = text.match(/^(BTC|ETH|SOL|APT|SUI|PUMP|AVAX|ARB|OP|MATIC|LINK|UNI|AAVE)\s+(\d+)x/);
    if (symbolMatch) {
      // If we have a current position, save it
      if (currentPosition && currentPosition.symbol) {
        positionData.push({...currentPosition});
      }

      // Start new position
      currentPosition = {
        symbol: symbolMatch[1],
        leverage: symbolMatch[2] + 'x'
      };
      console.log('Hyperliquid: Found position:', currentPosition.symbol, currentPosition.leverage);
    }

    // Parse position size (e.g., "0.28732 BTC", "179.08 SOL")
    if (currentPosition && !currentPosition.size) {
      const sizeMatch = text.match(/^([0-9,]+\.?[0-9]*)\s+(BTC|ETH|SOL|APT|SUI|PUMP|AVAX|ARB|OP|MATIC|LINK|UNI|AAVE)/);
      if (sizeMatch && sizeMatch[2] === currentPosition.symbol) {
        currentPosition.size = sizeMatch[1];
        console.log('Hyperliquid: Found size:', currentPosition.size, currentPosition.symbol);
      }
    }

    // Parse USD value (e.g., "30,033.85 USDC")
    if (currentPosition && !currentPosition.usdValue) {
      const usdMatch = text.match(/^([0-9,]+\.?[0-9]*)\s+USDC$/);
      if (usdMatch) {
        currentPosition.usdValue = usdMatch[1].replace(/,/g, '');
        console.log('Hyperliquid: Found USD value:', currentPosition.usdValue);
      }
    }

    // Parse entry price (first price number after USD value)
    if (currentPosition && currentPosition.usdValue && !currentPosition.entryPrice) {
      const priceMatch = text.match(/^([0-9,]+\.?[0-9]*)$/);
      if (priceMatch) {
        currentPosition.entryPrice = priceMatch[1].replace(/,/g, '');
        console.log('Hyperliquid: Found entry price:', currentPosition.entryPrice);
      }
    }

    // Parse mark price (second price after entry)
    if (currentPosition && currentPosition.entryPrice && !currentPosition.markPrice) {
      const priceMatch = text.match(/^([0-9,]+\.?[0-9]*)$/);
      if (priceMatch && priceMatch[1] !== currentPosition.entryPrice) {
        currentPosition.markPrice = priceMatch[1].replace(/,/g, '');
        console.log('Hyperliquid: Found mark price:', currentPosition.markPrice);
      }
    }

    // Parse PnL (e.g., "-$73.93 (-4.9%)")
    if (currentPosition && !currentPosition.pnl) {
      const pnlMatch = text.match(/^(-?\$[0-9,]+\.?[0-9]*)\s+\((-?[0-9.]+)%\)/);
      if (pnlMatch) {
        currentPosition.pnl = pnlMatch[1];
        currentPosition.pnlPercent = pnlMatch[2];
        console.log('Hyperliquid: Found PnL:', currentPosition.pnl, currentPosition.pnlPercent + '%');
      }
    }

    // Parse liquidation price
    if (currentPosition && !currentPosition.liquidationPrice) {
      const liqMatch = text.match(/^([0-9,]+\.?[0-9]*)$/);
      if (liqMatch && currentPosition.markPrice && liqMatch[1] !== currentPosition.markPrice && liqMatch[1] !== currentPosition.entryPrice) {
        currentPosition.liquidationPrice = liqMatch[1].replace(/,/g, '');
        console.log('Hyperliquid: Found liquidation price:', currentPosition.liquidationPrice);
      }
    }

    // Parse margin (e.g., "$1,501.69 (Cross)")
    if (currentPosition && !currentPosition.margin) {
      const marginMatch = text.match(/^\$([0-9,]+\.?[0-9]*)\s+\((Cross|Isolated)\)/);
      if (marginMatch) {
        currentPosition.margin = marginMatch[1].replace(/,/g, '');
        currentPosition.marginType = marginMatch[2];
        console.log('Hyperliquid: Found margin:', currentPosition.margin, currentPosition.marginType);
      }
    }

    // Parse funding rate (e.g., "$27.27", "-$13.47")
    if (currentPosition && !currentPosition.fundingRate) {
      const fundingMatch = text.match(/^(-?\$[0-9,]+\.?[0-9]*)$/);
      if (fundingMatch && currentPosition.margin) {
        currentPosition.fundingRate = fundingMatch[1];
        console.log('Hyperliquid: Found funding:', currentPosition.fundingRate);
      }
    }
  });

  // Save last position
  if (currentPosition && currentPosition.symbol) {
    positionData.push({...currentPosition});
  }

  // Convert to standard format
  positionData.forEach(pos => {
    if (pos.symbol && pos.usdValue) {
      const position = {
        symbol: pos.symbol,
        leverage: pos.leverage || 'N/A',
        size: pos.size || 'N/A',
        usdValue: parseFloat(pos.usdValue) || 0,
        entryPrice: parseFloat(pos.entryPrice) || 0,
        markPrice: parseFloat(pos.markPrice) || 0,
        pnl: pos.pnl || '$0',
        pnlPercent: pos.pnlPercent || '0',
        liquidationPrice: parseFloat(pos.liquidationPrice) || 0,
        margin: parseFloat(pos.margin) || 0,
        marginType: pos.marginType || 'Cross',
        fundingRate: pos.fundingRate || '$0',
        capturedAt: new Date().toISOString()
      };
      positions.push(position);
    }
  });

  console.log('Hyperliquid: Found', positions.length, 'positions');

  // Calculate summary
  const totalValue = positions.reduce((sum, p) => sum + p.usdValue, 0);
  const totalPnL = positions.reduce((sum, p) => {
    const pnl = parseFloat(p.pnl.replace(/[$,]/g, ''));
    return sum + pnl;
  }, 0);
  const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0);

  summary.totalPositions = positions.length;
  summary.totalValue = totalValue.toFixed(2);
  summary.totalPnL = totalPnL.toFixed(2);
  summary.totalMargin = totalMargin.toFixed(2);
  summary.avgLeverage = positions.length > 0
    ? (positions.reduce((sum, p) => sum + parseInt(p.leverage), 0) / positions.length).toFixed(1)
    : '0';

  console.log('Hyperliquid Summary:', summary);

  return {
    summary: summary,
    positions: positions,
    positionCount: positions.length,
    totalValue: summary.totalValue,
    totalPnL: summary.totalPnL
  };
}

function captureAavePositions() {
  console.log('Aave: Parsing lending positions');

  const positions = [];
  const summary = {};

  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Aave: Page text length:', pageText.length);

  // Extract dashboard summary
  const allElements = document.querySelectorAll('div, span, p, td');

  // Look for Net Worth, Net APY, Health Factor
  allElements.forEach(el => {
    const text = (el.innerText || el.textContent || '').trim();

    if (text === 'Net worth' && !summary.netWorth) {
      const nextEl = el.nextElementSibling || el.parentElement?.nextElementSibling;
      if (nextEl) {
        const worthMatch = nextEl.textContent.match(/\$\s*([0-9,]+\.?[0-9]*[KkMm]?)/);
        if (worthMatch) {
          summary.netWorth = worthMatch[1];
          console.log('Aave: Found net worth:', summary.netWorth);
        }
      }
    }

    if (text === 'Net APY' && !summary.netAPY) {
      const nextEl = el.nextElementSibling || el.parentElement?.nextElementSibling;
      if (nextEl) {
        const apyMatch = nextEl.textContent.match(/(-?[0-9.]+)\s*%/);
        if (apyMatch) {
          summary.netAPY = apyMatch[1];
          console.log('Aave: Found net APY:', summary.netAPY + '%');
        }
      }
    }

    if (text === 'Health factor' && !summary.healthFactor) {
      const nextEl = el.nextElementSibling || el.parentElement?.nextElementSibling;
      if (nextEl) {
        const hfMatch = nextEl.textContent.match(/([0-9.]+)/);
        if (hfMatch) {
          summary.healthFactor = hfMatch[1];
          console.log('Aave: Found health factor:', summary.healthFactor);
        }
      }
    }

    if (text === 'Balance' && !summary.suppliesBalance) {
      const nextEl = el.nextElementSibling || el.parentElement?.nextElementSibling;
      if (nextEl) {
        const balMatch = nextEl.textContent.match(/\$\s*([0-9,]+\.?[0-9]*[KkMm]?)/);
        if (balMatch) {
          summary.suppliesBalance = balMatch[1];
          console.log('Aave: Found supplies balance:', summary.suppliesBalance);
        }
      }
    }
  });

  // Parse supply and borrow positions
  let currentAsset = null;
  let foundSuppliesSection = false;
  let foundBorrowsSection = false;

  allElements.forEach(el => {
    const text = (el.innerText || el.textContent || '').trim();

    // Detect "Your supplies" section
    if (text.includes('Your supplies')) {
      foundSuppliesSection = true;
      foundBorrowsSection = false;
      console.log('Aave: Found supplies section');
    }

    // Detect "Your borrows" section
    if (text.includes('Your borrows')) {
      foundBorrowsSection = true;
      foundSuppliesSection = false;
      if (currentAsset && currentAsset.asset) {
        positions.push({...currentAsset});
        currentAsset = null;
      }
      console.log('Aave: Found borrows section');
    }

    // Look for asset symbols (ETH, WBTC, USDC, etc.)
    if (foundSuppliesSection || foundBorrowsSection) {
      const assetMatch = text.match(/^(ETH|WBTC|USDC|USDT|DAI|wstETH|cbBTC|WETH)$/);
      if (assetMatch) {
        if (currentAsset && currentAsset.asset) {
          positions.push({...currentAsset});
        }
        currentAsset = {
          asset: assetMatch[1],
          type: foundBorrowsSection ? 'borrow' : 'supply'
        };
        console.log('Aave: Found', currentAsset.type, 'asset:', currentAsset.asset);
      }

      // Parse balance amount
      if (currentAsset && !currentAsset.amount) {
        const amountMatch = text.match(/^([0-9.]+)\s*$/);
        if (amountMatch && parseFloat(amountMatch[1]) > 0) {
          currentAsset.amount = amountMatch[1];
          console.log('Aave: Found amount:', currentAsset.amount, currentAsset.asset);
        }
      }

      // Parse USD value
      if (currentAsset && !currentAsset.usdValue) {
        const usdMatch = text.match(/^\$([0-9,]+\.?[0-9]*)/);
        if (usdMatch) {
          currentAsset.usdValue = usdMatch[1].replace(/,/g, '');
          console.log('Aave: Found USD value:', currentAsset.usdValue);
        }
      }

      // Parse APY
      if (currentAsset && !currentAsset.apy) {
        const apyMatch = text.match(/^([0-9.]+)\s*%$/);
        if (apyMatch) {
          currentAsset.apy = apyMatch[1];
          console.log('Aave: Found APY:', currentAsset.apy + '%');
        }
      }
    }
  });

  // Save last asset
  if (currentAsset && currentAsset.asset) {
    positions.push({...currentAsset});
  }

  // Filter to only keep complete positions with amount AND usdValue
  const completePositions = positions.filter(pos => {
    return pos.asset && pos.amount && pos.usdValue && parseFloat(pos.usdValue) > 0;
  });

  // Deduplicate by asset name (keep first occurrence which usually has the most complete data)
  const seenAssets = new Set();
  const uniquePositions = completePositions.filter(pos => {
    if (seenAssets.has(pos.asset)) {
      return false;
    }
    seenAssets.add(pos.asset);
    return true;
  });

  // Add captured timestamp
  uniquePositions.forEach(pos => {
    pos.capturedAt = new Date().toISOString();
    pos.protocol = 'Aave';
  });

  // Separate supplies and borrows
  const supplies = uniquePositions.filter(p => p.type === 'supply');
  const borrows = uniquePositions.filter(p => p.type === 'borrow');

  // Calculate total borrowed
  const totalBorrowed = borrows.reduce((sum, b) => sum + parseFloat(b.usdValue || 0), 0);

  console.log('Aave: Found', supplies.length, 'supplies,', borrows.length, 'borrows');

  return {
    summary: {
      ...summary,
      totalBorrowed: totalBorrowed.toFixed(2)
    },
    positions: uniquePositions,  // Keep all positions (supplies + borrows)
    supplies: supplies,
    borrows: borrows,
    positionCount: uniquePositions.length,
    totalValue: summary.suppliesBalance || '0'
  };
}

function captureMorphoPositions() {
  console.log('Morpho: Parsing lending positions');

  const positions = [];
  const summary = {};

  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Morpho: Page text length:', pageText.length);

  const allElements = document.querySelectorAll('div, span, p, td, tr');

  // Look for actual position data (more specific than just "Borrow")
  let currentPosition = null;
  let debugCount = 0;

  allElements.forEach(el => {
    const text = (el.innerText || el.textContent || '').trim();

    // Debug: Log elements that contain collateral asset names
    if (debugCount < 50 && (text.includes('wstETH') || text.includes('cbBTC') || text.includes('WBTC'))) {
      console.log('Morpho Debug [' + debugCount + ']:', text);
      debugCount++;
    }

    // Try to parse full row format: "17.9451 wstETH ($78.11k) | 25.01k USDC ($25.01k) | 5.76% | 2.73 | 90.26%"
    const fullRowMatch = text.match(/([0-9.]+)\s+(wstETH|cbBTC|WBTC|ETH)\s+\(\$([0-9.]+k)\)\s*\|\s*([0-9.]+k?)\s+(USDC|USDT|DAI)\s+\(\$([0-9.]+k)\)\s*\|\s*([0-9.]+)%\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)%/);

    if (fullRowMatch) {
      const position = {
        collateralAmount: fullRowMatch[1],
        collateralAsset: fullRowMatch[2],
        collateralValue: fullRowMatch[3],
        loanAmount: fullRowMatch[4],
        loanAsset: fullRowMatch[5],
        loanValue: fullRowMatch[6],
        rate: fullRowMatch[7],
        healthFactor: fullRowMatch[8],
        utilization: fullRowMatch[9],
        type: 'lending'
      };
      positions.push(position);
      console.log('Morpho: Found complete position:', position.collateralAsset, position.collateralAmount);
      return; // Skip individual field parsing
    }

    // Fallback: Parse individual fields (original logic)
    // Parse collateral with inline USD value (e.g., "17.9451 wstETH ($78.11k)")
    const collateralMatch = text.match(/([0-9.]+)\s+(wstETH|cbBTC|WBTC|ETH|USDC|USDT|DAI)\s+\(\$([0-9.]+k)\)/);
    if (collateralMatch) {
      if (currentPosition && currentPosition.collateralAsset) {
        positions.push({...currentPosition});
      }
      currentPosition = {
        collateralAmount: collateralMatch[1],
        collateralAsset: collateralMatch[2],
        collateralValue: collateralMatch[3],
        type: 'lending'
      };
      console.log('Morpho: Found collateral:', currentPosition.collateralAmount, currentPosition.collateralAsset, '$' + currentPosition.collateralValue);
    }

    // Parse loan with inline USD value (e.g., "25.01k USDC ($25.01k)")
    if (currentPosition && !currentPosition.loanAmount) {
      const loanMatch = text.match(/([0-9.]+k?)\s+(USDC|USDT|DAI)\s+\(\$([0-9.]+k)\)/);
      if (loanMatch) {
        currentPosition.loanAmount = loanMatch[1];
        currentPosition.loanAsset = loanMatch[2];
        currentPosition.loanValue = loanMatch[3];
        console.log('Morpho: Found loan:', currentPosition.loanAmount, currentPosition.loanAsset, '$' + currentPosition.loanValue);
      }
    }

    // Parse rate (APY)
    if (currentPosition && !currentPosition.rate) {
      const rateMatch = text.match(/^([0-9.]+)%$/);
      if (rateMatch) {
        currentPosition.rate = rateMatch[1];
        console.log('Morpho: Found rate:', currentPosition.rate + '%');
      }
    }

    // Parse health factor
    if (currentPosition && !currentPosition.healthFactor) {
      const healthMatch = text.match(/^([0-9.]+)$/);
      if (healthMatch && parseFloat(healthMatch[1]) >= 1 && parseFloat(healthMatch[1]) <= 10) {
        currentPosition.healthFactor = healthMatch[1];
        console.log('Morpho: Found health factor:', currentPosition.healthFactor);
      }
    }

    // Parse utilization
    if (currentPosition && !currentPosition.utilization) {
      const utilizationMatch = text.match(/^([0-9.]+)%$/);
      if (utilizationMatch && currentPosition.healthFactor) {
        currentPosition.utilization = utilizationMatch[1];
        console.log('Morpho: Found utilization:', currentPosition.utilization + '%');
      }
    }
  });

  // Save last position
  if (currentPosition && currentPosition.collateralAsset) {
    positions.push({...currentPosition});
  }

  // Add captured timestamp
  positions.forEach(pos => {
    pos.capturedAt = new Date().toISOString();
    pos.protocol = 'Morpho';
  });

  console.log('Morpho: Found', positions.length, 'positions');

  // Calculate summary
  const totalCollateral = positions.reduce((sum, p) => {
    const value = parseFloat(p.collateralValue?.replace(/[k$,]/g, '') || 0) * 1000;
    return sum + value;
  }, 0);

  summary.totalPositions = positions.length;
  summary.totalCollateral = (totalCollateral / 1000).toFixed(2) + 'k';

  return {
    summary: summary,
    positions: positions,
    positionCount: positions.length,
    totalCollateral: summary.totalCollateral
  };
}

function captureMorphoPositionDetail() {
  console.log('Morpho: Parsing position detail page');

  const position = {
    type: 'lending',
    protocol: 'Morpho'
  };

  const pageText = document.body.innerText || document.body.textContent || '';
  console.log('Morpho Detail: Page text length:', pageText.length);

  const allElements = document.querySelectorAll('div, span, p, h1, h2, h3');

  // Market info
  const marketMatch = pageText.match(/(wstETH|cbBTC|WBTC|ETH)\s*\/\s*(USDC|USDT|DAI)/);
  if (marketMatch) {
    position.collateralAsset = marketMatch[1];
    position.loanAsset = marketMatch[2];
    console.log('Morpho Detail: Market pair:', position.collateralAsset + '/' + position.loanAsset);
  }

  // Rate
  const rateMatch = pageText.match(/Rate[\s\S]*?([0-9.]+)\s*%/);
  if (rateMatch) {
    position.rate = rateMatch[1];
    console.log('Morpho Detail: Rate:', position.rate + '%');
  }

  // Collateral amount and value
  const collateralMatch = pageText.match(/Collateral[\s\S]*?([0-9.,]+)\s+(wstETH|cbBTC|WBTC|ETH)[\s\S]*?\$([0-9.]+k)/);
  if (collateralMatch) {
    position.collateralAmount = collateralMatch[1].replace(/,/g, '');
    position.collateralAsset = collateralMatch[2];
    position.collateralValue = collateralMatch[3];
    console.log('Morpho Detail: Collateral:', position.collateralAmount, position.collateralAsset, '$' + position.collateralValue);
  }

  // Loan amount and value
  const loanMatch = pageText.match(/Loan[\s\S]*?([0-9.,]+)\s+(USDC|USDT|DAI)[\s\S]*?\$([0-9.]+k)/);
  if (loanMatch) {
    position.loanAmount = loanMatch[1].replace(/,/g, '');
    position.loanAsset = loanMatch[2];
    position.loanValue = loanMatch[3];
    console.log('Morpho Detail: Loan:', position.loanAmount, position.loanAsset, '$' + position.loanValue);
  }

  // LTV and Liquidation LTV
  const ltvMatch = pageText.match(/LTV\s*\/\s*Liquidation LTV[\s\S]*?([0-9.]+)%[\s\S]*?\/[\s\S]*?([0-9.]+)%/);
  if (ltvMatch) {
    position.ltv = ltvMatch[1];
    position.liquidationLTV = ltvMatch[2];
    console.log('Morpho Detail: LTV:', position.ltv + '%, Liquidation LTV:', position.liquidationLTV + '%');
  }

  // Liquidation price
  const liqPriceMatch = pageText.match(/Liquidation price[\s\S]*?([0-9.,]+)\s+(USDC|USDT|DAI)\s*\/\s*(wstETH|cbBTC|WBTC|ETH)/);
  if (liqPriceMatch) {
    position.liquidationPrice = liqPriceMatch[1].replace(/,/g, '');
    position.liquidationPricePair = liqPriceMatch[2] + '/' + liqPriceMatch[3];
    console.log('Morpho Detail: Liquidation price:', position.liquidationPrice, position.liquidationPricePair);
  }

  // Drop to liquidation percentage
  const dropMatch = pageText.match(/drop to liquidation[\s\S]*?(-?[0-9.]+)%/);
  if (dropMatch) {
    position.dropToLiquidation = dropMatch[1];
    console.log('Morpho Detail: Drop to liquidation:', position.dropToLiquidation + '%');
  }

  // Utilization
  const utilizationMatch = pageText.match(/Utilization[\s\S]*?([0-9.]+)%/);
  if (utilizationMatch) {
    position.utilization = utilizationMatch[1];
    console.log('Morpho Detail: Utilization:', position.utilization + '%');
  }

  // Total Market Size
  const marketSizeMatch = pageText.match(/Total Market Size[\s\S]*?\$([0-9.]+[MK])/);
  if (marketSizeMatch) {
    position.totalMarketSize = marketSizeMatch[1];
    console.log('Morpho Detail: Total Market Size:', '$' + position.totalMarketSize);
  }

  // Total Liquidity
  const liquidityMatch = pageText.match(/Total Liquidity[\s\S]*?\$([0-9.]+[MK])/);
  if (liquidityMatch) {
    position.totalLiquidity = liquidityMatch[1];
    console.log('Morpho Detail: Total Liquidity:', '$' + position.totalLiquidity);
  }

  position.capturedAt = new Date().toISOString();

  // Check if we got the essential data
  const hasEssentialData = position.collateralAmount && position.loanAmount;

  console.log('Morpho Detail: Capture', hasEssentialData ? 'successful' : 'incomplete');

  return {
    position: position,
    hasData: hasEssentialData,
    totalCollateral: position.collateralValue || '0',
    totalLoan: position.loanValue || '0'
  };
}

function highlightCaptureElements() {
  const style = document.createElement('style');
  style.id = 'brave-capture-highlight';
  style.textContent = `
    .brave-capture-highlight {
      outline: 2px solid #667eea !important;
      outline-offset: 2px !important;
      animation: brave-capture-pulse 2s infinite !important;
    }

    @keyframes brave-capture-pulse {
      0% { outline-color: #667eea; }
      50% { outline-color: #764ba2; }
      100% { outline-color: #667eea; }
    }
  `;

  const existingStyle = document.getElementById('brave-capture-highlight');
  if (existingStyle) {
    existingStyle.remove();
  }

  document.head.appendChild(style);

  const elementsToHighlight = document.querySelectorAll('[data-capture], [data-track], .capture-this, form, table, [data-id], [data-value]');
  elementsToHighlight.forEach(el => {
    el.classList.add('brave-capture-highlight');
  });

  setTimeout(() => {
    elementsToHighlight.forEach(el => {
      el.classList.remove('brave-capture-highlight');
    });
    style.remove();
  }, 5000);
}

// ===== BATCH EXTRACTION FUNCTIONS =====

// Get list of all positions on the page with their extraction status
async function getBatchPositionsList() {
  console.log('Getting batch positions list...');

  const protocol = detectProtocol();
  console.log('Detected protocol:', protocol);

  if (protocol === 'Orca') {
    return getOrcaBatchPositions();
  } else if (protocol === 'Uniswap') {
    return getUniswapBatchPositions();
  } else {
    throw new Error(`Batch extraction not supported for protocol: ${protocol}`);
  }
}

// Detect which protocol we're on
function detectProtocol() {
  const hostname = window.location.hostname;
  if (hostname.includes('orca.so')) return 'Orca';
  if (hostname.includes('uniswap.org')) return 'Uniswap';
  if (hostname.includes('raydium.io')) return 'Raydium';
  return 'Unknown';
}

// Get Orca positions that need extraction
function getOrcaBatchPositions() {
  console.log('Getting Orca positions for batch extraction...');

  const positions = [];
  const rows = document.querySelectorAll('table tbody tr');

  console.log(`Found ${rows.length} rows in Orca table`);

  rows.forEach((row, index) => {
    try {
      const cells = row.querySelectorAll('td');
      if (cells.length < 6) return;

      // Extract pair name from first cell
      const poolText = cells[0]?.textContent?.trim();
      if (!poolText || !poolText.includes('/')) return;

      const poolMatch = poolText.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
      if (!poolMatch) return;

      const pair = `${poolMatch[1]}/${poolMatch[2]}`;

      // For now, assume all positions need extraction
      // In the future, we could query the database to check which ones already have data
      positions.push({
        index: index,
        pair: pair,
        protocol: 'Orca',
        needsExtraction: true
      });
    } catch (error) {
      console.warn(`Error parsing row ${index}:`, error);
    }
  });

  console.log(`Found ${positions.length} Orca positions`);
  return positions;
}

// Get Uniswap positions that need extraction
function getUniswapBatchPositions() {
  console.log('Getting Uniswap positions for batch extraction...');

  const positions = [];
  const positionCards = document.querySelectorAll('[data-testid="position-card"], .position-card, [class*="PositionCard"]');

  console.log(`Found ${positionCards.length} Uniswap position cards`);

  positionCards.forEach((card, index) => {
    try {
      // Extract pair name from card content
      const text = card.textContent || '';
      const pairMatch = text.match(/([A-Z]{3,5})\s*\/\s*([A-Z]{3,5})/);

      if (pairMatch) {
        const pair = `${pairMatch[1]}/${pairMatch[2]}`;
        positions.push({
          index: index,
          pair: pair,
          protocol: 'Uniswap',
          needsExtraction: true
        });
      }
    } catch (error) {
      console.warn(`Error parsing Uniswap card ${index}:`, error);
    }
  });

  console.log(`Found ${positions.length} Uniswap positions`);
  return positions;
}

// Expand a position to show token breakdown
async function expandPosition(index, protocol) {
  console.log(`Expanding position ${index} for ${protocol}...`);

  if (protocol === 'Orca') {
    return expandOrcaPosition(index);
  } else if (protocol === 'Uniswap') {
    return expandUniswapPosition(index);
  } else {
    throw new Error(`Expansion not supported for protocol: ${protocol}`);
  }
}

// Expand an Orca position by clicking its row
async function expandOrcaPosition(index) {
  const rows = document.querySelectorAll('table tbody tr');

  if (index >= rows.length) {
    throw new Error(`Position index ${index} out of range (${rows.length} rows)`);
  }

  const targetRow = rows[index];
  console.log(`Clicking Orca row ${index}:`, targetRow);

  // Click the row to open the drawer
  targetRow.click();

  // Wait for drawer to open with animation
  await waitForOrcaDrawer();

  console.log(`Orca position ${index} expanded successfully`);
}

// Wait for Orca drawer to open and be ready
async function waitForOrcaDrawer() {
  const maxAttempts = 20; // 2 seconds total
  const delayMs = 100;

  for (let i = 0; i < maxAttempts; i++) {
    // Look for the drawer container - it typically has specific classes or attributes
    // Common patterns: drawer, modal, panel, sidebar with "open" or "visible" state
    const drawer = document.querySelector('[class*="Drawer"][class*="open"], [class*="drawer"][class*="open"], [role="dialog"]');

    if (drawer) {
      // Drawer found, wait a bit more for content to load
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('Orca drawer detected and ready');
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  console.warn('Orca drawer not detected, but continuing anyway');
  return false;
}

// Expand a Uniswap position by clicking its card
async function expandUniswapPosition(index) {
  const positionCards = document.querySelectorAll('[data-testid="position-card"], .position-card, [class*="PositionCard"]');

  if (index >= positionCards.length) {
    throw new Error(`Position index ${index} out of range (${positionCards.length} cards)`);
  }

  const targetCard = positionCards[index];
  console.log(`Clicking Uniswap card ${index}:`, targetCard);

  // Click the card to open details
  targetCard.click();

  // Wait for details panel to open
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`Uniswap position ${index} expanded successfully`);
}

// Close expanded position (protocol-specific)
async function closePosition(protocol) {
  console.log(`Closing position for ${protocol}...`);

  if (protocol === 'Orca') {
    return closeOrcaPosition();
  } else if (protocol === 'Uniswap') {
    return closeUniswapPosition();
  }

  console.log('Position closed');
}

// Close Orca drawer
async function closeOrcaPosition() {
  // Look for close button in drawer (X button, close button, etc.)
  const closeButton = document.querySelector('[class*="Drawer"] button[aria-label*="close"], [class*="drawer"] button[aria-label*="close"], [role="dialog"] button[aria-label*="close"]');

  if (closeButton) {
    console.log('Clicking Orca close button');
    closeButton.click();
  } else {
    // Fallback: click outside the drawer (on backdrop)
    console.log('No close button found, clicking backdrop');
    const backdrop = document.querySelector('[class*="Backdrop"], [class*="backdrop"], [class*="overlay"]');
    if (backdrop) {
      backdrop.click();
    } else {
      // Last resort: press Escape key
      console.log('No backdrop found, pressing Escape');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
    }
  }

  // Wait for drawer to close
  await new Promise(resolve => setTimeout(resolve, 300));
}

// Close Uniswap details panel
async function closeUniswapPosition() {
  // Look for close button or back button
  const closeButton = document.querySelector('[aria-label*="close"], [aria-label*="back"], button[class*="close"]');

  if (closeButton) {
    console.log('Clicking Uniswap close button');
    closeButton.click();
  } else {
    // Press Escape
    console.log('No close button found, pressing Escape');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
  }

  await new Promise(resolve => setTimeout(resolve, 300));
}
