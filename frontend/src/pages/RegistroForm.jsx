import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PoliticasModal } from '../components/PoliticasModal';
import BotonNavegarLogin from '../buttoms/BotonNavegarLogin'; 
import { User, Phone, Mail, Lock, Car, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';

export const RegistroForm = ({ onRegistroExitoso }) => {
  const { registro, login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    contrasena: '',
    rol: 'CLIENTE',
    // Campos condicionales para la tabla taxistas
    placa: '',
    modelo_vehiculo: '',
    numero_licencia: ''
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const esTaxista = formData.rol === 'TAXISTA';

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.email.trim() || !formData.contrasena) {
      setErrorMsg('Por favor completa todos los campos obligatorios del usuario.');
      return;
    }

    if (esTaxista && !formData.placa.trim()) {
      setErrorMsg('Debes ingresar la placa del vehículo para registrarte como taxista.');
      return;
    }

    setModalAbierto(true);
  };

  const handleConfirmarRegistro = async () => {
    setModalAbierto(false);
    setCargando(true);
    setErrorMsg('');

    const payload = {
      nombre: formData.nombre.trim(),
      telefono: formData.telefono.trim(),
      email: formData.email.trim().toLowerCase(),
      contrasena: formData.contrasena,
      rol: formData.rol,
      acepto_politicas: true,
      datos_taxista: esTaxista ? {
        placa: formData.placa.trim().toUpperCase(),
        modelo_vehiculo: formData.modelo_vehiculo.trim() || null,
        numero_licencia: formData.numero_licencia.trim() || null
      } : null
    };

    try {
      // 1. Crear usuario en la BD
      const res = await registro(payload);
      
      // Evaluar la respuesta (soporta { success: true, data } o el objeto de usuario directo)
      const usuarioCreado = res?.data || res;
      const esExitoso = res?.success || Boolean(usuarioCreado?.id || usuarioCreado?.telefono);

      if (esExitoso) {
        // 2. AUTO-LOGIN: Iniciar sesión inmediatamente para obtener el token JWT y activar isAuthenticated
        if (login) {
          await login(formData.telefono.trim(), formData.contrasena);
        }

        // Executar callback opcional si fue provisto
        if (onRegistroExitoso) {
          onRegistroExitoso(usuarioCreado);
        }

        // 3. Navegar a la pantalla del mapa
        navigate('/mapa');
      } else {
        setErrorMsg(res?.error || 'Error al completar el registro.');
      }
    } catch (err) {
      console.error('Error durante el proceso de registro/login:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Error en el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white p-6 rounded-2xl shadow-2xl border border-slate-800">
      <h2 className="text-xl font-bold mb-1 text-amber-400 text-center">Crear Cuenta</h2>
      <p className="text-xs text-slate-400 text-center mb-5">Ingresa tus datos para registrarte en Taxis San Gil</p>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-200 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handlePreSubmit} className="space-y-4">
        {/* Nombre Completo */}
        <div>
          <label className="text-xs text-slate-300 block mb-1 font-medium">Nombre Completo *</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              placeholder="Ej: Pedro Gómez"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Teléfono Móvil */}
        <div>
          <label className="text-xs text-slate-300 block mb-1 font-medium">Teléfono Celular *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="tel"
              required
              placeholder="Ej: 3101234567"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Correo Electrónico */}
        <div>
          <label className="text-xs text-slate-300 block mb-1 font-medium">Correo Electrónico *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <label className="text-xs text-slate-300 block mb-1 font-medium">Contraseña *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="password"
              required
              placeholder="******"
              value={formData.contrasena}
              onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Selección de Rol */}
        <div>
          <label className="text-xs text-slate-300 block mb-1 font-medium">Tipo de Usuario *</label>
          <select
            value={formData.rol}
            onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-sm text-amber-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="CLIENTE">Pasajero / Cliente</option>
            <option value="TAXISTA">Conductor / Taxista</option>
          </select>
        </div>

        {/* CAMPOS DESPLEGABLES EXCLUSIVOS PARA TAXISTA */}
        {esTaxista && (
          <div className="p-3 bg-slate-800/80 border border-amber-500/30 rounded-xl space-y-3 mt-2 animate-in fade-in">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Car className="h-4 w-4" /> Datos del Vehículo y Licencia
            </h4>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-medium">Placa del Vehículo *</label>
              <input
                type="text"
                required={esTaxista}
                placeholder="Ej: TKG123"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm uppercase font-mono tracking-wider focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-medium">Modelo / Vehículo (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Hyundai Atos 2018"
                value={formData.modelo_vehiculo}
                onChange={(e) => setFormData({ ...formData, modelo_vehiculo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-medium">N° Licencia de Conducción (Opcional)</label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ej: 1098765432"
                  value={formData.numero_licencia}
                  onChange={(e) => setFormData({ ...formData, numero_licencia: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 pl-8 pr-2 py-2 rounded text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          Continuar al Registro
        </button>
<BotonNavegarLogin />
      </form>

      <PoliticasModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onAccept={handleConfirmarRegistro}
      />
    </div>
  );
};

export default RegistroForm;