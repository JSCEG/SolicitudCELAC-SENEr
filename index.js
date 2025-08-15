// Inicializar el mapa
var map;
if (document.getElementById('map')) {
    map = L.map("map").setView([24.1, -102], 6);
} else {
    console.error('Contenedor #map no encontrado');
}

// Capa base de OpenStreetMap
var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {});
var baseMaps = {
    "OpenStreetMap": osm
};
osm.addTo(map);

// URLs de las capas de Geoserver
var urls = {
    'ductos_glp': 'https://cdn.sassoapps.com/solicitud/ductos_glp.geojson',
    'ductos_importacion': 'https://cdn.sassoapps.com/solicitud/ductos_importacion.geojson',
    'ductos_nosistrangas': 'https://cdn.sassoapps.com/solicitud/ductos_nosistrangas.geojson',
    'ductos_petroliferos': 'https://cdn.sassoapps.com/solicitud/ductos_petroliferos.geojson',
    'ductos_sistrangas': 'https://cdn.sassoapps.com/solicitud/ductos_sistrangas.geojson',
    'electricidad_proyectos': 'https://cdn.sassoapps.com/solicitud/electricidad_proyectos.geojson',
    'gas_lp': 'https://cdn.sassoapps.com/solicitud/gas_lp.geojson',
    'gas_natural': 'https://cdn.sassoapps.com/solicitud/gas_natural.geojson',
    'lineas_transmision': 'https://cdn.sassoapps.com/solicitud/lineas_transmision.geojson',
    'subestacion_electrica': 'https://cdn.sassoapps.com/solicitud/subestacion_electrica.geojson'
};

var overlayMaps = {};
var fetchPromises = [];
var totalLayers = Object.keys(urls).length;
var loadedLayers = 0;

function updatePreloaderProgress() {
    loadedLayers++;
    var percent = Math.round((loadedLayers / totalLayers) * 100);
    var bar = document.getElementById('preProgressBar');
    if (bar) bar.style.width = percent + '%';
}

for (var name in urls) {
    let layerName = name;
    let fetchPromise = fetch(urls[layerName])
        .then(response => response.json())
        .then(data => {
            var geoJsonLayer = L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    if (feature.properties) {
                        var popupContent = '<h4>' + layerName + '</h4>';
                        for (var key in feature.properties) {
                            popupContent += '<strong>' + key + ':</strong> ' + feature.properties[key] + '<br>';
                        }
                        layer.bindPopup(popupContent);
                    }
                },
                style: function (feature) {
                    if (layerName.includes('Ductos') || layerName.includes('Líneas')) {
                        return { color: '#FF0000', weight: 1 };
                    } else if (layerName.includes('Subestación')) {
                        return { color: '#0000FF', fillColor: '#00BFFF', weight: .075, fillOpacity: 0.5 };
                    }
                },
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 5,
                        fillColor: '#008000',
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                }
            });

            const clusterLayers = [
                'electricidad_proyectos',
                'gas_lp',
                'gas_natural',
                'subestacion_electrica'
            ];
            if (clusterLayers.includes(layerName)) {
                var markers = L.markerClusterGroup();
                markers.addLayer(geoJsonLayer);
                return markers;
            } else {
                return geoJsonLayer;
            }
        })
        .then(layer => {
            // Si es MarkerClusterGroup o LayerGroup, lo dejamos tal cual
            overlayMaps[layerName] = layer;
            updatePreloaderProgress();
        })
        .catch(error => {
            console.error('Error al cargar la capa ' + layerName + ':', error);
            updatePreloaderProgress();
        });

    fetchPromises.push(fetchPromise);
}

Promise.all(fetchPromises)
    .then(() => {
        // Añadir control de capas si el mapa existe
        if (map) {
            L.control.layers(baseMaps, overlayMaps).addTo(map);
        }
        // Ocultar preloader
        var pre = document.getElementById('preloader');
        if (pre) {
            pre.classList.add('preloader-hide');
            setTimeout(function () { pre.style.display = 'none'; }, 350);
        }
    });