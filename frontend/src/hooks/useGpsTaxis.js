import { useState, useEffect } from 'react';
// Importamos la función desde tu archivo de servicios en lugar de usar axiosClient directo
import { obtenerPosicionesGps } from '../api/traccarService'; // o '../api/viajeService' dependiendo de dónde la declaraste

export const useGpsTaxis = (intervaloMs = 5000) => {
  const [taxisGps, setTaxisGps] = useState([]);
  const [cargandoGps, setCargandoGps] = useState(true);
  const [errorGps, setErrorGps] = useState(null);

  useEffect(() => {
    let montado = true;

    const consultarPosiciones = async () => {
      try {
        // Usamos directamente tu servicio
        const datos = await obtenerPosicionesGps();
        
        if (montado && Array.isArray(datos)) {
          setTaxisGps(datos);
          setErrorGps(null);
        }
      } catch (error) {
        if (montado) {
          console.error('Error al obtener posiciones GPS de los taxis:', error);
          setErrorGps('No se pudieron cargar las ubicaciones en vivo.');
        }
      } finally {
        if (montado) {
          setCargandoGps(false);
        }
      }
    };

    // 1. Primera carga inmediata
    consultarPosiciones();

    // 2. Configurar el ciclo de repetición (Polling)
    const intervalo = setInterval(consultarPosiciones, intervaloMs);

    // 3. Limpieza
    return () => {
      montado = false;
      clearInterval(intervalo);
    };
  }, [intervaloMs]);

  return { taxisGps, cargandoGps, errorGps };
};