// src/components/PanelTaxista.jsx
import React, { useState, useEffect } from 'react';
import { Navigation, Flag, MapPin, Radio, Loader2 } from 'lucide-react';
import { viajesService } from '../api/viajeService'; // Asegúrate de tener la función obtenerSolicitudesRadar agregada en tu servicio

export const PanelTaxista = ({
  solicitudes: solicitudesProp = [],
  onAceptarCarrera,
  carreraActiva,
  onCambiarEstadoViaje,
  onUbicacionChange
}) => {
  const [cargando, setCargando] = useState(false);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [carrerasRadar, setCarrerasRadar] = useState([]);
  const [cargandoRadar, setCargandoRadar] = useState(false);

  // 1. Obtener la ubicación GPS del taxista en tiempo real
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const nuevaUbicacion = {
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude
          };
          setMiUbicacion(nuevaUbicacion);

          // Notificar la ubicación al mapa padre si es necesario
          if (onUbicacionChange) {
            onUbicacionChange(nuevaUbicacion);
          }
        },
        (err) => console.error('Error al obtener GPS del taxista:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [onUbicacionChange]);

  // 2. Polling cada 5 segundos al Stored Procedure (/api/viajes/radar) si no hay carrera activa
  useEffect(() => {
    if (carreraActiva || !miUbicacion) return;

    const consultarRadarBackend = async () => {
      try {
        setCargandoRadar(true);
        // Llama al endpoint que ejecuta el Stored Procedure sp_obtener_solicitudes_cercanas
        const respuesta = await viajesService.obtenerSolicitudesRadar(
          miUbicacion.latitud,
          miUbicacion.longitud,
          500 // Radio de 500 metros
        );
        setCarrerasRadar(respuesta || []);
      } catch (error) {
        console.error('Error al consultar el radar de carreras:', error);
      } finally {
        setCargandoRadar(false);
      }
    };

    consultarRadarBackend();
    const intervalId = setInterval(consultarRadarBackend, 5000);

    return () => clearInterval(intervalId);
  }, [miUbicacion, carreraActiva]);

  // Manejar el cambio de estado de la carrera
  const handleCambiarEstado = async (nuevoEstado) => {
    setCargando(true);
    try {
      await onCambiarEstadoViaje(carreraActiva.id, nuevoEstado);
    } catch (error) {
      alert('Error al actualizar el estado del servicio.');
    } finally {
      setCargando(false);
    }
  };

  // Determinar qué lista mostrar (da prioridad a lo que devuelva el radar)
  const listaCarreras = carrerasRadar.length > 0 ? carrerasRadar : solicitudesProp;

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-6 md:w-96 z-10 space-y-3">
      {carreraActiva ? (
        /* TARJETA DE CARRERA ACTIVA */
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-2xl border border-amber-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5 animate-pulse" />
              Estado: {carreraActiva.estado}
            </span>
            <span className="text-xs text-slate-400 font-mono">#{carreraActiva.id}</span>
          </div>

          <div className="space-y-2 text-sm">
            <p><strong className="text-slate-400">Origen:</strong> {carreraActiva.direccion_origen || 'No especificado'}</p>
            <p><strong className="text-slate-400">Destino:</strong> {carreraActiva.destino_texto}</p>
            {carreraActiva.precio_estimado && (
              <p><strong className="text-slate-400">Valor Estimado:</strong> ${carreraActiva.precio_estimado.toLocaleString()}</p>
            )}
          </div>

          <div className="pt-2 space-y-2">
            {carreraActiva.estado === 'ACEPTADO' && (
              <button
                onClick={() => handleCambiarEstado('EN_CURSO')}
                disabled={cargando}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                Iniciar Recorrido
              </button>
            )}

            {(carreraActiva.estado === 'EN_CURSO' || carreraActiva.estado === 'ACEPTADO') && (
              <button
                onClick={() => handleCambiarEstado('FINALIZADO')}
                disabled={cargando}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flag className="h-5 w-5" />}
                Finalizar Carrera 🏁
              </button>
            )}
          </div>
        </div>
      ) : (
        /* LISTA DE SOLICITUDES DISPONIBLES EN EL RADAR (500m) */
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl max-h-80 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
              Radar 500m ({listaCarreras.length})
            </h3>
            {cargandoRadar && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>

          {!miUbicacion ? (
            <p className="text-xs text-slate-400 text-center py-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              Obteniendo señal GPS...
            </p>
          ) : listaCarreras.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Sin carreras a menos de 500 metros...
            </p>
          ) : (
            listaCarreras.map((sol) => (
              <div key={sol.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2 hover:border-amber-500/40 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-400">
                      {sol.barrio_origen || 'Origen registrado'}
                    </p>
                    <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {sol.direccion_origen || sol.destino_texto}
                    </p>
                  </div>
                  {sol.distancia_metros !== undefined && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">
                      a {Math.round(sol.distancia_metros)}m
                    </span>
                  )}
                </div>

                {sol.precio_estimado && (
                  <p className="text-xs font-semibold text-emerald-400">
                    ${sol.precio_estimado.toLocaleString()}
                  </p>
                )}

                <button
                  onClick={() => onAceptarCarrera(sol.id)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Aceptar Carrera
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};