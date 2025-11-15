// Quick test to find the exact expand arrow element
// Run this in browser console on Orca positions page

const rows = document.querySelectorAll('table tbody tr, [role="row"]');
const firstRow = rows[0];

console.log('🔍 Searching for expand arrow in first row...\n');

// Check all possible locations
const cells = firstRow.querySelectorAll('td, [role="cell"]');

console.log(`Found ${cells.length} cells`);

cells.forEach((cell, i) => {
  const buttons = cell.querySelectorAll('button');
  const svgs = cell.querySelectorAll('svg');

  if (buttons.length > 0 || svgs.length > 0) {
    console.log(`\nCell ${i}:`);
    console.log(`  Buttons: ${buttons.length}`);
    buttons.forEach((btn, j) => {
      console.log(`    Button ${j}:`, {
        className: btn.className,
        ariaLabel: btn.getAttribute('aria-label'),
        innerHTML: btn.innerHTML.substring(0, 100)
      });
    });

    console.log(`  SVGs: ${svgs.length}`);
    svgs.forEach((svg, j) => {
      console.log(`    SVG ${j}:`, {
        className: svg.className.baseVal || svg.className,
        parent: svg.parentElement.tagName,
        parentClass: svg.parentElement.className
      });
    });
  }
});

console.log('\n💡 Now manually click the arrow to expand the position.');
console.log('Then run: document.activeElement');
console.log('to see what element was clicked.');
