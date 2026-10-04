import axiosClient from '../api/axiosClient';

/**
 * Obtiene la lista de posiciones GPS de los vehículos desde el proxy Backend de FastAPI.
 * Llama al endpoint local de FastAPI para evitar bloqueos por CORS o errores 'Failed to fetch' de Traccar.
 */
export const obtenerPosicionesGps = async () => {
  try {
    const response = await axiosClient.get('/gps/posiciones-locales');
    return response.data;
  } catch (error) {
    console.error('Error al obtener posiciones GPS de Traccar desde FastAPI:', error);
    return [];
  }
};

/**
 * Obtiene la posición GPS de un taxi específico por su identificador (Ej: 'Taxi1')
 */
export const obtenerPosicionTaxi = async (uniqueId) => {
  try {
    const response = await axiosClient.get(`/gps/posicion/${uniqueId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener posición del taxi ${uniqueId}:`, error);
    return null;
  }
};