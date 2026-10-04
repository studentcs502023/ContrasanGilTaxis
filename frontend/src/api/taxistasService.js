import axiosClient from './axiosClient';

// 1. Obtener la información del taxista por usuario_id
export const obtenerPerfilTaxista = async (usuarioId) => {
  try {
    const respuesta = await axiosClient.get(`/taxistas/${usuarioId}`);
    return respuesta.data;
  } catch (error) {
    console.error('Error al obtener perfil del taxista:', error);
    throw error;
  }
};

// 2. Cambiar disponibilidad (disponible, ocupado, inactivo)
export const cambiarEstadoServicio = async (usuarioId, nuevoEstado) => {
  try {
    const respuesta = await axiosClient.patch(`/taxistas/${usuarioId}/estado`, {
      estado_servicio: nuevoEstado,
    });
    return respuesta.data;
  } catch (error) {
    console.error('Error al cambiar el estado de disponibilidad:', error);
    throw error;
  }
};

// 3. Transmitir coordenadas GPS a MariaDB
export const actualizarUbicacionGPS = async (usuarioId, latitud, longitud) => {
  try {
    const respuesta = await axiosClient.patch(`/taxistas/${usuarioId}/ubicacion`, {
      latitud: latitud,
      longitud: longitud,
    });
    return respuesta.data;
  } catch (error) {
    console.error('Error al actualizar la ubicación GPS:', error);
    throw error;
  }
};

// 4. Buscar taxis disponibles cercanos para la vista del Cliente
export const obtenerTaxisCercanos = async (lat, lng, radioMetros = 500) => {
  try {
    const respuesta = await axiosClient.get('/taxistas/cercanos', {
      params: { latitud: lat, longitud: lng, radio_metros: radioMetros },
    });
    return respuesta.data;
  } catch (error) {
    console.error('Error al consultar taxis cercanos:', error);
    return [];
  }
};