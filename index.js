document.addEventListener('DOMContentLoaded', function () {
    const MAP_CONTAINER_ID = 'map';
    const PRELOADER_ID = 'preloader';
    const PRELOADER_BAR_ID = 'preProgressBar';
    // Layer switches integrados en las cards
    const CENTER_MAP_BTN_ID = 'center-map-btn';
    const SEARCH_INPUT_ID = 'search-input';
    const SEARCH_BTN_ID = 'search-btn';
    const SEARCH_RESULTS_ID = 'search-results';

    if (!document.getElementById(MAP_CONTAINER_ID)) {
        console.error(`Error: Map container #${MAP_CONTAINER_ID} not found.`);
        return;
    }

    const initialView = {
        center: [24.1, -102],
        zoom: 5
    };

    const baseMaps = {
        'CartoDB Positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }),
        'Stamen Toner': L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            minZoom: 0,
            maxZoom: 20,
            ext: 'png'
        }),
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    };

    // Definir límites aproximados de México para restringir navegación
    const mexicoBounds = L.latLngBounds([
        [14.0, -118.0], // Suroeste (aprox. Chiapas / Pacífico)
        [33.5, -86.0]   // Noreste (frontera norte / Golfo)
    ]);

    const map = L.map(MAP_CONTAINER_ID, {
        center: initialView.center,
        zoom: initialView.zoom,
        minZoom: 4,
        maxBounds: mexicoBounds,
        maxBoundsViscosity: 0.9,
        layers: [baseMaps['CartoDB Positron']]
    });

    // Evitar hacer zoom out más allá del marco continental relevante
    map.on('zoomend', () => {
        if (map.getZoom() < 4) map.setZoom(4);
    });

    // Ajustar vista para asegurar bounds al iniciar (si se desea ver todo México)
    map.fitBounds(mexicoBounds.pad(-0.15));

    document.getElementById(CENTER_MAP_BTN_ID).addEventListener('click', () => {
        map.setView(initialView.center, initialView.zoom);
    });

    const urls = {
        'Ductos GLP': 'https://cdn.sassoapps.com/solicitud/ductos_glp.geojson',
        'Ductos de Importación': 'https://cdn.sassoapps.com/solicitud/ductos_importacion.geojson',
        'Ductos (no SISTRANGAS)': 'https://cdn.sassoapps.com/solicitud/ductos_nosistrangas.geojson',
        'Ductos Petrolíferos': 'https://cdn.sassoapps.com/solicitud/ductos_petroliferos.geojson',
        'Ductos SISTRANGAS': 'https://cdn.sassoapps.com/solicitud/ductos_sistrangas.geojson',
        'Proyectos Eléctricos': 'https://cdn.sassoapps.com/solicitud/electricidad_proyectos.geojson',
        'Gas LP': 'https://cdn.sassoapps.com/solicitud/gas_lp.geojson',
        'Gas Natural': 'https://cdn.sassoapps.com/solicitud/gas_natural.geojson',
        'Líneas de Transmisión': 'https://cdn.sassoapps.com/solicitud/lineas_transmision.geojson',
        'Subestaciones Eléctricas': 'https://cdn.sassoapps.com/solicitud/subestacion_electrica.geojson'
    };

    // Paleta extendida 2025 asignada por capa (puedes ajustar si prefieres otros tonos)
    const layerColorMap = {
        'Ductos GLP': '#E66A54',               // Rojo Coral
        'Ductos de Importación': '#E24849',    // Rojo Vivo
        'Ductos (no SISTRANGAS)': '#B64836',   // Rojo Oscuro
        'Ductos Petrolíferos': '#E85D33',      // Naranja Fuerte
        'Ductos SISTRANGAS': '#E85D14',        // Naranja Vivo
        'Proyectos Eléctricos': '#20705B',     // Verde Profundo
        'Gas LP': '#C69A04',                   // Mostaza Amarillo
        'Gas Natural': '#225655',              // Verde Oscuro
        'Líneas de Transmisión': '#58152A',    // Vino
        'Subestaciones Eléctricas': '#7E1D37'  // Magenta Oscuro
    };

    const overlayMaps = {};
    const activeLayers = new Set();
    const totalLayers = Object.keys(urls).length;
    let loadedLayers = 0;
    const layerFeatureCounts = {}; // store feature totals per layer

    const updatePreloader = () => {
        loadedLayers++;
        const percent = Math.round((loadedLayers / totalLayers) * 100);
        const bar = document.getElementById(PRELOADER_BAR_ID);
        if (bar) {
            bar.style.width = `${percent}%`;
            bar.setAttribute('aria-valuenow', percent);
        }
    };

    const fetchPromises = Object.entries(urls).map(([name, url], index) =>
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok for ${name}`);
                return response.json();
            })
            .then(data => {
                const color = layerColorMap[name] || '#601623';
                const isPointLayer = data.features.some(f => f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint');
                layerFeatureCounts[name] = Array.isArray(data.features) ? data.features.length : 0;

                const geoJsonLayer = L.geoJSON(data, {
                    style: (feature) => {
                        return { color: color, weight: 2 };
                    },
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, { radius: 6, fillColor: color, color: '#fff', weight: 1, opacity: 1, fillOpacity: 0.8 });
                    },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            let popupContent = `<h6 style="color:${color}">${name}</h6><div class="table-responsive"><table class="table table-sm table-striped">`;
                            for (const key in feature.properties) {
                                popupContent += `<tr><th scope="row">${key}</th><td>${feature.properties[key]}</td></tr>`;
                            }
                            popupContent += '</table></div>';
                            layer.bindPopup(popupContent, { maxHeight: 200 });
                        }
                    }
                });

                if (isPointLayer) {
                    const markers = L.markerClusterGroup();
                    markers.addLayer(geoJsonLayer);
                    overlayMaps[name] = markers;
                } else {
                    overlayMaps[name] = geoJsonLayer;
                }
                updatePreloader();
            })
            .catch(error => {
                console.error(`Failed to load layer: ${name}`, error);
                updatePreloader();
            })
    );

    Promise.all(fetchPromises)
        .then(() => {
            L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
            renderTotals();
        })
        .finally(() => {
            const preloader = document.getElementById(PRELOADER_ID);
            if (preloader) {
                preloader.classList.add('preloader-hide');
                setTimeout(() => preloader.style.display = 'none', 500);
            }
        });

    function toggleLayer(name, enable) {
        const layer = overlayMaps[name];
        if (!layer) return;
        if (enable) {
            if (!map.hasLayer(layer)) map.addLayer(layer);
            activeLayers.add(name);
        } else {
            if (map.hasLayer(layer)) map.removeLayer(layer);
            activeLayers.delete(name);
        }
    }

    function renderTotals() {
        const container = document.getElementById('total-cards-container');
        if (!container) return;
        container.innerHTML = '';
        container.style.display = 'flex';
        container.classList.add('g-3', 'flex-wrap');
        Object.keys(layerFeatureCounts).forEach((name) => {
            const color = layerColorMap[name] || '#601623';
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 col-xl-2';
            col.innerHTML = `
                <div class="card h-100 shadow-sm border-0 position-relative" style="border-top:4px solid ${color}">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="card-title mb-0 me-1" style="font-size:.63rem; text-transform:uppercase; letter-spacing:.5px; color:${color}; flex:1;">${name}</h6>
                            <div class="form-check form-switch m-0" style="transform:scale(.8);">
                                <input class="form-check-input layer-switch" type="checkbox" data-layer="${name}" checked>
                            </div>
                        </div>
                        <p class="card-text mb-0" style="font-size:1.15rem; font-weight:600;">${layerFeatureCounts[name].toLocaleString('es-MX')}</p>
                    </div>
                </div>`;
            container.appendChild(col);
            toggleLayer(name, true);
        });
        // Listeners para switches
        container.querySelectorAll('.layer-switch').forEach(input => {
            input.addEventListener('change', e => {
                const layerName = e.target.getAttribute('data-layer');
                toggleLayer(layerName, e.target.checked);
            });
        });
        buildLegend();
    }

    function buildLegend() {
        const legendContainer = document.getElementById('legend-container');
        const legendItems = document.getElementById('legend-items');
        if (!legendContainer || !legendItems) return;
        legendContainer.style.display = 'block';
        legendItems.innerHTML = '';
        Object.keys(urls).forEach(name => {
            const color = layerColorMap[name] || '#601623';
            const item = document.createElement('div');
            item.className = 'legend-item d-flex align-items-center';
            item.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};margin-right:6px;border:1px solid #222"></span><span style="font-size:.8rem;">${name}</span>`;
            legendItems.appendChild(item);
        });
    }

    function search() {
        const searchTerm = document.getElementById(SEARCH_INPUT_ID).value.toLowerCase();
        const resultsContainer = document.getElementById(SEARCH_RESULTS_ID);
        resultsContainer.innerHTML = '';

        if (!searchTerm) return;

        activeLayers.forEach(layerName => {
            const layer = overlayMaps[layerName];
            layer.eachLayer(subLayer => {
                const feature = subLayer.feature;
                if (feature && feature.properties) {
                    for (const key in feature.properties) {
                        const value = String(feature.properties[key]).toLowerCase();
                        if (value.includes(searchTerm)) {
                            const resultItem = document.createElement('a');
                            resultItem.href = '#';
                            resultItem.className = 'list-group-item list-group-item-action';
                            resultItem.innerHTML = `<strong>${layerName}:</strong> ${feature.properties[key]}`;
                            resultItem.addEventListener('click', (e) => {
                                e.preventDefault();
                                if (subLayer.getBounds) {
                                    map.fitBounds(subLayer.getBounds());
                                } else if (subLayer.getLatLng) {
                                    map.setView(subLayer.getLatLng(), 18);
                                }
                                subLayer.openPopup();
                            });
                            resultsContainer.appendChild(resultItem);
                        }
                    }
                }
            });
        });

        if (resultsContainer.children.length === 0) {
            resultsContainer.innerHTML = '<div class="list-group-item">No se encontraron resultados.</div>';
        }
    }

    document.getElementById(SEARCH_BTN_ID).addEventListener('click', search);
    document.getElementById(SEARCH_INPUT_ID).addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            search();
        }
    });
});
