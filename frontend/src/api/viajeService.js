import axiosClient from './axiosClient';

export const viajeService = {
  // Pasajero solicita un nuevo taxi
  solicitarViaje: async (datosViaje) => {
    const response = await axiosClient.post('/viajes/solicitar', datosViaje);
    return response.data;
  },

  // Consultar estado de una carrera activa
  getViajeActivo: async (viajeId) => {
    const response = await axiosClient.get(`/viajes/${viajeId}`);
    return response.data;
  },

getPendientes: async (lat, lng, radio = 500) => {
  const response = await axiosClient.get('/viajes/pendientes', {
    params: { 
      latitud: lat, 
      longitud: lng, 
      radio_metros: radio 
    }
  });
  return response.data;
},

  // Taxista acepta la carrera
  aceptarViaje: async (viajeId) => {
    const response = await axiosClient.patch(`/viajes/${viajeId}/aceptar`);
    return response.data;
  },

  // Cambiar estado del viaje: EN_CAMINO, EN_CURSO, FINALIZADO, CANCELADO
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

export default viajeService;