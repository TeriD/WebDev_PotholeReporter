
// --------------------------
// New: Handle user map choice
// --------------------------
const mapContainer = document.getElementById("map-container");
const mapOptions = document.getElementById("map-options");
const mapModeLabel = document.getElementById("map-mode-label");

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
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);
        reverseGeocode(lat, lng);
        mapModeLabel.textContent = "📍 Using Current Location";
      },
      function (error) {
        alert("Unable to access your location. Please use map selection.");
        mapOptions.style.display = "block";
        mapContainer.style.display = "none";
      }
    );
  } else {
    alert("Geolocation not supported.");
  }
});

document.getElementById("select-on-map").addEventListener("click", () => {
  mapOptions.style.display = "none";
  mapContainer.style.display = "block";
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  map.doubleClickZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
  mapModeLabel.textContent = "🗺️ Selected from Map";
});
