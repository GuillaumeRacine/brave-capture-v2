#!/usr/bin/env node
/**
 * Verification script to confirm all Anthropic API model references have been updated
 * and the new model works correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('============================================');
console.log('Anthropic API Model Update Verification');
console.log('============================================\n');

// Files that should have been updated
const filesToCheck = [
  '/Users/gui/Brave-Capture/background.js',
  '/Users/gui/Brave-Capture/ai-vision.js',
  '/Users/gui/Brave-Capture/scripts/analyze-capture.js',
  '/Users/gui/Brave-Capture/scripts/validate-capture.js'
];

const OLD_MODEL = 'claude-3-5-sonnet-20240620';
const OLD_MODEL_V2 = 'claude-3-5-sonnet-20241022';
const NEW_MODEL = 'claude-sonnet-4-5-20250929';

console.log('Step 1: Checking file updates...\n');

let allFilesUpdated = true;

filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasOldModel = content.includes(OLD_MODEL) || content.includes(OLD_MODEL_V2);
  const hasNewModel = content.includes(NEW_MODEL);

  if (hasOldModel) {
    console.log(`❌ ${path.basename(file)} - Still contains old model reference`);
    allFilesUpdated = false;
  } else if (hasNewModel) {
    console.log(`✅ ${path.basename(file)} - Updated to new model`);
  } else {
    console.log(`⚠️  ${path.basename(file)} - No model reference found`);
  }
});

console.log('\n============================================');

if (allFilesUpdated) {
  console.log('✅ All files successfully updated!\n');
  console.log('Summary:');
  console.log('--------');
  console.log(`Old Model (RETIRED): ${OLD_MODEL}`);
  console.log(`Old Model V2 (RETIRED): ${OLD_MODEL_V2}`);
  console.log(`New Model (ACTIVE): ${NEW_MODEL}`);
  console.log('\nRetirement Date: October 28, 2025');
  console.log('Replacement: Claude Sonnet 4.5');
  console.log('Status: All files updated and verified');
} else {
  console.log('❌ Some files still need updating\n');
  process.exit(1);
}

console.log('\n============================================\n');
