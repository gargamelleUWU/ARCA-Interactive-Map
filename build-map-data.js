const fs = require('fs');
const csv = require('csv-parser');

const rawList = [];
const geojson = {
    type: "FeatureCollection",
    features: []
};

// 1. Read the CSV file and load it into an array
console.log("Reading centers.csv...");
fs.createReadStream('centers.csv')
    .pipe(csv())
    .on('data', (row) => {
        rawList.push(row);
    })
    .on('end', async () => {
        console.log(`Loaded ${rawList.length} centers. Starting Geocoding API...\n`);

        // 2. Loop through the array sequentially to respect rate limits
        for (const center of rawList) {
            try {
                // Combine columns for a highly accurate API search query
                // E.g., "1515 St Catherine St W, Montreal, QC"
                const cleanAddress = center.address.split(',')[0].trim();
                const searchQuery = `${cleanAddress}, ${center.city}, ${center.province}, ${center.postal_code}`;
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

                const response = await fetch(url, {
                    headers: { 'User-Agent': 'ARCA-Map-Project' }
                });
                const data = await response.json();

                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);

                    // 3. Build the GeoJSON feature with all spreadsheet data
                    const feature = {
                        type: "Feature",
                        properties: {
                            name: center.name,
                            address: center.address,
                            city: center.city,
                            province: center.province,
                            postalCode: center.postal_code, // Must match your CSV header
                            phone: center.phone           // Must match your CSV header
                        },
                        geometry: {
                            type: "Point",
                            coordinates: [lon, lat]
                        }
                    };

                    geojson.features.push(feature);
                    console.log(`[SUCCESS] Mapped: ${center.name}`);
                } else {
                    console.log(`[FAILED] Coordinates not found for: ${searchQuery}`);
                }

                // CRITICAL: Pause for 1.5 seconds between API requests
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error) {
                console.log(`[ERROR] Processing ${center.name}: ${error.message}`);
            }
        }

        // 4. Save the compiled GeoJSON to your folder
        fs.writeFileSync('centers.geojson', JSON.stringify(geojson, null, 2));
        console.log("\nProcess Complete! centers.geojson is ready for Leaflet.");
    });