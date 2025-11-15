// Find the chevron icon in position rows
// Run in browser console on Orca positions page

console.log('🔍 Looking for chevron icons in position rows...\n');

const rows = document.querySelectorAll('table tbody tr, [role="row"]');
console.log(`Found ${rows.length} rows\n`);

if (rows.length > 0) {
  const firstRow = rows[0];

  // Search for ALL elements in the row
  const allElements = firstRow.querySelectorAll('*');

  const chevrons = [];

  allElements.forEach(el => {
    const className = el.className?.toString() || '';
    const tagName = el.tagName.toLowerCase();

    // Check if it's a chevron
    if (className.toLowerCase().includes('chevron') ||
        (tagName === 'svg' && className.toLowerCase().includes('chevron'))) {
      chevrons.push({
        element: el,
        tag: tagName,
        class: className,
        parent: el.parentElement.tagName,
        parentClass: el.parentElement.className
      });
    }
  });

  console.log(`Found ${chevrons.length} chevron elements:`);
  chevrons.forEach((chev, i) => {
    console.log(`\nChevron ${i}:`, chev);
    console.log('  Element:', chev.element);
  });

  if (chevrons.length > 0) {
    console.log('\n✅ Try clicking the first chevron:');
    console.log('chevrons[0].element.click()');
    console.log('\nOr click its parent:');
    console.log('chevrons[0].element.parentElement.click()');

    // Make it available globally
    window.testChevrons = chevrons;
  } else {
    console.log('\n⚠️ No chevrons found. Let me check for SVG icons...');

    const svgs = firstRow.querySelectorAll('svg');
    console.log(`\nFound ${svgs.length} SVG icons in first row:`);
    svgs.forEach((svg, i) => {
      console.log(`\nSVG ${i}:`, {
        class: svg.className.baseVal || svg.className,
        parent: svg.parentElement.tagName,
        parentClass: svg.parentElement.className,
        element: svg
      });
    });

    if (svgs.length > 0) {
      window.testSvgs = Array.from(svgs);
      console.log('\n💡 Try clicking an SVG:');
      console.log('testSvgs[0].click() or testSvgs[0].parentElement.click()');
    }
  }
}
