import axiosClient from './axiosClient';

// Actualizar datos del usuario o aceptar políticas en el Paso 2
export const updateUsuario = async (usuarioId, datos) => {
  const response = await axiosClient.patch(`/usuarios/actualizar/${usuarioId}`, datos);
  return response.data;
};

// Obtener un usuario por ID (si se requiere)
export const getUsuarioById = async (usuarioId) => {
  const response = await axiosClient.get(`/usuarios/${usuarioId}`);
  return response.data;
};