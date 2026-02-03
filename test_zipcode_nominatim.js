
const zipQuery = "03690 SAN VICENTE DEL RASPEIG";
const poisonedQuery = "03690 SAN VICENTE DEL RASPEIG Ayuntamiento";

async function testNominatim() {
  console.log("--- TESTING NOMINATIM ZIPCODE BEHAVIOR ---");

  const search = async (q) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=es&addressdetails=1&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.length > 0 ? data[0] : null; 
    } catch(e) { return null; }
  };

  console.log(`\nQuery 1 (Pure Zip): "${zipQuery}"`);
  const res1 = await search(zipQuery);
  if (res1) console.log(`  -> FOUND: ${res1.display_name} (${res1.lat}, ${res1.lon})`);
  else console.log("  -> NOT FOUND");

  console.log(`\nQuery 2 (Poisoned): "${poisonedQuery}"`);
  const res2 = await search(poisonedQuery);
  if (res2) console.log(`  -> FOUND: ${res2.display_name} (${res2.lat}, ${res2.lon})`);
  else console.log("  -> NOT FOUND");
}

testNominatim();
