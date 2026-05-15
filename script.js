
// Setting bounds in an array
var bound = [
    [38.0, -145.0],     // Southwest corner
    [67.0, -45.0]       // Northeast corner
]

// Initializing the map
var map = L.map('map', {
    maxZoom: 20,    //The closest users can zoom in
    minZoom: 5,     //The furthest users can zoom out
    maxBounds: bound, //Restrict the map to the specified bounds
    maxBoundsViscosity: 1.0, //Prevent users from panning outside the bounds
    zoomSnap: 0.25, //Allow zooming in quarter increments for smoother zooming
    zoomDelta: 0.25, //Allow zooming in quarter increments for smoother zooming
    wheelPxPerZoomLevel: 100 //Make zooming with the mouse wheel smoother
}).setView([55, -95], 5);

//Creating marker clusters
var markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,    // User can click clusters that stay together to force the markers to fan out
    showCoverageOnHover: false, // Disables default polygon shape that appears when overhing a cluster
    zoomToBoundsOnClick: true,  // Clicking a Cluster automatically zooms the map in to perfectly fit all the markers
    maxClusterRadius: 25        // Distance in pixels how far apart markers have to be to get clustered (bigger means fewer markers)
});

// Add a Dark Mode tile layer (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Fetch and load the GeoJSON data
fetch('allcenters.geojson')
    .then(response => response.json())
    .then(data => {

        var geojsonLayer = L.geoJSON(data, {
            onEachFeature: function (feature, layer) {
                const hoverHTML = `
                    <div class="arca-hover-content">
                        <div class="hover-title">${feature.properties.name}</div>
                        <div class="hover-centreType">${feature.properties.centreType}</div>
                        <div class="hover-discipline">${feature.properties.discipline}</div>
                        <div class="hover-city">[ ${feature.properties.city} ]</div>
                        <div class="hover-association">[ ${feature.properties.association} ]</div>
                    </div>
                `;

                layer.bindTooltip(hoverHTML, {
                    direction: 'top',
                    sticky: true,
                    className: 'brutalist-tooltip',
                    opacity: 1
                });
            }
        });

        markers.addLayer(geojsonLayer);
        map.addLayer(markers);
    });