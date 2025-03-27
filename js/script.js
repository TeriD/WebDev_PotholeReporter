let countiesGeoJSON;
let counties = [];

// Load counties GeoJSON with district numbers
fetch('data/ky_counties_districts.geojson')
  .then(res => res.json())
  .then(data => {
    countiesGeoJSON = data;
    counties = data.features.map(f => f.properties.NAME).sort();
  });

function zoomToCounty(countyName) {
  console.log("Attempting to zoom to county:", countyName);
  if (!countiesGeoJSON) return;

  const feature = countiesGeoJSON.features.find(
    f => f.properties.NAME.toLowerCase() === countyName.toLowerCase()
  );

  if (feature) {
    console.log("[zoomToCounty] Feature found:", feature);

    const geoLayer = L.geoJSON(feature);
    const bounds = geoLayer.getBounds();

    if (bounds.isValid()) {
      console.log("[zoomToCounty] Bounds:", bounds);

      // Delay zooming until map is visible and properly sized
      setTimeout(() => {
        map.invalidateSize(); // Fix layout sizing if previously hidden

        // Fit to county with padding
        map.fitBounds(bounds, { padding: [40, 40] });

        // Limit zoom level if it goes in too far
        map.once('zoomend', () => {
          if (map.getZoom() > 12) {
            console.log("[zoomToCounty] Zoom too close, adjusting to 12");
            map.setZoom(12);
          }
        });
      }, 250); // delay slightly to ensure container is visible
    } else {
      console.warn("Invalid bounds for county:", countyName);
    }

    document.getElementById("district").value = feature.properties.district || "Unknown";
  } else {
    console.warn("County not found in GeoJSON:", countyName);
  }
}

const kentuckyBounds = [[36.4971, -89.5715], [39.1475, -81.9645]];

const map = L.map('map', {
  maxBounds: kentuckyBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 6,
  maxZoom: 16,
  zoomSnap: 0.25
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

map.fitBounds(kentuckyBounds);

const mapContainer = document.getElementById("map-container");
const mapOptions = document.getElementById("map-options");
const mapModeLabel = document.getElementById("map-mode-label");

let marker;

document.getElementById("reset-location-fallback").addEventListener("click", () => {
  mapOptions.style.display = "block";
  mapContainer.style.display = "none";
  mapModeLabel.textContent = "";
  document.getElementById("reset-location-fallback").classList.add("hidden");
  document.getElementById("spinner").classList.add("hidden");
  if (marker) map.removeLayer(marker);
  document.getElementById("latitude").value = "";
  document.getElementById("longitude").value = "";
  const loc = document.getElementById("location");
  loc.value = "";
  loc.setAttribute("readonly", true);
  loc.setCustomValidity("");
});

document.getElementById("use-location").addEventListener("click", () => {
  mapOptions.style.display = "none";
  mapContainer.style.display = "block";
  map.dragging.disable();
  map.scrollWheelZoom.disable();
  map.doubleClickZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], 14);
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);
        reverseGeocode(lat, lng);
        mapModeLabel.textContent = "📍 Using Current Location";
      },
      function () {
        alert("Unable to access your location. You can still select from map.");
        document.getElementById("select-on-map").click();
      }
    );
  } else {
    alert("Geolocation is not supported by your browser. Please select from map.");
    document.getElementById("select-on-map").click();
  }
});

document.getElementById("select-on-map").addEventListener("click", () => {
  mapOptions.style.display = "none";
  mapContainer.style.display = "block";
  mapModeLabel.textContent = "🗺️ Selected from Map";

  map.dragging.enable();
  map.scrollWheelZoom.enable();
  map.doubleClickZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();

  const county = document.getElementById("county").value;
  if (county) {
    zoomToCounty(county);
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
});

function reverseGeocode(lat, lng) {
  const spinner = document.getElementById("spinner");
  const locationField = document.getElementById("location");
  const resetFallback = document.getElementById("reset-location-fallback");

  spinner.classList.remove("hidden");

  const baseUrl = 'https://kytc-api-v100-lts-qrntk7e3ra-uc.a.run.app/api/route/GetRouteInfoByCoordinates';
  const url = `https://corsproxy.io/?${encodeURIComponent(baseUrl + "?xcoord=" + lng + "&ycoord=" + lat + "&snap_distance=250&return_m=True&input_epsg=4326&return_multiple=False&return_format=geojson&request_id=100")}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Reverse geocode API response:", data);
      spinner.classList.add("hidden");

      const routeInfo = data.Route_Info;
      const route = routeInfo?.Route_Label;
      const mile = routeInfo?.Milepoint;

      if (route && mile !== null && mile !== undefined) {
        locationField.value = `${route} @ ${parseFloat(mile).toFixed(3)}`;
        locationField.dispatchEvent(new Event("input", { bubbles: true }));
        locationField.setCustomValidity("");
        resetFallback.classList.add("hidden");
      } else {
        alert("⚠️ Route could not be determined. Please enter the location manually.");
        locationField.value = "No location returned — please enter manually";
        locationField.removeAttribute("readonly");
        locationField.focus();
        locationField.setCustomValidity("Please describe the location.");
        resetFallback.classList.remove("hidden");
        // Show helpful tip
        const locationHint = document.getElementById("location-hint");
        locationHint.classList.remove("hidden");

        // Hide after 6 seconds
        setTimeout(() => {
        locationHint.style.opacity = "0";
        }, 6000);
      }
    })

    .catch(error => {
      console.error("Reverse geocode error:", error);
      spinner.classList.add("hidden");
      alert("⚠️ Reverse geocoding failed. Please enter location manually.");
      locationField.value = "Reverse geocode failed. Please enter manually.";
      locationField.removeAttribute("readonly");
      locationField.focus();
      locationField.setCustomValidity("Please describe the location.");
      resetFallback.classList.remove("hidden");
    });
}

map.on('click', function (e) {
  const { lat, lng } = e.latlng;
  document.getElementById('latitude').value = lat.toFixed(6);
  document.getElementById('longitude').value = lng.toFixed(6);
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map);
  reverseGeocode(lat, lng);
});

const countyInputField = document.getElementById("county");
const countyDropdown = document.getElementById("county-list");
let highlightedIndex = -1;

countyInputField.addEventListener("input", function () {
  const value = this.value.trim().toLowerCase();
  countyDropdown.innerHTML = "";
  highlightedIndex = -1;

  if (!value || counties.length === 0) {
    countyDropdown.classList.add("hidden");
    return;
  }

  const filtered = counties.filter(c => c.toLowerCase().startsWith(value));
  if (filtered.length === 0) {
    countyDropdown.classList.add("hidden");
    return;
  }

  filtered.forEach((county, index) => {
    const li = document.createElement("li");
    li.textContent = county;
    if (index === 0) {
      li.classList.add("highlighted");
      highlightedIndex = 0;
    }
    li.addEventListener("click", () => {
      countyInputField.value = county;
      countyDropdown.classList.add("hidden");
      zoomToCounty(county);
    });
    countyDropdown.appendChild(li);
  });

  countyDropdown.classList.remove("hidden");
});

countyInputField.addEventListener("keydown", function (e) {
  if ((e.key === "Tab" || e.key === "Enter") && !countyDropdown.classList.contains("hidden")) {
    const highlightedItem = countyDropdown.querySelector(".highlighted");
    if (highlightedItem) {
      e.preventDefault();
      countyInputField.value = highlightedItem.textContent;
      countyDropdown.classList.add("hidden");
      zoomToCounty(highlightedItem.textContent);
    }
  }
});

document.addEventListener("click", function (e) {
  if (!document.querySelector(".county-search").contains(e.target)) {
    countyDropdown.classList.add("hidden");
  }
});

const photoInput = document.getElementById("photo");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");

photoInput.addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage.src = e.target.result;
      previewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    previewImage.src = "";
    previewContainer.style.display = "none";
  }
});

document.getElementById("potholeForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const locationField = document.getElementById("location");
  const location = locationField.value;
  const locationError = document.getElementById("location-error");

  if (!locationField.checkValidity()) {
    if (locationError) {
      locationError.textContent = "Please provide a location.";
      locationError.style.display = "block";
    }
    locationField.focus();
    return;
  } else {
    if (locationError) {
      locationError.textContent = "";
      locationError.style.display = "none";
    }
  }

  const county = document.getElementById("county").value;
  const district = document.getElementById("district").value;
  const description = document.getElementById("description").value;
  const severity = document.querySelector("input[name='severity']:checked").value;

  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML = "";
  summaryDiv.style.display = "block";

  const heading = document.createElement("h3");
  heading.textContent = "Report Submitted";
  summaryDiv.appendChild(heading);

  const items = [
    ["Name", name],
    ["Email", email],
    ["Location", location],
    ["County", county],
    ["District", district],
    ["Severity", severity],
    ["Description", description || "N/A"]
  ];

  items.forEach(([label, value]) => {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(value));
    summaryDiv.appendChild(p);
  });

  // Clear custom validity when user edits the location field
  document.getElementById("location").addEventListener("input", function () {
    this.setCustomValidity("");
});
  document.getElementById("potholeForm").reset();

  // Hide location hint when user types
document.getElementById("location").addEventListener("input", () => {
  const hint = document.getElementById("location-hint");
  hint.classList.add("hidden");
  hint.style.opacity = "1"; // Reset for next time
});

});