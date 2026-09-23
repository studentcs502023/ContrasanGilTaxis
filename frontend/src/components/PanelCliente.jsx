import React, { useState, useRef } from 'react';
import { buscarDireccionSanGil } from '../api/geocodingService';
import { MapPin, Navigation, Search, Loader2, X, Car, Clock, User, PhoneCall } from 'lucide-react';

export const PanelCliente = ({ 
  miUbicacion, 
  onDestinoSeleccionado, 
  onSolicitarTaxi,
  cargandoSolicitud = false, // True cuando está buscando taxista
  servicioActivo = null,      // Objeto con los datos del taxista asignado
  onCancelarSolicitud 
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [destinoConfirmado, setDestinoConfirmado] = useState(null);

  const debounceTimer = useRef(null);

  const handleInputChange = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    if (valor.trim() === '') {
      setDestinoConfirmado(null);
      setSugerencias([]);
      if (onDestinoSeleccionado) onDestinoSeleccionado(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (valor.trim().length >= 3) {
      setCargando(true);
      debounceTimer.current = setTimeout(async () => {
        const resultados = await buscarDireccionSanGil(valor);
        setSugerencias(resultados || []);
        setCargando(false);
      }, 1000); 
    } else {
      setSugerencias([]);
      setCargando(false);
    }
  };

  const seleccionarSugerencia = (lugar) => {
    const nombreLugar = lugar.nombre.split(',')[0];
    setBusqueda(nombreLugar);
    setSugerencias([]);
    setDestinoConfirmado(lugar);
    if (onDestinoSeleccionado) {
      onDestinoSeleccionado({ lat: lugar.lat, lng: lugar.lng, texto: nombreLugar });
    }
  };

  const limpiarDestino = () => {
    setBusqueda('');
    setSugerencias([]);
    setDestinoConfirmado(null);
    if (onDestinoSeleccionado) onDestinoSeleccionado(null);
  };

  const handleConfirmarPedido = () => {
    const textoDestinoFinal = busqueda.trim() !== '' ? busqueda.trim() : 'A convenir';
    const coordsDestino = destinoConfirmado ? { lat: destinoConfirmado.lat, lng: destinoConfirmado.lng } : null;

    if (onSolicitarTaxi) {
      onSolicitarTaxi({
        destinoTexto: textoDestinoFinal,
        destinoCoords: coordsDestino
      });
    }
  };


 // VISTA 1: TAXISTA EN CAMINO (DATOS REALES DE LA BD)
if (servicioActivo) {
  return (
    <div className="absolute top-4 left-4 right-4 md:left-6 md:w-96 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-2xl text-white space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5" /> Taxista en camino
        </span>
        <span className="text-xs text-slate-400 font-mono">#{servicioActivo.id}</span>
      </div>

      {/* Datos reales traídos de MariaDB via GET /api/viajes/{id} */}
      <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
        <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-100">
            {servicioActivo.taxista_nombre || 'Conductor Asignado'}
          </h4>
          <p className="text-xs text-slate-400">
            Placa: <span className="text-amber-400 font-bold">{servicioActivo.taxista_placa || 'Sin asignar'}</span>
          </p>
          {servicioActivo.taxista_telefono && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <PhoneCall className="h-3 w-3 text-slate-400" /> {servicioActivo.taxista_telefono}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

  // VISTA 2: BUSCANDO TAXISTA (LOADING)
  if (cargandoSolicitud) {
    return (
      <div className="absolute top-4 left-4 right-4 md:left-6 md:w-96 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-2xl text-white text-center space-y-4">
        <div className="relative flex justify-center items-center py-2">
          <div className="absolute h-16 w-16 rounded-full border-4 border-amber-400/20 animate-ping" />
          <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
        </div>
        <div>
          <h4 className="font-bold text-base text-slate-100">Buscando taxis cercanos...</h4>
          <p className="text-xs text-slate-400 mt-1">Notificando a los conductores disponibles en San Gil</p>
        </div>
        <button
          onClick={onCancelarSolicitud}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
        >
          Cancelar Solicitud
        </button>
      </div>
    );
  }

  // VISTA 3: FORMULARIO INICIAL DE SOLICITUD
  return (
    <div className="absolute top-4 left-4 right-4 md:left-6 md:w-96 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl text-white">
      <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
        <Navigation className="h-4 w-4" /> Solicitar Taxi
      </h3>

      <div className="space-y-3">
        {/* Origen GPS */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
          <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <div className="text-xs">
            <span className="block text-slate-400 text-[10px] font-semibold uppercase">Tu Origen</span>
            <span className="font-medium text-slate-200">
              {miUbicacion ? `${miUbicacion.lat.toFixed(4)}, ${miUbicacion.lng.toFixed(4)} (GPS Activo)` : 'Obteniendo GPS...'}
            </span>
          </div>
        </div>

        {/* Búsqueda de Destino */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-xl border border-slate-700 focus-within:border-amber-500 transition-colors">
            <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={busqueda}
              onChange={handleInputChange}
              placeholder="¿A dónde vas? (Opcional / A convenir)"
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {cargando && <Loader2 className="h-3 w-3 animate-spin text-amber-400 shrink-0" />}
            {busqueda && !cargando && (
              <button onClick={limpiarDestino} type="button" className="text-slate-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {sugerencias.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-20 max-h-48 overflow-y-auto">
              {sugerencias.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => seleccionarSugerencia(item)}
                  className="p-2.5 hover:bg-slate-700 cursor-pointer text-xs border-b border-slate-700/50 last:border-0 flex items-start gap-2"
                >
                  <Search className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300 line-clamp-2">{item.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          disabled={!miUbicacion}
          onClick={handleConfirmarPedido}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg active:scale-[0.98]"
        >
          {busqueda.trim() === '' ? 'Pedir Taxi (Destino a convenir)' : 'Confirmar y Pedir Taxi'}
        </button>
      </div>
    </div>
  );
};