
const query = "Pabellón Municipal de Crevillente"; // Simulating the problematic input
const homeCity = "Torrevieja"; 

async function testLogic() {
  console.log("--- TESTING GEOCODING LOGIC ---");

  // 1. CLEANING LOGIC (Copied from MatchCard.tsx)
  let cleanQuery = query;
  cleanQuery = cleanQuery.split(/\s+vs\.?\s+/i)[0]; 
  if (cleanQuery.includes(' - ')) {
     cleanQuery = cleanQuery.split(' - ')[0]; 
  }
  cleanQuery = cleanQuery.replace(/\(.*?\)/g, '');
  cleanQuery = cleanQuery.replace(/Pabellón\s+Municipal\s+(de|del)?/i, ' ').trim();
  cleanQuery = cleanQuery.replace(/Pabellón|Complejo\s+Deportivo|Polideportivo|Ayuntamiento|Ciutat\s+Esportiva|Palau\s+d'Esports|Centre\s+Esportiu/gi, ' ').trim();
  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

  console.log(`Original: "${query}"`);
  console.log(`Cleaned:  "${cleanQuery}"`);

  // 2. SEARCH LOGIC
  const searchNominatim = async (q, region_filter) => {
     let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=es&addressdetails=1&limit=3`;
     if (region_filter) {
       url += `&state=${encodeURIComponent(region_filter)}`;
     }
     try {
       const res = await fetch(url);
       const data = await res.json();
       return data.length > 0 ? data[0] : null;
     } catch (e) {
       return null;
     }
  };

  const regions = ['Comunidad Valenciana', 'Región de Murcia'];
  let result = null;
  let strategy = "";

  // Strategy A
  for (const region of regions) {
    result = await searchNominatim(`${cleanQuery} Ayuntamiento`, region);
    if (result) { strategy = `A: ${cleanQuery} Ayuntamiento + ${region}`; break; }
  }

  // Strategy B
  if (!result) {
    for (const region of regions) {
      result = await searchNominatim(cleanQuery, region);
      if (result) { strategy = `B: ${cleanQuery} + ${region}`; break; }
    }
  }

  // Strategy C
  if (!result) {
      result = await searchNominatim(`${cleanQuery} Ayuntamiento`);
      if (result) strategy = "C: Global Ayuntamiento";
  }

  if (result) {
    console.log(`\nMATCH FOUND [${strategy}]`);
    console.log(`Display Name: ${result.display_name}`);
    console.log(`Lat/Lon: ${result.lat}, ${result.lon}`);
  } else {
    console.log("\nNO MATCH FOUND");
    return;
  }

  // 3. HOME LOGIC DEBUG
  console.log("\n--- DEBUGGING HOME ---");
  let homeRes = null;
  // Try "Ayuntamiento de Torrevieja" first
  homeRes = await searchNominatim(`Ayuntamiento de ${homeCity}`, 'Comunidad Valenciana');
  if (homeRes) console.log(`Home found A: ${homeRes.lat}, ${homeRes.lon}`);
  
  if (!homeRes) {
    homeRes = await searchNominatim(`${homeCity}`, 'Comunidad Valenciana');
    if (homeRes) console.log(`Home found B (City only): ${homeRes.lat}, ${homeRes.lon}`);
  }

  if(!homeRes) { console.log("Home still NOT found"); return; }

  // 4. OSRM LOGIC
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${homeRes.lon},${homeRes.lat};${result.lon},${result.lat}?overview=false`;
  console.log(`\nOSRM URL: ${osrmUrl}`);
  
  const osrmRes = await fetch(osrmUrl);
  const osrmData = await osrmRes.json();
  
  if (osrmData.code === 'Ok') {
    const distKm = osrmData.routes[0].distance / 1000;
    console.log(`DISTANCE: ${distKm.toFixed(2)} km`);
  } else {
    console.log("OSRM Error", osrmData);
  }
}

testLogic();
