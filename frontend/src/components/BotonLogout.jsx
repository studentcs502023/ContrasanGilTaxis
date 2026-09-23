import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const BotonLogout = ({ variante = 'flotante', className = '' }) => {
  const { logout } = useAuth();
  const [cargando, setCargando] = useState(false);

  const handleLogout = async () => {
    setCargando(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setCargando(false);
    }
  };

  // Estilo minimalista / icono compacto
  if (variante === 'icono') {
    return (
      <button
        onClick={handleLogout}
        disabled={cargando}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className={`p-2.5 bg-slate-900/80 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-xl transition-all shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-md ${className}`}
      >
        {cargando ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : (
          <LogOut className="h-5 w-5" />
        )}
      </button>
    );
  }

  // Estilo por defecto: Botón flotante para ubicar en la esquina superior derecha del mapa
  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      className={`flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-red-600/20 text-slate-200 hover:text-red-400 border border-slate-800 hover:border-red-500/40 rounded-xl text-xs font-semibold shadow-xl transition-all backdrop-blur-md cursor-pointer ${className}`}
    >
      {cargando ? (
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
      ) : (
        <LogOut className="h-4 w-4 text-red-400" />
      )}
      <span>Salir</span>
    </button>
  );
};

export default BotonLogout;