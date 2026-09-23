import axiosClient from './axiosClient';

export const calificacionesService = {
  // Obtener el historial completo de calificaciones y comentarios
  getCalificacionesTaxista: async (taxistaId) => {
    try {
      const response = await axiosClient.get(`/calificaciones/taxista/${taxistaId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener calificaciones del taxista:', error);
      throw error;
    }
  },

  // Obtener el promedio y total
  getPromedioTaxista: async (taxistaId) => {
    try {
      const response = await axiosClient.get(`/calificaciones/taxista/${taxistaId}/promedio`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener el promedio:', error);
      throw error;
    }
  },

  // Enviar una nueva calificación desde el cliente
  crearCalificacion: async (datosCalificacion) => {
    try {
      // datosCalificacion: { viaje_id, puntuacion, comentario }
      // Amoĩ '/calificaciones/crear' iko'ãgua ojuaju hagpua backend rendive
      const response = await axiosClient.post('/calificaciones/crear', datosCalificacion);
      return response.data;
    } catch (error) {
      console.error('Error al crear la calificación:', error);
      throw error;
    }
  }
};

export default calificacionesService;