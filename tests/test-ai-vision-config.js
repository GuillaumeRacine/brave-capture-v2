#!/usr/bin/env node

// Test if AI Vision is properly configured
console.log('🧪 Testing AI Vision Configuration...\n');

// Load the background config
try {
  // Read the file directly
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '..', 'background-config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Extract the config object
  const match = configContent.match(/const BACKGROUND_CONFIG = ({[\s\S]+?});/);
  if (!match) {
    throw new Error('Could not parse BACKGROUND_CONFIG from file');
  }

  const config = eval('(' + match[1] + ')');

  console.log('✅ Background config loaded successfully');
  console.log('\nConfiguration check:');
  console.log('  SUPABASE_URL:', config.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_ANON_KEY:', config.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('  ANTHROPIC_API_KEY:', config.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing');

  if (config.ANTHROPIC_API_KEY) {
    const keyPreview = config.ANTHROPIC_API_KEY.substring(0, 20) + '...';
    console.log('  API Key preview:', keyPreview);
    console.log('\n✅ AI Vision should be ENABLED');
  } else {
    console.log('\n❌ AI Vision is DISABLED - missing API key');
  }

} catch (error) {
  console.error('❌ Failed to load config:', error.message);
  console.error('\n💡 Run "npm run build:config" to generate config files');
  process.exit(1);
}
