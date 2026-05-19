
// Setting bounds in an array
var bound = [
    [38.0, -145.0],     // Southwest corner
    [70.0, -39.0]       // Northeast corner
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
    maxClusterRadius: 25,        // Distance in pixels how far apart markers have to be to get clustered (bigger means fewer markers)

    // Adding color and dynamic size to the clusters
    iconCreateFunction: function (cluster) {
        var count = cluster.getChildCount();

        // 1. Define min and max of the clusters
        var min = 2;
        var max = 33;

        // 2. Define arca colors
        // Blue
        var r1 = 0, g1 = 68, b1 = 136;

        // Orange
        var r2 = 255, g2 = 102, b2 = 0;

        // 3. calculating lerp color based on cluster size
        var t = (count - min) / (max - min);

        // Clamp t between 0 and 1 to prevent math errors if a cluster exceeds 33
        if (t < 0) t = 0;
        if (t > 1) t = 1;

        // 4. Calculate the new RGB values (Lerp)
        var r = Math.round(r1 + (r2 - r1) * t);
        var g = Math.round(g1 + (g2 - g1) * t);
        var b = Math.round(b1 + (b2 - b1) * t);

        // 5. Build the custom HTML element for the cluster
        return L.divIcon({
            html: `<div style="background-color: rgb(${r}, ${g}, ${b});" class="arca-dynamic-cluster"><span>${count}</span></div>`,
            className: 'custom-cluster-wrapper', // Removes default leaflet cluster styles
            iconSize: L.point(40, 40)
        });
    }
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
                const props = feature.properties;

                // Function that turns arrays into HTML span tags
                const createTags = (arr, className) => {
                    if (!arr || !Array.isArray(arr)) return '';
                    return arr.map(item => `<span class="arca-tag ${className}">${item}</span>`).join('');
                };

                const typeTags = createTags(props.centreType, 'tag-type');
                const disciplineTags = createTags(props.discipline, 'tag-discipline');

                /* Creating array of contact info since info is not packaged in an array within the geoJSON*/
                const contactArray = [props.language, props.phone, props.email].filter(Boolean);

                const contactTags = createTags(contactArray, 'tag-contact')

                const hoverHTML = `
                    <div class="arca-hover-content">
                        <div class="hover-header">
                            <div class="hover-title">${props.name}</div>
                            <div class="hover-city">[ ${props.address ? props.address + ', ' : ''}${props.city}, ${props.province} ]</div>
                        </div>

                        ${disciplineTags ? `
                        <div class="tag-section">
                            <div class="tag-label">Disciplines</div>
                            <div class="hover-tags-container">
                                ${disciplineTags}
                            </div>
                        </div>
                        ` : ''}

                        ${typeTags ? `
                        <div class="tag-section">
                            <div class="tag-label">Centre Type</div>
                            <div class="hover-tags-container">
                                ${typeTags}
                            </div>
                        </div>
                        ` : ''}

                        ${contactTags ? `
                        <div class="tag-section">
                            <div class="tag-label">Contact</div>
                            <div class="hover-tags-container">
                                ${contactTags}
                            </div>
                        </div>
                        ` : ''}

                        <div class="hover-footer">
                            <div class="hover-association">${props.association}</div>
                        </div>
                    </div>
                `;

                // 1. Bind it as a Popup instead of a Tooltip to get the autoPan feature
                layer.bindPopup(hoverHTML, {
                    className: 'brutalist-tooltip', // Reusing your exact CSS!
                    autoPan: true,                  // Forces the map to move
                    autoPanPadding: [20, 20],       // Gives a 20px safety buffer from the edge
                    closeButton: false,             // Hides the default 'X' so it looks like a tooltip
                    offset: [0, -10]                // Slight offset so it sits nicely above the pin
                });

                // 2. Force the Popup to open when the user hovers over the pin
                layer.on('mouseover', function (e) {
                    this.openPopup();
                });

                layer.on('mouseout', function (e) {
                    this.closePopup();
                });

                // 3. Keep your existing click functionality so clicking the pin opens the URL
                layer.on('click', function () {
                    if (props.url) {
                        window.open(props.url, '_blank');
                    }
                });
            }
        });

        markers.addLayer(geojsonLayer);
        map.addLayer(markers);
    });