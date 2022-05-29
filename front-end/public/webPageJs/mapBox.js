const locations = JSON.parse(document.getElementById('map').dataset.locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoiZGFyaXVzYm9nZGFuY2VzYXJpcyIsImEiOiJjbDJ6NWllZmIwOTRxM2Jxb3NrMDhzajZ6In0.xJSkRppttIPreEwf1BPr6Q';

let map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/dariusbogdancesaris/cl2z73dcg002q14l5v9wv1irb',
  scrollZoom: false,
  //center: [-118.113491, 34.111745],
  //zoom: 4,
});

const bounds = new mapboxgl.LngLatBounds();

locations.forEach((loc) => {
  // create marker
  const el = document.createElement('div');
  el.classList.add('marker');

  // add marker
  new mapboxgl.Marker({
    element: el,
    anchor: 'bottom',
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  // add popup
  new mapboxgl.Popup({
    offset: 30,
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

  // extend map bounds to include the current location
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 150,
    bottom: 150,
    left: 100,
    right: 100,
  },
});
