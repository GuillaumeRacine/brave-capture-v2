// Quick test of Anthropic API to find working model
// Set your API key: export ANTHROPIC_API_KEY="your-key-here"
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY_HERE';

const models = [
  'claude-sonnet-4-5-20250929',  // Current: Claude Sonnet 4.5 (recommended replacement)
  'claude-haiku-4-5-20251001',   // Current: Claude Haiku 4.5
  'claude-3-7-sonnet-20250219',  // Legacy: Claude Sonnet 3.7
  'claude-3-5-haiku-20241022',   // Legacy: Claude Haiku 3.5
  'claude-3-haiku-20240307',     // Legacy: Claude Haiku 3
  // These are RETIRED and will fail:
  // 'claude-3-5-sonnet-20241022', // Retired Oct 2025
  // 'claude-3-5-sonnet-20240620', // Retired Oct 2025
];

async function testModel(model) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      console.log(`✅ ${model} - WORKS`);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ ${model} - ${error.error.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${model} - ${error.message}`);
    return false;
  }
}

async function findWorkingModel() {
  console.log('Testing Anthropic API models...\n');

  for (const model of models) {
    const works = await testModel(model);
    if (works) {
      console.log(`\n✅ USE THIS MODEL: ${model}`);
      return model;
    }
  }

  console.log('\n❌ No working model found');
}

findWorkingModel();
