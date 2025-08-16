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

    // Función para mostrar notificaciones en el mapa
    function showMapNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `map-notification alert alert-${type} alert-dismissible fade show`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2000;
            max-width: 350px;
            font-size: 0.9rem;
        `;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 8 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);
    }

    const initialView = {
        center: [24.1, -102],
        zoom: 5
    };

    // MapTiler API Keys
    const mapTilerKeys = {
        personal: 'jAAFQsMBZ9a6VIm2dCwg',  // Tu API key
        amigo: 'xRR3xCujdkUjxkDqlNTG'     // API key del amigo
    };

    // Verificar disponibilidad de MapTiler SDK
    function checkMapTilerSDK() {
        if (typeof L.maptiler !== 'undefined' && L.maptiler.maptilerLayer) {
            console.log('MapTiler SDK disponible');
            return true;
        } else {
            console.warn('MapTiler SDK no disponible');
            return false;
        }
    }

    // Verificar disponibilidad de MarkerClusterGroup
    function checkMarkerClusterGroup() {
        if (typeof L.markerClusterGroup !== 'undefined') {
            console.log('MarkerClusterGroup disponible');
            return true;
        } else {
            console.warn('MarkerClusterGroup no disponible');
            showMapNotification('Plugin de clusters no disponible. Los puntos se mostrarán individualmente.', 'warning');
            return false;
        }
    }

    // Función para crear layer con fallback automático
    function createLayerWithFallback(mapTilerUrl, fallbackUrl, attribution, name) {
        const mapTilerLayer = L.tileLayer(mapTilerUrl, {
            attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // Pixel transparente
        });

        const fallbackLayer = L.tileLayer(fallbackUrl, {
            attribution: attribution,
            maxZoom: 18
        });

        let errorCount = 0;
        const maxErrors = 5;

        // Detectar errores de carga y cambiar a fallback
        mapTilerLayer.on('tileerror', function (e) {
            errorCount++;
            console.warn(`Error cargando tile de ${name}: ${errorCount}/${maxErrors}`);

            if (errorCount >= maxErrors) {
                console.warn(`Cambiando ${name} a fallback debido a múltiples errores`);

                // Mostrar notificación al usuario
                showMapNotification(`${name}: Usando mapa alternativo debido a problemas de conectividad`, 'warning');

                // Reemplazar el layer problemático con el fallback
                if (map.hasLayer(mapTilerLayer)) {
                    map.removeLayer(mapTilerLayer);
                    map.addLayer(fallbackLayer);

                    // Actualizar el control de capas
                    setTimeout(() => {
                        const layersControl = map._controlLayers;
                        if (layersControl) {
                            layersControl._layers.forEach(layer => {
                                if (layer.layer === mapTilerLayer) {
                                    layer.layer = fallbackLayer;
                                }
                            });
                        }
                    }, 100);
                }
            }
        });

        return mapTilerLayer;
    }

    // Función para crear MapTiler layer usando SDK o fallback con API key específica
    function createMapTilerLayer(styleId, apiKeyType, fallbackUrl, attribution, name) {
        const apiKey = mapTilerKeys[apiKeyType];

        if (checkMapTilerSDK()) {
            try {
                // Usar el SDK de MapTiler (método recomendado)
                const layer = L.maptiler.maptilerLayer({
                    apiKey: apiKey,
                    style: styleId,
                    maxZoom: 18 // Asegurar maxZoom para clusters
                });

                // Configurar maxZoom manualmente si no está definido
                if (!layer.options) layer.options = {};
                if (!layer.options.maxZoom) layer.options.maxZoom = 18;

                console.log(`${name} creado con MapTiler SDK usando key ${apiKeyType}`);
                return layer;
            } catch (error) {
                console.warn(`Error creando ${name} con SDK:`, error);
            }
        }

        // Fallback a tile layer estándar
        console.log(`${name} usando fallback`);
        return L.tileLayer(fallbackUrl, {
            attribution: attribution,
            maxZoom: 18
        });
    }

    // Tu mapa personalizado de MapTiler
    const MiMapaPersonalizado = createMapTilerLayer(
        '0198a42c-5e08-77a1-9773-763ee4e12b32', // Tu style ID
        'personal', // Usar tu API key
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'Mi Mapa Personalizado'
    );

    // Mapas originales del amigo con su API key
    const SenerLightOriginal = createMapTilerLayer(
        '0198a9af-dc7c-79d3-8316-a80767ad1d0f', // Style ID original del amigo
        'amigo', // Usar API key del amigo
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'SENER Light Original'
    );

    const SenerDarkOriginal = createMapTilerLayer(
        '0198a9f0-f135-7991-aaec-bea71681556e', // Style ID original del amigo
        'amigo', // Usar API key del amigo
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'SENER Dark Original'
    );

    // Mapas adicionales usando estilos predefinidos
    const SenerLight = createMapTilerLayer(
        L.maptiler.MapStyle.STREETS, // Estilo predefinido
        'personal', // Usar tu API key
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'SENER Streets'
    );

    const SenerDark = createMapTilerLayer(
        L.maptiler.MapStyle.DARK, // Estilo predefinido oscuro
        'personal', // Usar tu API key
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'SENER Dark'
    );

    // Google Satellite Layer (fallback)
    const GoogleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20
    });

    const baseMaps = {
        'SENER Azul': MiMapaPersonalizado,
        'SENER Light': SenerLightOriginal,
        'SENER Oscuro': SenerDarkOriginal
    };

    // Asegurar que todos los mapas base tengan maxZoom configurado
    Object.keys(baseMaps).forEach(mapName => {
        const layer = baseMaps[mapName];
        if (layer && layer.options && !layer.options.maxZoom) {
            layer.options.maxZoom = 18;
            console.log(`Configurando maxZoom para ${mapName}`);
        }
    });

    // Definir límites aproximados de México para restringir navegación
    const mexicoBounds = L.latLngBounds([
        [14.0, -118.0], // Suroeste (aprox. Chiapas / Pacífico)
        [33.5, -86.0]   // Noreste (frontera norte / Golfo)
    ]);

    const map = L.map(MAP_CONTAINER_ID, {
        center: initialView.center,
        zoom: initialView.zoom,
        minZoom: 4,
        maxZoom: 18, // Agregar maxZoom para MarkerClusterGroup
        maxBounds: mexicoBounds,
        maxBoundsViscosity: 0.9,
        layers: [baseMaps['SENER Light']]
    });

    // Evitar hacer zoom out más allá del marco continental relevante
    map.on('zoomend', () => {
        if (map.getZoom() < 4) map.setZoom(4);
    });

    // Ajustar vista para asegurar bounds al iniciar (si se desea ver todo México)
    map.fitBounds(mexicoBounds.pad(-0.15));

    // Agregar event listener al botón de centrar mapa si existe
    const centerBtn = document.getElementById(CENTER_MAP_BTN_ID);
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            map.setView(initialView.center, initialView.zoom);
        });
    }

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

    const fetchPromises = Object.entries(urls).map(([name, url]) =>
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
                    style: () => {
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

                if (isPointLayer && checkMarkerClusterGroup()) {
                    // Asegurar que el mapa tenga maxZoom configurado
                    if (!map.options.maxZoom) {
                        map.options.maxZoom = 18;
                    }

                    // Configurar cluster con opciones mejoradas
                    try {
                        const markers = L.markerClusterGroup({
                            chunkedLoading: true,
                            chunkProgress: function (processed, total, elapsed) {
                                if (processed === total) {
                                    console.log(`Cluster ${name} completado: ${total} puntos`);
                                }
                            },
                            maxClusterRadius: function (zoom) {
                                // Radio dinámico basado en zoom
                                return zoom < 10 ? 80 : zoom < 15 ? 50 : 30;
                            },
                            spiderfyOnMaxZoom: true,
                            showCoverageOnHover: true,
                            zoomToBoundsOnClick: true,
                            spiderfyDistanceMultiplier: 1.5,
                            removeOutsideVisibleBounds: true,
                            animate: true,
                            animateAddingMarkers: true,
                            disableClusteringAtZoom: 18,
                            // Usar iconCreateFunction por defecto (comentado para usar el default)
                            // iconCreateFunction se omite para usar el estilo por defecto de MarkerCluster
                        });

                        // Eventos del cluster para mejor UX
                        markers.on('clusterclick', function (e) {
                            const cluster = e.layer;
                            const count = cluster.getChildCount();
                            console.log(`Cluster clickeado: ${count} elementos de ${name}`);

                            // Agregar clase temporal para animación
                            cluster._icon.classList.add('cluster-active');
                            setTimeout(() => {
                                if (cluster._icon) {
                                    cluster._icon.classList.remove('cluster-active');
                                }
                            }, 2000);
                        });

                        markers.on('clustermouseover', function (e) {
                            const cluster = e.layer;
                            const count = cluster.getChildCount();

                            // Tooltip personalizado
                            cluster.bindTooltip(`${name}: ${count} elementos`, {
                                permanent: false,
                                direction: 'top',
                                className: 'cluster-tooltip'
                            }).openTooltip();
                        });

                        markers.addLayer(geoJsonLayer);
                        overlayMaps[name] = markers;
                        console.log(`Cluster creado para ${name} con ${geoJsonLayer.getLayers().length} features`);
                    } catch (error) {
                        console.warn(`Error creando cluster para ${name}:`, error);
                        // Fallback sin cluster
                        overlayMaps[name] = geoJsonLayer;
                    }
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
            const layersControl = L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
            
            // Guardar referencia al control de capas para sincronización
            window.layersControl = layersControl;
            
            // Agregar event listeners para sincronización bidireccional
            map.on('overlayadd', function(e) {
                syncCardSwitch(e.name, true);
            });
            
            map.on('overlayremove', function(e) {
                syncCardSwitch(e.name, false);
            });

            // Agregar control de localización si está disponible
            if (typeof L.control.locate === 'function') {
                try {
                    L.control.locate({
                        position: 'topright',
                        strings: {
                            title: "Mostrar mi ubicación"
                        },
                        locateOptions: {
                            maxZoom: 16
                        }
                    }).addTo(map);
                } catch (error) {
                    console.warn('Error al agregar control de localización:', error);
                }
            } else {
                console.warn('Control de localización no disponible');
            }

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
        // Listeners para switches con sincronización bidireccional
        container.querySelectorAll('.layer-switch').forEach(input => {
            input.addEventListener('change', e => {
                const layerName = e.target.getAttribute('data-layer');
                const isChecked = e.target.checked;
                toggleLayer(layerName, isChecked);
                
                // Sincronizar con el control de capas de Leaflet
                syncLayerControlCheckbox(layerName, isChecked);
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

    // Agregar event listeners solo si los elementos existen
    const searchBtn = document.getElementById(SEARCH_BTN_ID);
    const searchInput = document.getElementById(SEARCH_INPUT_ID);

    if (searchBtn) {
        searchBtn.addEventListener('click', search);
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                search();
            }
        });
    }
});
// Funciones de sincronización bidireccional entre switches y control de capas

function syncCardSwitch(layerName, isActive) {
    // Sincronizar el switch de la card cuando se cambia desde el control de capas
    const switchElement = document.querySelector(`input[data-layer="${layerName}"]`);
    if (switchElement && switchElement.checked !== isActive) {
        switchElement.checked = isActive;
        console.log(`Switch sincronizado: ${layerName} = ${isActive}`);
    }
}

function syncLayerControlCheckbox(layerName, isChecked) {
    // Sincronizar el control de capas cuando se cambia desde el switch
    try {
        const layer = overlayMaps[layerName];
        if (layer) {
            if (isChecked && !map.hasLayer(layer)) {
                map.addLayer(layer);
            } else if (!isChecked && map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
            console.log(`Control de capas sincronizado: ${layerName} = ${isChecked}`);
        }
    } catch (error) {
        console.warn('Error sincronizando control de capas:', error);
    }
}

// Función mejorada para toggle de capas con sincronización
function toggleLayer(name, enable) {
    const layer = overlayMaps[name];
    if (!layer) return;
    
    if (enable) {
        if (!map.hasLayer(layer)) {
            map.addLayer(layer);
            activeLayers.add(name);
        }
    } else {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            activeLayers.delete(name);
        }
    }
    
    console.log(`Capa ${name} ${enable ? 'activada' : 'desactivada'}`);
}