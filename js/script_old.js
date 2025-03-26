
let countiesGeoJSON;
let counties = [];

const districtLookup = {
  "Ballard": "District 1", "Calloway": "District 1", "Carlisle": "District 1", "Crittenden": "District 1", "Fulton": "District 1",
  "Graves": "District 1", "Hickman": "District 1", "Livingston": "District 1", "Lyon": "District 1", "Marshall": "District 1",
  "McCracken": "District 1", "Trigg": "District 1", "Caldwell": "District 2", "Christian": "District 2", "Daviess": "District 2",
  "Hancock": "District 2", "Henderson": "District 2", "Hopkins": "District 2", "McLean": "District 2", "Muhlenberg": "District 2",
  "Ohio": "District 2", "Union": "District 2", "Webster": "District 2", "Allen": "District 3", "Barren": "District 3", "Butler": "District 3",
  "Edmonson": "District 3", "Logan": "District 3", "Metcalfe": "District 3", "Monroe": "District 3", "Simpson": "District 3", "Todd": "District 3",
  "Warren": "District 3", "Breckinridge": "District 4", "Grayson": "District 4", "Green": "District 4", "Hardin": "District 4", "Hart": "District 4",
  "LaRue": "District 4", "Marion": "District 4", "Meade": "District 4", "Nelson": "District 4", "Taylor": "District 4", "Washington": "District 4",
  "Bullitt": "District 5", "Franklin": "District 5", "Henry": "District 5", "Jefferson": "District 5", "Oldham": "District 5", "Shelby": "District 5",
  "Spencer": "District 5", "Trimble": "District 5", "Boone": "District 6", "Bracken": "District 6", "Campbell": "District 6", "Carroll": "District 6",
  "Gallatin": "District 6", "Grant": "District 6", "Harrison": "District 6", "Kenton": "District 6", "Owen": "District 6", "Pendleton": "District 6",
  "Robertson": "District 6", "Anderson": "District 7", "Bourbon": "District 7", "Boyle": "District 7", "Clark": "District 7", "Fayette": "District 7",
  "Garrard": "District 7", "Jessamine": "District 7", "Madison": "District 7", "Mercer": "District 7", "Montgomery": "District 7", "Scott": "District 7",
  "Woodford": "District 7", "Adair": "District 8", "Casey": "District 8", "Clinton": "District 8", "Cumberland": "District 8", "Lincoln": "District 8",
  "McCreary": "District 8", "Pulaski": "District 8", "Rockcastle": "District 8", "Russell": "District 8", "Wayne": "District 8", "Bath": "District 9",
  "Boyd": "District 9", "Carter": "District 9", "Elliott": "District 9", "Fleming": "District 9", "Greenup": "District 9", "Lewis": "District 9",
  "Mason": "District 9", "Nicholas": "District 9", "Rowan": "District 9", "Breathitt": "District 10", "Estill": "District 10", "Lee": "District 10",
  "Magoffin": "District 10", "Menifee": "District 10", "Morgan": "District 10", "Owsley": "District 10", "Perry": "District 10", "Powell": "District 10",
  "Wolfe": "District 10", "Bell": "District 11", "Clay": "District 11", "Harlan": "District 11", "Jackson": "District 11", "Knox": "District 11",
  "Laurel": "District 11", "Leslie": "District 11", "Whitley": "District 11", "Floyd": "District 12", "Johnson": "District 12", "Knott": "District 12",
  "Lawrence": "District 12", "Letcher": "District 12", "Martin": "District 12", "Pike": "District 12"
};

fetch('data/ky_counties_clean.geojson')
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

function reverseGeocode(lat, lng) {
  const baseUrl = 'https://kytc-api-v100-lts-qrntk7e3ra-uc.a.run.app/api/route/GetRouteInfoByCoordinates';
  const url = `${baseUrl}?xcoord=${lng}&ycoord=${lat}&snap_distance=200`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.Route_Info) {
        const route = data.Route_Info.Route_Name || '';
        const mile = data.Route_Info.Milepoint?.toFixed(2) || '';
        document.getElementById("location").value = `${route} MP ${mile}`;
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
  if (!value) {
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
      document.getElementById("district").value = districtLookup[county] || "";
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
  const location = document.getElementById("location").value;
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
