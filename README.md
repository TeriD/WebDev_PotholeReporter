
# Pothole Reporting Form

This is an interactive, responsive HTML and JavaScript-based form for reporting potholes. It supports location selection via map, dynamic county filtering, reverse geocoding, and user-friendly field validation. The form is tailored for public or internal reporting and is extensible for integration with backend databases and dashboards.

## Features

- Clean, responsive design using Flexbox
- JavaScript-powered form validation with inline error messaging
- County selector with dynamic filtering
- Map-based location picker using Leaflet.js
- Reverse geocoding to automatically populate location from coordinates (in progress)
- Automatic KYTC District lookup from selected county via GeoJSON
- Image upload with preview
- Real-time report summary display on submission

## Technologies

- HTML5
- CSS3 (Flexbox)
- Vanilla JavaScript
- Leaflet.js
- GeoJSON

## Work in Progress

- 🔄 Reverse geocoding call functional but still under validation
- 💾 Database integration not yet implemented
- 📊 Dashboard for submitted data planned for future enhancement

## Future Enhancements

- Backend storage via API or SQLite/PostgreSQL
- Dashboard for visualizing and managing submitted pothole reports
- Email notifications or ticket creation upon submission
- Mobile-first enhancements and accessibility improvements
