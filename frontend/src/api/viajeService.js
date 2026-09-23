import axiosClient from './axiosClient';

export const viajeService = {
  // Pasajero solicita un nuevo taxi (POST /api/viajes/solicitar)
  solicitarViaje: async (datosViaje) => {
    const response = await axiosClient.post('/viajes/solicitar', datosViaje);
    return response.data;
  },

  // Consultar estado de una carrera activa (GET /api/viajes/{viajeId})
  getViajeActivo: async (viajeId) => {
    const response = await axiosClient.get(`/viajes/${viajeId}`);
    return response.data;
  },

  // Taxista consulta carreras pendientes cercanas (GET /api/viajes/pendientes)
  getPendientes: async (lat, lng, radio = 5000) => {
    const response = await axiosClient.get('/viajes/pendientes', {
      params: { latitud: lat, longitud: lng, radio_metros: radio }
    });
    return response.data;
  },

  // Taxista acepta la carrera (PATCH /api/viajes/{viajeId}/aceptar)
  aceptarViaje: async (viajeId) => {
    const response = await axiosClient.patch(`/viajes/${viajeId}/aceptar`);
    return response.data;
  },

  // Cambiar estado del viaje: EN_CAMINO, EN_CURSO, FINALIZADO, CANCELADO (PATCH /api/viajes/{viajeId}/estado)
  cambiarEstadoViaje: async (viajeId, nuevoEstado) => {
    const response = await axiosClient.patch(`/viajes/${viajeId}/estado`, {
      estado: nuevoEstado,
    });
    return response.data;
  },

  // Método auxiliar para finalizar la carrera directamente
  finalizarViaje: async (viajeId) => {
    const response = await axiosClient.patch(`/viajes/${viajeId}/estado`, {
      estado: 'FINALIZADO',
    });
    return response.data;
  },
};

export const viajesService = {
  // Función para consultar las carreras cercanas dentro del radio de 500m
  obtenerSolicitudesRadar: async (lat, lon, radio = 500) => {
    const response = await axiosClient.get('/viajes/radar', {
      params: { lat, lon, radio }
    });
    return response.data;
  }
};

export default viajeService;