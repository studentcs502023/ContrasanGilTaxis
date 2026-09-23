import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Función para calcular un círculo GeoJSON preciso en metros
const crearGeoJSONCirculo = (centerLng, centerLat, radiusInMeters, points = 64) => {
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([centerLng + x, centerLat + y]);
  }
  ret.push(ret[0]); // Cerrar el polígono

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ret]
        }
      }
    ]
  };
};

const MapaSanGil = React.memo(({ 
  userLat = 6.5550, 
  userLng = -73.1360, 
  origen = null,      
  destino = null,     
  mostrarRadar = true,
  radioMetros = 500,  
  onSelectUbicacion 
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);

  // 1. Inicializar el mapa UNA SOLA VEZ
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [userLng, userLat],
      zoom: 15,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Registrar la fuente del radar
      if (!map.current.getSource('radar-source')) {
        map.current.addSource('radar-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // Capa de Relleno Ámbar (translúcido)
        map.current.addLayer({
          id: 'radar-layer-fill',
          type: 'fill',
          source: 'radar-source',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.18
          }
        });

        // Capa de Borde Punteado
        map.current.addLayer({
          id: 'radar-layer-outline',
          type: 'line',
          source: 'radar-source',
          paint: {
            'line-color': '#d97706',
            'line-width': 2,
            'line-dasharray': [2, 2]
          }
        });

        // Dibujar el radar inmediatamente al cargar el mapa
        actualizarCapasRadar();
      }
    });

    map.current.on('click', (e) => {
      if (onSelectUbicacion) {
        onSelectUbicacion({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Función separada para actualizar los datos del GeoJSON sin destruir las capas
  const actualizarCapasRadar = () => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource('radar-source');
    if (!source) return;

    if (!mostrarRadar) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const centroLng = origen?.lng ?? userLng;
    const centroLat = origen?.lat ?? userLat;

    const geojson = crearGeoJSONCirculo(centroLng, centroLat, radioMetros);
    source.setData(geojson);
  };

  // 2. Actualizar el marcador del usuario
  useEffect(() => {
    if (!map.current) return;

    if (!userMarker.current) {
      const el = document.createElement('div');
      el.style.backgroundColor = '#2563eb';
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(0,0,0,0.4)';

      userMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLng, userLat])
        .addTo(map.current);
    } else {
      userMarker.current.setLngLat([userLng, userLat]);
    }
  }, [userLat, userLng]);

  // 3. Re-dibujar el radar SOLO si cambian el origen, las coordenadas o la visibilidad
  useEffect(() => {
    actualizarCapasRadar();
  }, [origen?.lat, origen?.lng, userLat, userLng, mostrarRadar, radioMetros]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

export default MapaSanGil;