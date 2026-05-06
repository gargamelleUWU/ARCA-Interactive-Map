const fs = require('fs');

// 1. Read the external data file
console.log("Reading external center list...");
const rawData = fs.readFileSync('centers-list.json', 'utf8');
const rawList = JSON.parse(rawData);

// 2. The empty GeoJSON skeleton
const geojson = {
    type: "FeatureCollection",
    features: []
};

// 3. The API Fetch Function
async function geocodeAndBuild() {
    console.log(`Starting Geocoding Process for ${rawList.length} locations...`);

    for (const center of rawList) {
        try {
            // Ping the free Nominatim API using the address property
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(center.address)}&format=json&limit=1`;

            const response = await fetch(url, {
                headers: { 'User-Agent': 'ARCA-Map-Project' }
            });
            const data = await response.json();

            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);

                // Build the GeoJSON feature
                const feature = {
                    type: "Feature",
                    properties: {
                        name: center.name,
                        type: center.type,
                        city: center.city,
                        fullAddress: center.address
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [lon, lat]
                    }
                };

                geojson.features.push(feature);
                console.log(`[SUCCESS] Mapped: ${center.name}`);
            } else {
                console.log(`[FAILED] Could not find coordinates for: ${center.address}`);
            }

            // Pause to respect API rate limits (1 request per 1.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.log(`[ERROR] Processing ${center.name}: ${error.message}`);
        }
    }

    // 4. Save the final compiled object to the final file
    fs.writeFileSync('centers.geojson', JSON.stringify(geojson, null, 2));
    console.log("\nProcess Complete! centers.geojson has been generated.");
}

// Run the function
geocodeAndBuild();