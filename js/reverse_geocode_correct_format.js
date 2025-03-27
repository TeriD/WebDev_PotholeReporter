
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
        locationField.value = `${route} MP ${mile}`;
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
