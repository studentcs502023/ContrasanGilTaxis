import { useState, useEffect } from 'react';

// Coordenadas oficiales de San Gil, Santander
const SAN_GIL_CENTRO = { lat: 6.5550, lng: -73.1360 };

export const useGeolocation = () => {
  const [ubicacion, setUbicacion] = useState(SAN_GIL_CENTRO);




 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada.');
      setCargando(false);
      return;
    }

    const validarYEstablecerUbicacion = (posicion) => {
      const { latitude, longitude } = posicion.coords;

      // 🛑 FILTRO ANTI-PIEDECUESTA / BUCARAMANGA
      // Rango geográfico válido alrededor de San Gil
      if (latitude > 6.65 || latitude < 6.45 || longitude < -73.30 || longitude > -73.00) {
        console.warn('GPS por IP fuera del rango de San Gil. Manteniendo centro de San Gil.');
        setUbicacion(SAN_GIL_CENTRO);
      } else {
        setUbicacion({ lat: latitude, lng: longitude });
      }
      setCargando(false);
    };

    const manejarError = (err) => {
      // Si expira o la deniega, usamos San Gil por defecto sin bloquear la app
      console.info('GPS del navegador no disponible/expirado. Asignando centro de San Gil.');
      setError(err.message);
      setUbicacion(SAN_GIL_CENTRO);
      setCargando(false);
    };

    // Configuración optimizada
    const opciones = {
      enableHighAccuracy: false, // Iniciar en false para evitar timeouts en PC
      timeout: 10000,            // Aumentado a 10 segundos para mayor tolerancia
      maximumAge: 30000,         // Reutilizar caché reciente durante 30 segundos
    };

    const watchId = navigator.geolocation.watchPosition(
      validarYEstablecerUbicacion,
      manejarError,
      opciones
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { ubicacion, cargando, error, setUbicacion };
};