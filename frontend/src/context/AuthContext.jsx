import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  login as loginService, 
  registro as registroService, 
  getPerfil as getPerfilService, 
  logout as logoutService 
} from '../api/authService';
import { setAccessToken } from '../api/axiosClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay sesión activa mediante token o perfil
  const verifyAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setAccessToken(null);
      setUsuario(null);
      setLoading(false);
      return;
    }

    try {
      // 1. OBLIGATORIO: Asignar el token a la instancia de Axios ANTES de pedir el perfil
      setAccessToken(token);

      // 2. Ahora la petición /api/auth/me enviará la cabecera Authorization: Bearer <TOKEN>
      const userData = await getPerfilService();
      setUsuario(userData);
    } catch (error) {
      // Si el token expiró o es inválido, se remueve
      localStorage.removeItem('token');
      setAccessToken(null);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  // Inicio de sesión
  const login = async (telefono, contrasena, onSuccess) => {
    setLoading(true);
    try {
      const data = await loginService(telefono, contrasena);
      
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        setAccessToken(data.access_token);
      }

      await verifyAuth();

      if (onSuccess) onSuccess();

      return { success: true, data };
    } catch (error) {
      const mensaje = error.response?.data?.detail || 'Error al iniciar sesión.';
      return { success: false, error: mensaje };
    } finally {
      setLoading(false);
    }
  };

  // Registro de usuario
  const registro = async (datosUsuario) => {
    setLoading(true);
    try {
      const data = await registroService(datosUsuario);
      return { success: true, data };
    } catch (error) {
      const mensaje = error.response?.data?.detail || 'Error al completar el registro.';
      return { success: false, error: mensaje };
    } finally {
      setLoading(false);
    }
  };

  // Cierre de sesión
  const logout = async () => {
    setLoading(true);
    try {
      await logoutService();
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error);
    } finally {
      localStorage.removeItem('token');
      setAccessToken(null); // OBLIGATORIO: Limpiar la cabecera en Axios
      setUsuario(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent"></div>
          <p className="animate-pulse font-semibold">Cargando Taxis San Gil...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        user: usuario,
        loading,
        isAuthenticated: !!usuario,
        isTaxi: usuario?.rol === 'TAXISTA',
        isPassenger: usuario?.rol === 'CLIENTE',
        isAdmin: usuario?.rol === 'ADMIN',
        login,
        registro,
        logout,
        reloadProfile: verifyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};