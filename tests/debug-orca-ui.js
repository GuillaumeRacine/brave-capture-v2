// Debug: Find what element to click for Orca position expansion
// Run this in browser console on orca.so positions page

console.log('🔍 Analyzing Orca position row structure...');

const rows = document.querySelectorAll('table tbody tr, [role="row"]');
console.log(`Found ${rows.length} rows\n`);

if (rows.length > 0) {
  const firstRow = rows[0];

  console.log('=== FIRST ROW ANALYSIS ===');
  console.log('Row HTML:', firstRow.outerHTML.substring(0, 500));
  console.log('\nRow text:', firstRow.textContent.substring(0, 150));

  // Find all clickable elements in the row
  console.log('\n=== CLICKABLE ELEMENTS IN ROW ===');
  const buttons = firstRow.querySelectorAll('button');
  const links = firstRow.querySelectorAll('a');
  const clickables = firstRow.querySelectorAll('[onclick], [role="button"]');

  console.log('Buttons:', buttons.length);
  buttons.forEach((btn, i) => {
    console.log(`  Button ${i}:`, btn.className, btn.textContent.trim());
  });

  console.log('Links:', links.length);
  links.forEach((link, i) => {
    console.log(`  Link ${i}:`, link.className, link.textContent.substring(0, 50));
  });

  console.log('Other clickables:', clickables.length);

  // Look for expand icons (common patterns)
  console.log('\n=== LOOKING FOR EXPAND ICONS ===');
  const svgs = firstRow.querySelectorAll('svg');
  console.log('SVGs found:', svgs.length);
  svgs.forEach((svg, i) => {
    console.log(`  SVG ${i}:`, svg.parentElement.tagName, svg.parentElement.className);
  });

  // Check all cells
  console.log('\n=== ALL CELLS ===');
  const cells = firstRow.querySelectorAll('td, [role="cell"]');
  cells.forEach((cell, i) => {
    console.log(`Cell ${i}: "${cell.textContent.trim().substring(0, 50)}"`);
    const cellButtons = cell.querySelectorAll('button');
    if (cellButtons.length > 0) {
      console.log(`  └─ Has ${cellButtons.length} button(s)`);
    }
  });

  console.log('\n=== TRY CLICKING DIFFERENT ELEMENTS ===');
  console.log('Try in console:');
  console.log('1. Click whole row: rows[0].click()');
  console.log('2. Click first button: rows[0].querySelector("button")?.click()');
  console.log('3. Click second cell: rows[0].querySelectorAll("td")[1]?.click()');
}

console.log('\n💡 After clicking manually, run this to see what opened:');
console.log('document.querySelectorAll(\'[role="dialog"], [class*="expand"], [class*="detail"]\')');
