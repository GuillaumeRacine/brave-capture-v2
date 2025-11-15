// AI Vision module for extracting token breakdown from screenshots
// Uses Claude API (Anthropic) for vision analysis

// Never hardcode API keys. Prefer background-config.js (MV3 service worker)
// or environment variables when running in Node.
function getAnthropicApiKey() {
  try {
    // Background service worker (MV3)
    if (typeof self !== 'undefined' && typeof self.BACKGROUND_CONFIG !== 'undefined') {
      return self.BACKGROUND_CONFIG.ANTHROPIC_API_KEY || '';
    }
  } catch (_) {}

  try {
    // Node environment (tests, scripts)
    if (typeof process !== 'undefined' && process.env && process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  } catch (_) {}

  return '';
}

/**
 * Extract token breakdown data from a screenshot using Claude Vision
 * @param {string} screenshotDataUrl - Base64 data URL of the screenshot
 * @param {string} pair - Expected token pair (e.g., "cbBTC/USDC")
 * @returns {Promise<Object>} Extracted balance data
 */
async function extractBalanceFromScreenshot(screenshotDataUrl, pair) {
  console.log('🤖 Analyzing screenshot with Claude Vision for pair:', pair);

  const ANTHROPIC_API_KEY = getAnthropicApiKey();
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Extract tokens from pair name
  const pairMatch = pair.match(/([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/);
  if (!pairMatch) {
    throw new Error('Invalid pair format');
  }

  const token0 = pairMatch[1].replace(/0+$/, ''); // Remove trailing zeros
  const token1 = pairMatch[2].replace(/0+$/, '');

  console.log(`Looking for tokens: ${token0} and ${token1}`);

  // Convert data URL to base64 (remove the data:image/png;base64, prefix)
  const base64Image = screenshotDataUrl.split(',')[1];

  const prompt = `You are analyzing a screenshot of a DeFi CLM (Concentrated Liquidity Market Maker) position from Orca.

Please extract the token balance breakdown information. Look for a section that shows:
- Token amounts (the actual quantity of each token)
- Percentages (what % of the position each token represents)

The position contains these two tokens:
1. ${token0}
2. ${token1}

Find the balance breakdown and return ONLY a JSON object in this exact format (no markdown, no explanations):
{
  "token0Amount": <number>,
  "token1Amount": <number>,
  "token0Percentage": <number>,
  "token1Percentage": <number>
}

Example: If you see "0.03480719 cbBTC 36.4% $3,691" and "6443.29283 USDC 63.6% $6,442", return:
{
  "token0Amount": 0.03480719,
  "token1Amount": 6443.29283,
  "token0Percentage": 36.4,
  "token1Percentage": 63.6
}

Return ONLY the JSON object, nothing else.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
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
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Claude API response:', data);

    // Extract the text response
    const textContent = data.content.find(c => c.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Parse the JSON from Claude's response
    let responseText = textContent.text.trim();

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('Parsing response:', responseText);

    const balanceData = JSON.parse(responseText);

    // Validate the response has all required fields
    if (!balanceData.token0Amount || !balanceData.token1Amount) {
      throw new Error('Missing required fields in Claude response');
    }

    console.log('✅ Successfully extracted balance data:', balanceData);

    return {
      token0Amount: balanceData.token0Amount,
      token1Amount: balanceData.token1Amount,
      token0Percentage: balanceData.token0Percentage,
      token1Percentage: balanceData.token1Percentage,
      extractedBy: 'claude-vision',
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error extracting balance from screenshot:', error);
    throw error;
  }
}

// Make available to other scripts
if (typeof window !== 'undefined') {
  window.AIVision = {
    extractBalanceFromScreenshot
  };
}
