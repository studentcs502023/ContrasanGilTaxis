import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { obtenerPerfilTaxista } from '../api/taxistasService';

const crearCirculoGeoJSON = (lat, lng, radioMetros = 500, puntos = 64) => {
  if (!lat || !lng) return null;
  const coords = [];
  const km = radioMetros / 1000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  for (let i = 0; i < puntos; i++) {
    const angulo = (i * 360) / puntos;
    const theta = (angulo * Math.PI) / 180;
    const latPuntoRad = Math.asin(
      Math.sin(latRad) * Math.cos(km / 6371) +
        Math.cos(latRad) * Math.sin(km / 6371) * Math.cos(theta)
    );
    const lngPuntoRad =
      lngRad +
      Math.atan2(
        Math.sin(theta) * Math.sin(km / 6371) * Math.cos(latRad),
        Math.cos(km / 6371) - Math.sin(latRad) * Math.sin(latPuntoRad)
      );
    coords.push([(lngPuntoRad * 180) / Math.PI, (latPuntoRad * 180) / Math.PI]);
  }
  coords.push(coords[0]);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      },
    ],
  };
};

export const MapaSanGil = ({
  modo = 'taxista', // 'taxista' o 'pasajero'
  
  // Props para el Taxista
  usuarioIdTaxista,
  taxistaLat,
  taxistaLng,
  mostrarRadar = true,
  radioMetros = 500,
  solicitudesCercanas = [], 
  
  // Props para el Pasajero
  ubicacionPasajero = null, // { lat, lng } desde useGeolocation
  datosTaxiAsignado = null, // { lat, lng, placa } si hay un taxi asignado
  
  onSelectUbicacion,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const taxiMarkerRef = useRef(null);
  const pasajeroMarkerRef = useRef(null);
  const solicitudesMarkersRef = useRef({});

  const [mapListo, setMapListo] = useState(false);
  const [placaTaxista, setPlacaTaxista] = useState('');

  const SAN_GIL_CENTRO = { lat: 6.555, lng: -73.136 };
  
  // El centro del mapa depende de quién lo esté usando
  const currentLat = modo === 'taxista' 
    ? (Number(taxistaLat) || SAN_GIL_CENTRO.lat) 
    : (ubicacionPasajero?.lat || SAN_GIL_CENTRO.lat);
  const currentLng = modo === 'taxista' 
    ? (Number(taxistaLng) || SAN_GIL_CENTRO.lng) 
    : (ubicacionPasajero?.lng || SAN_GIL_CENTRO.lng);

  useEffect(() => {
    let isMounted = true;
    const cargarPlacaTaxista = async () => {
      if (!usuarioIdTaxista || modo !== 'taxista') return;
      try {
        const perfil = await obtenerPerfilTaxista(usuarioIdTaxista);
        if (isMounted && perfil?.placa) {
          setPlacaTaxista(perfil.placa);
        }
      } catch (error) {
        console.error('Error al obtener perfil del taxista:', error);
      }
    };
    cargarPlacaTaxista();
    return () => { isMounted = false; };
  }, [usuarioIdTaxista, modo]);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [currentLng, currentLat],
      zoom: 15,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;
      map.current.resize();
      setMapListo(true);

      map.current.addSource('radar-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'radar-fill-layer',
        type: 'fill',
        source: 'radar-source',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.15,
        },
      });

      map.current.addLayer({
        id: 'radar-stroke-layer',
        type: 'line',
        source: 'radar-source',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      if (modo === 'taxista' && mostrarRadar) {
        const geojson = crearCirculoGeoJSON(currentLat, currentLng, radioMetros);
        if (geojson) map.current.getSource('radar-source').setData(geojson);
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

  // Marcador para el Pasajero (Mostrar solo en modo 'pasajero')
  // Marcador para el Pasajero (Visible para el pasajero o para el taxista si hay una carrera activa)
  useEffect(() => {
    if (!map.current || !mapListo) return;

    // Si es modo taxista, necesitamos que reciba las coordenadas del pasajero de la carrera activa
    const mostrarPasajero = (modo === 'pasajero' && ubicacionPasajero) || (modo === 'taxista' && ubicacionPasajero);

    if (!mostrarPasajero) {
      if (pasajeroMarkerRef.current) {
        pasajeroMarkerRef.current.remove();
        pasajeroMarkerRef.current = null;
      }
      return;
    }

    const coords = [ubicacionPasajero.lng, ubicacionPasajero.lat];

    if (!pasajeroMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center w-10 h-10 z-50 cursor-pointer select-none';
      el.innerHTML = `
        <div class="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-xl text-xl animate-bounce" title="Ubicación del Pasajero">
          👤
        </div>
      `;
      pasajeroMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current);
    } else {
      pasajeroMarkerRef.current.setLngLat(coords);
    }
  }, [ubicacionPasajero, mapListo, modo]);
  // Marcador para el Taxi y Radar (Movimiento en tiempo real)
  useEffect(() => {
    if (!map.current || !mapListo) return;

    // Determinar si se debe mostrar el taxi (El taxista ve su propio taxi, el pasajero lo ve si hay uno asignado)
    const mostrarTaxi = modo === 'taxista' || (modo === 'pasajero' && datosTaxiAsignado);

    if (!mostrarTaxi) {
      if (taxiMarkerRef.current) {
        taxiMarkerRef.current.remove();
        taxiMarkerRef.current = null;
      }
      return;
    }

    const taxiLat = modo === 'taxista' ? currentLat : datosTaxiAsignado.lat;
    const taxiLng = modo === 'taxista' ? currentLng : datosTaxiAsignado.lng;
    const coords = [taxiLng, taxiLat];

    if (!taxiMarkerRef.current) {
      const el = document.createElement('div');
      // Lógica añadida: "transition-all duration-500" permite que el marcador se deslice en lugar de saltar bruscamente
      el.className = 'relative flex items-center justify-center w-10 h-10 z-50 cursor-pointer select-none transition-all duration-500';
      el.innerHTML = `
        <span class="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
        <span class="relative flex items-center justify-center w-9 h-9 bg-slate-900 border-2 border-amber-400 rounded-full shadow-2xl text-lg">
          🚕
        </span>
      `;
      taxiMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current);
    } else {
      taxiMarkerRef.current.setLngLat(coords);
    }

    // Actualizar el radar si el usuario es conductor (taxista)
    if (map.current.getSource('radar-source')) {
      if (modo === 'taxista' && mostrarRadar) {
        const geojsonRadar = crearCirculoGeoJSON(currentLat, currentLng, radioMetros);
        if (geojsonRadar) map.current.getSource('radar-source').setData(geojsonRadar);
      } else {
        map.current.getSource('radar-source').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [currentLat, currentLng, mostrarRadar, radioMetros, mapListo, modo, datosTaxiAsignado]);

  // Marcador para las solicitudes cercanas (Mostrar solo en modo 'taxista')
  useEffect(() => {
    if (!map.current || !mapListo || modo !== 'taxista') return;

    const idsActuales = new Set();

    if (Array.isArray(solicitudesCercanas) && solicitudesCercanas.length > 0) {
      solicitudesCercanas.forEach((item) => {
        const itemId = item.id ?? item.deviceId ?? item.device_id ?? item.solicitudId;
        if (itemId === undefined || itemId === null) return;

        idsActuales.add(String(itemId));
        const lat = Number(item.latitude ?? item.latitud ?? item.lat);
        const lng = Number(item.longitude ?? item.longitud ?? item.lng);

        if (isNaN(lat) || isNaN(lng)) return;

        if (solicitudesMarkersRef.current[itemId]) {
          solicitudesMarkersRef.current[itemId].setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'flex items-center justify-center w-10 h-10 z-40 cursor-pointer select-none';
          el.innerHTML = `
            <div class="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-xl text-xl">
              🧑
            </div>
          `;
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map.current);

          solicitudesMarkersRef.current[itemId] = marker;
        }
      });
    }

    Object.keys(solicitudesMarkersRef.current).forEach((id) => {
      if (!idsActuales.has(id)) {
        solicitudesMarkersRef.current[id].remove();
        delete solicitudesMarkersRef.current[id];
      }
    });
  }, [solicitudesCercanas, mapListo, modo]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapaSanGil;