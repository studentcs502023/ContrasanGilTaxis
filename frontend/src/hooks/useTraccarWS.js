import { useState, useEffect } from 'react';
import { obtenerPosicionesGps } from '../api/traccarService';

export const useGpsTaxis = (intervaloMs = 3000) => {
  const [taxisGps, setTaxisGps] = useState([]);
  const [cargandoGps, setCargandoGps] = useState(true);

  useEffect(() => {
    let montado = true;

    const solicitarPosiciones = async () => {
      try {
        const datos = await obtenerPosicionesGps();
        if (montado) {
          setTaxisGps(datos);
          setCargandoGps(false);
        }
      } catch (error) {
        console.error('Error al actualizar posiciones de taxis:', error);
      }
    };

    // Petición inicial e intervalo de actualización
    solicitarPosiciones();
    const intervalId = setInterval(solicitarPosiciones, intervaloMs);

    return () => {
      montado = false;
      clearInterval(intervalId);
    };
  }, [intervaloMs]);

  return { taxisGps, cargandoGps };
};