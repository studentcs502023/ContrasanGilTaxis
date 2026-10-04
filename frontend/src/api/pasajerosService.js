import axiosClient from './axiosClient';

// Obtener el perfil del pasajero por su usuario_id
export const obtenerPerfilPasajero = async (usuarioId) => {
  try {
    const respuesta = await axiosClient.get(`/pasajeros/${usuarioId}`);
    return respuesta.data;
  } catch (error) {
    console.error('Error al obtener el perfil del pasajero:', error);
    throw error;
  }
};

// Actualizar el perfil del pasajero (barrio frecuente, etc.)
export const actualizarPerfilPasajero = async (usuarioId, datos) => {
  try {
    const respuesta = await axiosClient.patch(`/pasajeros/actualizar/${usuarioId}`, datos);
    return respuesta.data;
  } catch (error) {
    console.error('Error al actualizar el perfil del pasajero:', error);
    throw error;
  }
};

// Obtener las direcciones favoritas del pasajero
export const obtenerDireccionesFavoritas = async (usuarioId) => {
  try {
    const respuesta = await axiosClient.get(`/pasajeros/${usuarioId}/favoritas`);
    return respuesta.data;
  } catch (error) {
    console.error('Error al obtener direcciones favoritas:', error);
    return [];
  }
};

// Agregar una nueva dirección favorita
export const agregarDireccionFavorita = async (usuarioId, favoritaData) => {
  try {
    const respuesta = await axiosClient.post(`/pasajeros/${usuarioId}/favoritas`, favoritaData);
    return respuesta.data;
  } catch (error) {
    console.error('Error al guardar dirección favorita:', error);
    throw error;
  }
};