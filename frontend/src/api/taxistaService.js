import axiosClient from './axiosClient';

export const taxistaService = {
  // Obtener perfil del taxista por ID
  getPerfil: async (usuarioId) => {
    const response = await axiosClient.get(`/taxistas/${usuarioId}`);
    return response.data;
  },

  // Cambiar estado (disponible, ocupado, inactivo)
  actualizarEstado: async (usuarioId, estado) => {
    const response = await axiosClient.patch(`/taxistas/${usuarioId}/estado`, { estado });
    return response.data;
  },

  // Enviar actualización manual de coordenadas GPS (Fallback HTTP)
  actualizarUbicacion: async (usuarioId, latitud, longitud) => {
    const response = await axiosClient.put(`/taxistas/${usuarioId}/ubicacion`, {
      latitud,
      longitud,
    });
    return response.data;
  },
};