// Test script to understand Orca's position expansion mechanism
// Run this in the browser console on orca.so positions page

(async function testExpansion() {
  console.log('🧪 Testing Orca position expansion...');

  // Find all position rows
  const rows = document.querySelectorAll('table tbody tr, [role="row"]');
  console.log(`Found ${rows.length} rows`);

  if (rows.length === 0) {
    console.error('No rows found. Try these selectors:');
    console.log('- tr elements:', document.querySelectorAll('tr').length);
    console.log('- role="row":', document.querySelectorAll('[role="row"]').length);
    return;
  }

  // Try to expand the first position
  const firstRow = rows[0];
  console.log('First row text:', firstRow.textContent.substring(0, 100));
  console.log('First row HTML tag:', firstRow.tagName);
  console.log('First row classes:', firstRow.className);

  // Try clicking it
  console.log('Clicking first row...');
  firstRow.click();

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check for details panel
  console.log('\nLooking for details panel...');

  const selectors = [
    '[role="dialog"]',
    '.details-panel',
    '.position-details',
    '[class*="modal"]',
    '[class*="dialog"]',
    '[class*="drawer"]',
    '[class*="detail"]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found with selector "${selector}":`, elements.length);
      console.log('   First element:', elements[0]);
      console.log('   Text content (first 200 chars):', elements[0].textContent.substring(0, 200));
    }
  }

  // Check if anything new appeared after click
  console.log('\nAll visible dialogs/modals:');
  const allDivs = document.querySelectorAll('div');
  allDivs.forEach((div, i) => {
    const text = div.textContent || '';
    if (text.includes('cbBTC') && text.includes('%') && div.offsetHeight > 0) {
      console.log(`Potential panel ${i}:`, div.className);
      console.log('Text:', text.substring(0, 300));
    }
  });

})();
