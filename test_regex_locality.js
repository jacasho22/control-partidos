
const textsToTest = [
  "C/ DENIA, 2-4 · 03690 SAN VICENTE DEL RASPEIG",
  "AVDA. DEL CID, 15 · 46014 VALENCIA",
  "PABELLON MUNICIPAL - 03001 ALICANTE", 
  "CALLE FALSA 123 03330 CREVILLENTE", // Case with no dot
];

function extractLocality(address) {
  console.log(`\nTesting: "${address}"`);
  
  // Strategy 1: Look for 5 digits zip code
  const zipMatch = address.match(/\b(\d{5})\s+(.*)/);
  if (zipMatch) {
    console.log(`  MATCH: CP=${zipMatch[1]}, City="${zipMatch[2].trim()}"`);
    return zipMatch[2].trim();
  }
  
  // Strategy 2: Look for '·' separator explicitly as requested
  if (address.includes('·')) {
     const parts = address.split('·');
     const lastPart = parts[parts.length - 1].trim();
     console.log(`  MATCH (separator): "${lastPart}"`);
     
     // Clean zip if extracting this way
     const clean = lastPart.replace(/^\d{5}\s+/, '').trim();
     return clean;
  }
  
  console.log("  NO MATCH");
  return null;
}

textsToTest.forEach(extractLocality);
