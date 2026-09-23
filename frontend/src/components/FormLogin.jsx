import React, { useState } from 'react';
import { Phone, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Importar useNavigate
import { useAuth } from '../hooks/useAuth';

export const FormLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate(); // 2. Inicializar el hook de navegación

  const [formData, setFormData] = useState({
    telefono: '',
    contrasena: '',
  });

  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);

  // Extrae mensajes de error formateados del backend (FastAPI / Pydantic)
  const extraerError = (error) => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join('.') || 'campo'}: ${e.msg}`).join(' | ');
    }
    return error.message || 'Credenciales incorrectas. Verifica tu teléfono y contraseña.';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMensaje) setErrorMensaje(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMensaje(null);

    if (!formData.telefono || !formData.contrasena) {
      setErrorMensaje('Por favor ingresa tu teléfono y contraseña.');
      return;
    }

    setCargando(true);
    try {
      // Petición al backend con el esquema LoginRequest
      await login({
        telefono: formData.telefono.trim(),
        contrasena: formData.contrasena,
      });

      // 3. Redirección explícita a la vista del mapa tras un inicio de sesión exitoso
      navigate('/mapa', { replace: true });
    } catch (err) {
      setErrorMensaje(extraerError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-white">
      {/* Alerta de error */}
      {errorMensaje && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMensaje}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Teléfono */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Teléfono Móvil
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: 3101234567"
              required
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Botón de Ingreso */}
        <button
          type="submit"
          disabled={cargando}
          className="w-full mt-2 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {cargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              <span>Verificando credenciales...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Iniciar Sesión</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default FormLogin;