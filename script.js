// Initializing the map
//Starting location and zoom level.
// Test comment
var bound = [
    [38.0, -150.0],  //Southwest corner
    [67.0, -40.0]   //Northeast corner
]

var map = L.map('map', {
    maxZoom: 20,    //The closest users can zoom in
    minZoom: 5,     //The furthest users can zoom out
    maxBounds: bound, //Restrict the map to the specified bounds
    maxBoundsViscosity: 1.0, //Prevent users from panning outside the bounds
    zoomSnap: 0.25, //Allow zooming in quarter increments for smoother zooming
    zoomDelta: 0.25, //Allow zooming in quarter increments for smoother zooming
    wheelPxPerZoomLevel: 100 //Make zooming with the mouse wheel smoother
}).setView([55, -95], 5);

// Add a Dark Mode tile layer (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Fetch and load the GeoJSON data
fetch('centers.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            onEachFeature: function (feature, layer) {
                // 1. Build the HTML that will go inside the hover box
                const hoverHTML = `
                    <div class="arca-hover-content">
                        <div class="hover-title">${feature.properties.name}</div>
                        <div class="hover-details">${feature.properties.type}</div>
                        <div class="hover-city">[ ${feature.properties.city} ]</div>
                    </div>
                `;

                // 2. Bind the Tooltip to the marker
                layer.bindTooltip(hoverHTML, {
                    direction: 'top',      // Appears above the cursor
                    sticky: true,          // Makes the box follow the mouse movement smoothly
                    className: 'brutalist-tooltip', // A custom class so we can style it in CSS
                    opacity: 1             // Forces it to be solid, not semi-transparent
                });
            }
        }).addTo(map);
    });