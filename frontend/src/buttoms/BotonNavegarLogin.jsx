import React from 'react';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BotonNavegarLogin = ({ variante = 'flotante', className = '' }) => {
  const navigate = useNavigate();

  const handleIrALogin = () => {
    navigate('/login');
  };

  // Variante estilo ícono pequeño
  if (variante === 'icono') {
    return (
      <button
        onClick={handleIrALogin}
        title="Iniciar Sesión"
        aria-label="Iniciar Sesión"
        className={`p-2.5 bg-slate-900/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-700 hover:border-amber-500/50 rounded-xl transition-all shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-md ${className}`}
      >
        <LogIn className="h-5 w-5" />
      </button>
    );
  }

  // Variante por defecto (Botón flotante con texto)
  return (
    <button
      onClick={handleIrALogin}
      className={`flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xl transition-all cursor-pointer ${className}`}
    >
      <LogIn className="h-4 w-4" />
      <span>Iniciar Sesión</span>
    </button>
  );
};

export default BotonNavegarLogin;