import axiosClient from './axiosClient';

// Registro de usuario inicial
export const registro = async (userData) => {
  const payload = {
    nombre: userData.nombre ? userData.nombre.trim() : '',
    telefono: userData.telefono ? userData.telefono.trim() : '',
    email: userData.email && userData.email.trim() !== '' ? userData.email.trim() : null,
    contrasena: userData.contrasena || userData.password || '',
    rol: userData.rol ? userData.rol.toUpperCase() : 'CLIENTE',
    acepto_politicas: Boolean(userData.acepto_politicas),
  };

  const response = await axiosClient.post('/usuarios/crear', payload);
  return response.data;
};

// Inicio de sesión flexible (Soporta objeto o parámetros independientes)
export const login = async (telefonoOObjeto, contrasenaOpcional) => {
  let telefono = '';
  let contrasena = '';

  if (typeof telefonoOObjeto === 'object' && telefonoOObjeto !== null) {
    telefono = telefonoOObjeto.telefono || '';
    contrasena = telefonoOObjeto.contrasena || telefonoOObjeto.password || '';
  } else {
    telefono = telefonoOObjeto || '';
    contrasena = contrasenaOpcional || '';
  }

  const payload = {
    telefono: String(telefono).trim(),
    contrasena: String(contrasena),
  };

  const response = await axiosClient.post('/auth/login', payload);
  return response.data;
};

// Obtener perfil del usuario autenticado actual
export const getPerfil = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

// Cierre de sesión (Notifica al backend para invalidar la sesión / cookie)
export const logout = async () => {
  try {
    await axiosClient.post('/auth/logout');
  } catch (error) {
    console.error('Error al notificar el cierre de sesión al servidor:', error);
  }
};

const authService = {
  registro,
  login,
  getPerfil,
  logout,
};

export default authService;