import { PLACE_CATEGORY_META, type PlaceDTO } from "@nzila/shared";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const LUANDA = { lat: -8.839, lng: 13.289 };

const STYLE = `
  html, body { height: 100%; margin: 0; background: #efe7d8; }
  #map { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: #efe7d8; }
  .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .osm-coords {
    position: absolute;
    left: 8px;
    bottom: 22px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    color: #0d0d0d;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
`;

function toScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function baseHtml(unavailable: string, markup: string, script: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="${LEAFLET_CSS}" />
  <style>${STYLE}</style>
</head>
<body>
  <div id="map"></div>
  ${markup}
  <script src="${LEAFLET_JS}"></script>
  <script>
    (function () {
      var unavailable = ${toScriptJson(unavailable)};
      if (!window.L) {
        var mapElement = document.getElementById("map");
        if (mapElement) {
          mapElement.style.padding = "16px";
          mapElement.style.fontSize = "13px";
          mapElement.style.color = "#4A4A4A";
          mapElement.textContent = unavailable;
        }
        return;
      }
      ${script}
    })();
  </script>
</body>
</html>`;
}

export function buildOsmPlacesHtml(
  places: PlaceDTO[],
  selectedId: string | null,
  unavailable: string,
): string {
  const markers = places.map((place) => ({
    id: place.id,
    lat: place.lat,
    lng: place.lng,
    color: PLACE_CATEGORY_META[place.category].color,
    name: place.name,
    selected: place.id === selectedId,
  }));

  const script = `
    var markers = ${toScriptJson(markers)};
    var map = L.map("map", { zoomControl: true }).setView(
      [${LUANDA.lat}, ${LUANDA.lng}],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(map);

    var selectedLayer = null;

    markers.forEach(function (data) {
      var layer = L.circleMarker([data.lat, data.lng], {
        radius: data.selected ? 10 : 7,
        color: "#FFFFFF",
        weight: 3,
        fillColor: data.color,
        fillOpacity: 1,
      }).addTo(map);

      layer.bindTooltip(data.name, {
        direction: "top",
        offset: [0, -8],
        opacity: 0.95,
      });

      layer.on("click", function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: "select", id: data.id }),
          );
        }
      });

      if (data.selected) {
        selectedLayer = layer;
      }
    });

    var selected = markers.find(function (marker) {
      return marker.selected;
    });

    if (selected) {
      map.setView([selected.lat, selected.lng], 15);
      if (selectedLayer) {
        selectedLayer.openTooltip();
      }
    } else if (markers.length > 0) {
      map.fitBounds(
        markers.map(function (marker) {
          return [marker.lat, marker.lng];
        }),
        { padding: [28, 28], maxZoom: 13 },
      );
    }
  `;

  return baseHtml(unavailable, "", script);
}

export function buildOsmPickerHtml(
  initial: { lat: number; lng: number } | null,
  unavailable: string,
): string {
  const center = initial ?? LUANDA;
  const zoom = initial ? 14 : 11;
  const initialCoords = initial ? `${initial.lat.toFixed(6)}, ${initial.lng.toFixed(6)}` : "";

  const script = `
    var map = L.map("map", { zoomControl: true }).setView(
      [${center.lat}, ${center.lng}],
      ${zoom},
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(map);

    var marker = null;
    var coords = document.getElementById("coords");

    function setMarker(lat, lng) {
      if (!marker) {
        marker = L.circleMarker([lat, lng], {
          radius: 10,
          color: "#FFFFFF",
          weight: 3,
          fillColor: "#CC092F",
          fillOpacity: 1,
        }).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (coords) {
        coords.style.display = "block";
        coords.textContent = lat.toFixed(6) + ", " + lng.toFixed(6);
      }
    }

    ${initial ? `setMarker(${initial.lat}, ${initial.lng});` : ""}

    map.on("click", function (event) {
      var lat = event.latlng.lat;
      var lng = event.latlng.lng;
      setMarker(lat, lng);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "pick", lat: lat, lng: lng }),
        );
      }
    });
  `;

  return baseHtml(
    unavailable,
    `<div id="coords" class="osm-coords" style="display: ${initial ? "block" : "none"};">${initialCoords}</div>`,
    script,
  );
}
