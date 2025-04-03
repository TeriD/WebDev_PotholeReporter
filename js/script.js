
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
  if (!countiesGeoJSON) return;
  const feature = countiesGeoJSON.features.find(
    f => f.properties.NAME.toLowerCase() === countyName.toLowerCase()
  );
  if (feature) {
    const geoLayer = L.geoJSON(feature);
    const bounds = geoLayer.getBounds();
    if (bounds.isValid()) {
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [40, 40] });
        map.once('zoomend', () => {
          if (map.getZoom() > 12) map.setZoom(12);
        });
      }, 250);
    }
    document.getElementById("district").value = feature.properties.district || "Unknown";
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

let marker;
document.getElementById("reset-location-fallback").addEventListener("click", () => {
  document.getElementById("map-options").style.display = "block";
  document.getElementById("map-container").style.display = "none";
  document.getElementById("map-mode-label").textContent = "";
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

function reverseGeocode(lat, lng) {
  const spinner = document.getElementById("spinner");
  const locationField = document.getElementById("location");
  const resetFallback = document.getElementById("reset-location-fallback");
  const locationHint = document.getElementById("location-hint");

  spinner.classList.remove("hidden");
  const url = `https://kytcapi-proxy.onrender.com/routeinfo?xcoord=${lng}&ycoord=${lat}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      spinner.classList.add("hidden");
      const route = data.Route_Info?.properties?.Route_Label;
      const mile = data.Route_Info?.properties?.Milepoint;
      if (route && mile != null) {
        locationField.value = `${route} @ ${parseFloat(mile).toFixed(3)}`;
        locationField.dispatchEvent(new Event("input", { bubbles: true }));
        locationField.setCustomValidity("");
        resetFallback.classList.add("hidden");
      } else {
        alert("⚠️ Route could not be determined. Please enter manually.");
        locationField.value = "No location returned — please enter manually";
        locationField.removeAttribute("readonly");
        locationField.focus();
        locationField.setCustomValidity("Please describe the location.");
        resetFallback.classList.remove("hidden");
        locationHint.classList.remove("hidden");
        setTimeout(() => (locationHint.style.opacity = "0"), 6000);
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
      locationHint.classList.remove("hidden");
      setTimeout(() => (locationHint.style.opacity = "0"), 6000);
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

