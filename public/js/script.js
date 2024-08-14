const socket = io();

let map, markers = {}, routingControl = null, watchID = null;
const loader = document.getElementById("loader");
const disconnectBtn = document.getElementById('disconnectBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');

joinRoomBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value;
  const roomId = document.getElementById('roomId').value;
  if (!name || !roomId) {
    alert('Please enter both name and room ID');
    return;
  }
  joinRoom(name, roomId);
});

createRoomBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value;
  const roomId = generateRoomId();
  if (!name) {
    alert('Please enter your name');
    return;
  }
  joinRoom(name, roomId);
  alert(`Room created with ID: ${roomId}`);
});

function generateRoomId() {
  return 'room-' + Math.random().toString(36).substr(2, 9);
}

function joinRoom(name, roomId) {
  socket.emit('joinRoom', { roomId, name });

  map = L.map("map").setView([0, 0], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "iMap by Sahil_JR"
  }).addTo(map);

  if (navigator.geolocation) {
    watchID = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (socket.connected) {
          socket.emit('sendLocation', { latitude, longitude });
        } else {
          console.log("Socket is not connected");
        }
      },
      (error) => {
        console.error("Error on sending location", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
  }

  socket.on("receiveLocation", (data) => {
    const { id, latitude, longitude, name } = data;
    console.log(`Received location from ${name} at Latitude: ${latitude}, Longitude: ${longitude}`);

    map.setView([latitude, longitude], 13);

    const markerIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    });

    if (markers[id]) {
      markers[id].setLatLng([latitude, longitude]);
    } else {
      markers[id] = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map)
        .bindPopup(`<b>${name || "Unknown"}</b>`)
        .openPopup();
    }

    const markerIds = Object.keys(markers);
    if (markerIds.length >= 2) {
      const routeCoordinates = markerIds.map(id => markers[id].getLatLng());
      if (routingControl) {
        map.removeControl(routingControl);
      }

      showLoader();

      routingControl = L.Routing.control({
        waypoints: routeCoordinates.map(coord => L.latLng(coord.lat, coord.lng)),
        routeWhileDragging: true,
        createMarker: () => null,
        lineOptions: {
          styles: [{ color: 'blue', opacity: 0.7, weight: 4 }]
        }
      }).addTo(map);

      routingControl.on('routesfound', function (e) {
        hideLoader();
        const routes = e.routes;
        const summary = routes[0].summary;
        console.log(`Total distance: ${(summary.totalDistance / 1000).toFixed(2)} km`);
      });

      routingControl.on('routingerror', function (e) {
        hideLoader();
        console.error('Routing error', e.error);
      });
    }
  });

  socket.on('userDisconnect', (id) => {
    if (markers[id]) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }

    if (Object.keys(markers).length < 2 && routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
  });

  disconnectBtn.addEventListener('click', () => {
    socket.emit('disconnectLocation');
    if (navigator.geolocation && watchID !== null) {
      navigator.geolocation.clearWatch(watchID);
    }
  });

  window.addEventListener('beforeunload', () => {
    socket.emit('disconnectLocation');
  });
}

function showLoader() {
  loader.style.display = "block";
}

function hideLoader() {
  loader.style.display = "none";
}
