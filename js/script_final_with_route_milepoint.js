
let countiesGeoJSON;
let counties = [];

fetch('data/kycounties_districts.geojson')
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
    const layer = L.geoJSON(feature);
    map.fitBounds(layer.getBounds());
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

// Final reverseGeocode logic with correct API format and route @ milepoint
function reverseGeocode(lat, lng) {
  const baseUrl = 'https://kytc-api-v100-lts-qrntk7e3ra-uc.a.run.app/api/route/GetRouteInfoByCoordinates';
  const url = `${baseUrl}?xcoord=${lng}&ycoord=${lat}&snap_distance=200&return_m=True&input_epsg=4326&return_multiple=False&return_format=geojson&request_id=100`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Reverse geocode response:", data);
      if (data.Route_Info) {
        const route = data.Route_Info.Route_Name || '';
        const mile = data.Route_Info.Milepoint?.toFixed(2) || '';
        const locationField = document.getElementById("location");
        locationField.value = `${route} @ ${mile}`;
        locationField.dispatchEvent(new Event("input", { bubbles: true }));
        locationField.setCustomValidity("");
      } else if (data.Info) {
        console.warn("API Info:", data.Info);
      }
    })
    .catch(error => {
      console.error("Reverse geocode error:", error);
    });
}

let marker;
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

countyInputField.addEventListener("input", function () {
  const value = this.value.trim().toLowerCase();
  countyDropdown.innerHTML = "";
  if (!value || counties.length === 0) {
    countyDropdown.classList.add("hidden");
    return;
  }
  const filtered = counties.filter(c => c.toLowerCase().startsWith(value));
  if (filtered.length === 0) {
    countyDropdown.classList.add("hidden");
    return;
  }
  filtered.forEach(county => {
    const li = document.createElement("li");
    li.textContent = county;
    li.addEventListener("click", () => {
      countyInputField.value = county;
      countyDropdown.classList.add("hidden");
      zoomToCounty(county);
    });
    countyDropdown.appendChild(li);
  });
  countyDropdown.classList.remove("hidden");
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
    locationError.textContent = "Please provide a location.";
    locationError.style.display = "block";
    locationField.focus();
    return;
  } else {
    locationError.textContent = "";
    locationError.style.display = "none";
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
