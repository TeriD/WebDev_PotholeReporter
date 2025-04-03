let countiesGeoJSON;
let counties = [];

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
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], 14);
        setTimeout(() => map.invalidateSize(), 100);

        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);

        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);
        reverseGeocode(lat, lng);
        mapModeLabel.textContent = "📍 Using Current Location";
      },
      () => {
        alert("Unable to access your location. You can still select from map.");
        document.getElementById("select-on-map").click();
      }
    );
  } else {
    alert("Geolocation not supported. Please select from map.");
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
  if (county) zoomToCounty(county);

  setTimeout(() => map.invalidateSize(), 100);
});

function reverseGeocode(lat, lng) {
  const spinner = document.getElementById("spinner");
  const locationField = document.getElementById("location");
  const resetFallback = document.getElementById("reset-location-fallback");
  const locationHint = document.getElementById("location-hint");

  spinner.classList.remove("hidden");

  const url = `https://kytcapi-proxy.onrender.com/routeinfo?xcoord=${lng}&ycoord=${lat}`;
  console.log("🔍 Fetching from:", url);

  fetch(url)
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
  console.log("✅ Full proxy response:", data);
  console.log("📦 Extracted properties:", data.Route_Info?.properties);

  const props = data.Route_Info?.properties;
  const route = props?.Route_Unique_Identifier;
  const mile = props?.Milepoint;

  if (route && mile != null) {
    locationField.value = `${route} @ ${mile.toFixed(3)}`;
    locationField.dispatchEvent(new Event("input", { bubbles: true }));
    locationField.setCustomValidity("");
    resetFallback.classList.add("hidden");
    locationHint.classList.add("hidden");
  } else {
    throw new Error("Missing Route_Unique_Identifier or Milepoint in proxy response");
  }
})
  .catch(error => {
    console.error("❌ Reverse geocode error:", error);
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

map.on("click", function (e) {
  const { lat, lng } = e.latlng;
  document.getElementById("latitude").value = lat.toFixed(6);
  document.getElementById("longitude").value = lng.toFixed(6);
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map);
  reverseGeocode(lat, lng);
});

// ⤵️ Unified location input handler
document.getElementById("location").addEventListener("input", () => {
  const locationHint = document.getElementById("location-hint");
  const locationField = document.getElementById("location");
  const locationError = document.getElementById("location-error");

  // Clear custom validity and hide messages
  locationField.setCustomValidity("");
  if (locationError) {
    locationError.textContent = "";
    locationError.style.display = "none";
  }

  if (locationHint) {
    locationHint.classList.add("hidden");
    locationHint.style.opacity = "1";
  }
});

// County search + dropdown
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

// Image preview
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

// Submit handler
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

  document.getElementById("potholeForm").reset();
});
