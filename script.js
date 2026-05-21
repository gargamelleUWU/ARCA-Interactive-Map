//
// Map Initializing and minor elements
//

// Setting bounds in an array
var bound = [
    [38.0, -145.0],     // Southwest corner
    [70.0, -39.0]       // Northeast corner
]
var defaultMapView = [[52, -90], 5];

// Initializing the map
var map = L.map('map', {
    maxZoom: 20,    //The closest users can zoom in
    minZoom: 5,     //The furthest users can zoom out
    maxBounds: bound, //Restrict the map to the specified bounds
    maxBoundsViscosity: 1.0, //Prevent users from panning outside the bounds
    zoomSnap: 0.25, //Allow zooming in quarter increments for smoother zooming
    zoomDelta: 0.25, //Allow zooming in quarter increments for smoother zooming
    wheelPxPerZoomLevel: 100 //Make zooming with the mouse wheel smoother
}).setView([52, -90], 5);

//Creating marker clusters
var markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,    // User can click clusters that stay together to force the markers to fan out
    showCoverageOnHover: false, // Disables default polygon shape that appears when overhing a cluster
    zoomToBoundsOnClick: true,  // Clicking a Cluster automatically zooms the map in to perfectly fit all the markers
    maxClusterRadius: 35,        // Distance in pixels how far apart markers have to be to get clustered (bigger means fewer markers)

    // Adding dynamic color to the marker clusters
    iconCreateFunction: function (cluster) {
        var count = cluster.getChildCount();
        // Defining min and max size of the clusters based on map boundaries
        var min = 2;
        var max = 37;
        // Defining ARCA colors
        // Blue
        var r1 = 0, g1 = 68, b1 = 136;
        // Orange
        var r2 = 255, g2 = 102, b2 = 0;
        // Calculating lerp color based on cluster size
        var t = (count - min) / (max - min);
        // Clamp t between 0 and 1 to prevent math errors if a cluster exceeds 33
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        // Calculating the new RGB values (Lerp)
        var r = Math.round(r1 + (r2 - r1) * t);
        var g = Math.round(g1 + (g2 - g1) * t);
        var b = Math.round(b1 + (b2 - b1) * t);
        // Building the custom HTML element for the cluster
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
// -------------------------------------------------------------

//
// HTML popup logic
//

// Global timer for hover bridge
let popupTimeout;
// Listen for ANY popup opening on the map
map.on('popupopen', function (e) {
    const popupNode = e.popup.getElement();

    // Handles the logic when the mouse first hovers the icon or popup
    popupNode.onmouseenter = function () {
        clearTimeout(popupTimeout);
    };

    // Handles logic when the mouse stops hovering the icon or popup
    popupNode.onmouseleave = function () {
        popupTimeout = setTimeout(() => {
            map.closePopup();
        }, 300);
    };
});
// -------------------------------------------------------------
//
// Cluster Hover Tooltips
//

markers.on('clustermouseover', function (e) {
    // Clear any pending timeouts to prevent the popup from closing prematurely
    clearTimeout(popupTimeout);

    const cluster = e.layer;
    const childMarkers = cluster.getAllChildMarkers();

    // Loop through all markers inside this cluster and extract their names
    const namesHTML = childMarkers.map(marker => {
        const name = marker.feature.properties.name || "Unknown Centre";

        // Grab Leaflet's unique internal ID for this specific marker pin
        const layerId = marker._leaflet_id;

        // Inject the layer ID directly into the HTML element
        return `<div class="cluster-hover-item click-to-marker" style="cursor: pointer;" data-layer-id="${layerId}">${name}</div>`;
    }).join('');

    // Wrap the list in a clean structure matching your brutalist style
    const clusterPopupHTML = `
        <div class="arca-hover-content cluster-hover-container">
            <div class="tag-label" style="margin-bottom: 8px;">Centres in this area (${childMarkers.length})</div>
            <div class="cluster-names-list">
                ${namesHTML}
            </div>
        </div>
    `;

    // Bind and instantly open the popup over the cluster
    cluster.bindPopup(clusterPopupHTML, {
        className: 'brutalist-tooltip',
        autoPan: false, // Don't snap the map around while hovering clusters
        closeButton: false
    }).openPopup();
});

markers.on('clustermouseout', function (e) {
    const cluster = e.layer;

    // Give the user a tiny 300ms window to bridge over or leave safely
    popupTimeout = setTimeout(() => {
        map.closePopup();
    }, 300);
});

// Unified Global Click Listener for all dynamic map elements
document.addEventListener('click', function (event) {

    // FEATURE 1: Clickable Tags (Disciplines, Types, and City)
    if (event.target.classList.contains('clickable-tag')) {
        // Use the dataset attributes you built instead of innerText for perfect accuracy
        const tagValue = event.target.dataset.value;
        const filterType = event.target.dataset.filterType;

        if (filterType === 'tag-discipline' || filterType === 'tag-type') {
            // Find the checkbox exactly matching the tag's value
            const checkbox = document.querySelector(`input[type="checkbox"][value="${tagValue}"]`);

            if (checkbox) {
                checkbox.checked = !checkbox.checked; // Toggle the checkbox
                applyFilters();                       // Update map
            }
        } else if (filterType === 'city') {
            // Bonus: Auto-fill the city search bar!
            const cityInput = document.getElementById('searchCity');
            if (cityInput) {
                cityInput.value = tagValue;
                applyFilters();
            }
        }
    }

    // FEATURE 2: Clickable Cluster Names
    if (event.target.classList.contains('click-to-marker')) {
        // Pull the Leaflet ID from the div we just clicked
        const layerId = parseInt(event.target.dataset.layerId);

        // Retrieve the exact marker object from your cluster group
        const targetMarker = markers.getLayer(layerId);

        if (targetMarker) {
            // Close the cluster popup instantly so it doesn't stay on screen during the flight
            map.closePopup();

            // MarkerCluster's built-in function to handle zooming and spiderfying safely
            markers.zoomToShowLayer(targetMarker, function () {

                // Clear any lingering hover timers just to be safe
                clearTimeout(popupTimeout);

                // Open the popup on the specific marker once the animation is 100% finished
                targetMarker.openPopup();

            });
        }
    }
});

// -------------------------------------------------------------

//
// Fetching
//

let allFeatures = [];

// Fetch and load the GeoJSON data
fetch('allcenters.geojson')
    .then(response => response.json())
    .then(data => {
        allFeatures = data.features; // Saves the raw array of features globally
        renderMap(allFeatures);     // Rendering initial map with all data fetched
    });
// -------------------------------------------------------------

//
// Render
//

// Function to draw markers on the map based on the provided array
function renderMap(featuresToRender) {
    // Clearing out any existing markers from the cluster group
    markers.clearLayers();

    // Rebuilding GeoJSON object from the filtered array
    const geojsonData = {
        type: "FeatureCollection",
        features: featuresToRender
    };

    // Creating the Leaflet layer
    var geojsonLayer = L.geoJSON(geojsonData, {
        onEachFeature: function (feature, layer) {
            const props = feature.properties;

            // Function that turns arrays into HTML span tags
            const createTags = (arr, className) => {
                if (!arr || !Array.isArray(arr)) return '';

                // Only add 'clickable-tag' if the class is NOT 'tag-contact'
                const clickClass = className === 'tag-contact' ? '' : 'clickable-tag';

                return arr.map(item => `
        <span class="arca-tag ${clickClass} ${className}" 
              data-filter-type="${className}" 
              data-value="${item}">
            ${item}
        </span>`).join('');
            };

            /* Cusing createTags on the arrays holding the information */
            const typeTags = createTags(props.centreType, 'tag-type');
            const disciplineTags = createTags(props.discipline, 'tag-discipline');

            /* Creating array of contact info since info is not packaged in an array within the geoJSON*/
            const contactArray = [props.language, props.phone, props.email].filter(Boolean);
            const contactTags = createTags(contactArray, 'tag-contact');

            /* Building the HTML popup element*/
            const hoverHTML = `
                <div class="arca-hover-content">
                    <div class="hover-header">
                        <div class="hover-title">${props.name}</div>
                        <div class="hover-city">[ ${props.address ? props.address + ', ' : ''}
                            <span class="clickable-tag" data-filter-type="city" data-value="${props.city}" style="cursor: pointer; text-decoration: underline;">${props.city}</span>, ${props.province} ]
                        </div>
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

            // Binding it as a Popup instead of a Tooltip to get the autoPan feature
            layer.bindPopup(hoverHTML, {
                className: 'brutalist-tooltip',
                autoPan: true,                  // Autopan moves the map if the popup appears outside the window region
                autoPanPadding: [20, 20],       // Gives a 20px safety buffer from the edge
                closeButton: false,             // Hides the default 'X' so it looks like a tooltip
            });

            // Forcing the Popup to open when the user hovers over the pin
            layer.on('mouseover', function (e) {
                clearTimeout(popupTimeout);
                this.openPopup();
            });

            layer.on('mouseout', function (e) {
                // Save a reference to the specific pin we just left
                const currentLayer = this;

                // Start a 300ms countdown to close the popup
                popupTimeout = setTimeout(function () {
                    currentLayer.closePopup();
                }, 300);
            });

            // Clicking the pin opens the URL
            layer.on('click', function () {
                if (props.url) {
                    window.open(props.url, '_blank');
                }
            });
        }
    });

    // Add the newly built layer to the map
    markers.addLayer(geojsonLayer);
    map.addLayer(markers);
}

//
// Sidebar Collapse Logic
//
document.getElementById('collapseBtn').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar-wrapper');
    const btn = document.getElementById('collapseBtn');

    // Toggle the collapsed class
    sidebar.classList.toggle('collapsed');

    // Swap the arrow icon direction
    if (sidebar.classList.contains('collapsed')) {
        btn.innerHTML = '▶';
    } else {
        btn.innerHTML = '◀';
    }

    // Tell Leaflet the container size has changed. 
    // We wait 300ms for the CSS sliding animation to completely finish first.
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
});
// -------------------------------------------------------------

//
// Filter
//

// Filter reset button
document.getElementById('resetFiltersBtn').addEventListener('click', function () {
    // Empties the text search bars
    document.getElementById('searchName').value = '';
    document.getElementById('searchCity').value = '';

    // Unchecks all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Re-run the filter logic to refresh the map with all points
    applyFilters();
});

// Function to read the inputs and filter the map
function applyFilters() {
    // Get the current values from the text search bars
    const searchNameVal = document.getElementById('searchName').value.toLowerCase();
    const searchCityVal = document.getElementById('searchCity').value.toLowerCase();

    // Gather all currently checked checkbox values into arrays
    const activeDisciplines = Array.from(document.querySelectorAll('.filter-discipline:checked')).map(cb => cb.value);
    const activeTypes = Array.from(document.querySelectorAll('.filter-type:checked')).map(cb => cb.value);

    // Filter the list
    const filteredFeatures = allFeatures.filter(feature => {
        const props = feature.properties;

        // Text Search (Checks if name/city includes the typed letters)
        const matchesName = !searchNameVal || (props.name && props.name.toLowerCase().includes(searchNameVal));
        const matchesCity = !searchCityVal || (props.city && props.city.toLowerCase().includes(searchCityVal));

        // Safe Checkbox Matcher
        // Handles the property safely whether the GeoJSON has it as an Array OR a single String
        const matchesSelected = (propValue, activeFilters) => {
            if (activeFilters.length === 0) return true; // Show all if nothing is checked
            if (!propValue) return false;                // Hide if boxes are checked but centre lacks data

            // Normalizer: forces lowercase and strips outer whitespace
            const clean = (str) => String(str).toLowerCase().trim();
            const cleanedFilters = activeFilters.map(clean);

            if (Array.isArray(propValue)) {
                // Clean the centre's properties so they match our clean filters
                const cleanedProps = propValue.map(clean);

                // AND Logic: EVERY active filter must exist in the centre's array
                return cleanedFilters.every(filter => cleanedProps.includes(filter));
            } else {
                // Fallback in case a centre has a single string instead of an array
                const cleanedProp = clean(propValue);
                return cleanedFilters.every(filter => cleanedProp.includes(filter));
            }
        };

        const matchesDiscipline = matchesSelected(props.discipline, activeDisciplines);
        const matchesType = matchesSelected(props.centreType, activeTypes);

        // The point only stays on the map if it passes ALL active filters
        return matchesName && matchesCity && matchesDiscipline && matchesType;
    });

    // Re-rendering the map with just the filtered data
    renderMap(filteredFeatures);
}

// Attach listeners so the map updates instantly when a user types
document.getElementById('searchName').addEventListener('input', applyFilters);
document.getElementById('searchCity').addEventListener('input', applyFilters);

// Attach a listener to every checkbox so the map updates on click
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});
// -------------------------------------------------------------

//
// Reset Map Button
//

// Creating a custom Leaflet control specifically for the Reset button
var resetMapControl = L.Control.extend({
    options: {
        position: 'topleft' // Places it directly under the zoom controls
    },

    onAdd: function (map) {
        // Create a container div for the button
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-reset-control');

        // Create the actual button element
        var button = L.DomUtil.create('button', 'arca-btn', container);
        button.id = 'resetMapBtn';
        button.innerHTML = 'R';
        button.type = 'button';

        // Stop map dragging/clicking events from bleeding through the button
        L.DomEvent.disableClickPropagation(container);

        // Attach your map reset functionality right here
        L.DomEvent.on(button, 'click', function (e) {
            // Replace these coordinates with your map's default starting view
            map.setView([52.0, -90.0], 5);

            // Optional: If you need to clear text filters when resetting the map,
            // you can trigger a custom function here or call your existing logic.
        });

        return container;
    }
});

// Adding the custom control to your map instance
map.addControl(new resetMapControl());