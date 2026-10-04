
import React, { useState, useEffect } from 'react';

import { cambiarEstadoServicio } from '../api/taxistasService';

import { obtenerPosicionesGps, obtenerPosicionTaxi } from '../api/traccarService';

import { Car, User, MapPin, ShieldCheck, PhoneCall, CheckCircle, Navigation } from 'lucide-react';



export const PanelTaxista = ({

  perfilTaxista,

  miUbicacion, // Ubicación actual proveniente del radar/Traccar

  solicitudesCercanas = [],

  servicioActivo = null,      

  onAceptarCarrera,

  onFinalizarCarrera

}) => {

  const [estadoActual, setEstadoActual] = useState(perfilTaxista?.estado || 'inactivo');

  const [cargandoEstado, setCargandoEstado] = useState(false);

 

  // Estados para almacenar las posiciones globales que llegan de Traccar

  const [posicionesGpsGlobales, setPosicionesGpsGlobales] = useState([]);



  // Sincronizar el estado local

  useEffect(() => {

    if (perfilTaxista?.estado) {

      setEstadoActual(perfilTaxista.estado.toLowerCase());

    }

  }, [perfilTaxista]);



  // Manejar el cambio de estado (DISPONIBLE / INACTIVO)

  const handleToggleEstado = async () => {

    const taxistaId = perfilTaxista?.id || perfilTaxista?.usuario_id;

    if (!taxistaId) return;



    setCargandoEstado(true);

    const estadoParaBackend = estadoActual === 'disponible' ? 'inactivo' : 'disponible';



    try {

      await cambiarEstadoServicio(taxistaId, estadoParaBackend);

      setEstadoActual(estadoParaBackend);

    } catch (err) {

      console.error('Error al cambiar el estado:', err);

      alert('No se pudo cambiar el estado de disponibilidad.');

    } finally {

      setCargandoEstado(false);

    }

  };



  // Efecto para consultar periódicamente las posiciones de Traccar y mostrarlas en el frontend

  useEffect(() => {

    const consultarDatosTraccar = async () => {

      try {

        // 1. Obtener todas las posiciones generales desde el proxy de FastAPI/Traccar

        const posiciones = await obtenerPosicionesGps();

        console.log('📍 Posiciones GPS generales desde Traccar:', posiciones);

        setPosicionesGpsGlobales(posiciones || []);



        // 2. Opcional: Si el taxista tiene un ID específico, podemos consultar su posición unitaria

        const uniqueId = perfilTaxista?.placa || perfilTaxista?.id;

        if (uniqueId) {

          const posicionTaxiEspecifico = await obtenerPosicionTaxi(uniqueId);

          console.log(`🚗 Posición específica del taxi ${uniqueId}:`, posicionTaxiEspecifico);

        }

      } catch (error) {

        console.error('Error al consultar los servicios de Traccar en el panel:', error);

      }

    };



    // Consulta inicial al montar

    consultarDatosTraccar();



    // Intervalo de actualización cada 5 segundos para tiempo real

    const intervalo = setInterval(consultarDatosTraccar, 5000);



    return () => clearInterval(intervalo);

  }, [perfilTaxista]);



  return (

    <div className="absolute top-4 left-4 right-4 md:left-6 md:w-96 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl text-white space-y-4">

     

      {/* 1. Encabezado y Selector de Estado */}

      <div className="flex items-center justify-between border-b border-slate-800 pb-3">

        <div>

          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">

            <Car className="h-4 w-4 text-amber-400" />

            {perfilTaxista?.conductor_nombre || perfilTaxista?.nombre || 'Conductor'}

          </h3>

          <span className="text-xs text-amber-400 font-mono font-semibold">

            Placa: {perfilTaxista?.placa || '---'}

          </span>

        </div>



        {/* Botón Switch de Estado */}

        <button

          onClick={handleToggleEstado}

          disabled={cargandoEstado || !!servicioActivo}

          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all duration-300 flex items-center gap-2 ${

            estadoActual === 'disponible'

              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'

              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'

          }`}

        >

          <span className={`w-2 h-2 rounded-full ${estadoActual === 'disponible' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />

          {cargandoEstado ? 'Cambiando...' : estadoActual === 'disponible' ? 'EN LÍNEA' : 'DESCONECTADO'}

        </button>

      </div>



      {/* 2. Visualización del Taxi en Vivo y Monitoreo de Traccar */}

      <div className="flex flex-col items-center justify-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 space-y-2">

        <div className="text-center">

          <p className="text-[11px] font-semibold text-amber-400 flex items-center justify-center gap-1">

            <ShieldCheck className="h-3.5 w-3.5" /> GPS Activo - Traccar San Gil

          </p>

          {miUbicacion ? (

            <p className="text-[10px] text-slate-400 font-mono mt-0.5">

              Posición Traccar: {miUbicacion.lat.toFixed(4)}, {miUbicacion.lng.toFixed(4)}

            </p>

          ) : (

            <p className="text-[10px] text-amber-500/80 font-mono mt-0.5 animate-pulse">

              Buscando señal GPS en Traccar...

            </p>

          )}

        </div>



        {/* Consola visual para imprimir las posiciones que llegan de obtenerPosicionesGps */}

        <div className="w-full bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 space-y-1">

          <div className="font-bold text-amber-300 flex justify-between items-center">

            <span>📡 Dispositivos en Traccar:</span>

            <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">

              {posicionesGpsGlobales.length} activos

            </span>

          </div>

          {posicionesGpsGlobales.length > 0 ? (

            <div className="max-h-24 overflow-y-auto space-y-1 font-mono pr-1">

              {posicionesGpsGlobales.map((pos, idx) => (

                <div key={idx} className="flex justify-between items-center border-b border-slate-800/60 pb-1">

                  <span className="text-slate-400">ID: {pos.deviceId || pos.id}</span>

                  <span className="text-emerald-400 font-semibold">

                    {pos.latitude?.toFixed(4)}, {pos.longitude?.toFixed(4)}

                  </span>

                </div>

              ))}

            </div>

          ) : (

            <p className="text-slate-500 italic text-center py-1">Sin posiciones recibidas de Traccar.</p>

          )}

        </div>

      </div>



      {/* 3. VISTA DE SERVICIO EN CURSO */}

      {servicioActivo ? (

        <div className="bg-slate-800/80 border border-emerald-500/40 p-3.5 rounded-xl space-y-3">

          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">

            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">

              <User className="h-4 w-4" /> Cliente Asignado

            </span>

            <span className="text-xs font-mono font-bold text-amber-400">

              ${servicioActivo.precio_estimado || '6,900'} COP

            </span>

          </div>



          <div className="space-y-1.5 text-xs">

            <p className="text-slate-200 font-medium flex items-start gap-1.5">

              <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />

              <span><strong className="text-slate-400">Origen:</strong> {servicioActivo.direccion_origen || 'Origen indicado'}</span>

            </p>

            <p className="text-slate-200 font-medium flex items-start gap-1.5">

              <Navigation className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />

              <span><strong className="text-slate-400">Destino:</strong> {servicioActivo.destino_texto || 'A convenir'}</span>

            </p>

          </div>



          <button

            onClick={() => onFinalizarCarrera && onFinalizarCarrera(servicioActivo.id)}

            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg"

          >

            <CheckCircle className="h-4 w-4" /> Finalizar Carrera

          </button>

        </div>

      ) : (

        /* 4. VISTA DE RADAR DE BÚSQUEDA Y SOLICITUDES CERCANAS */

        <div className="space-y-3">

          <div className="flex items-center justify-between text-xs text-slate-400">

            <span>Solicitudes en Radar (500m)</span>

            <span className="font-bold text-amber-400">{solicitudesCercanas.length} disponibles</span>

          </div>



          {estadoActual !== 'disponible' ? (

            <div className="p-3 bg-slate-800/50 rounded-xl text-center text-xs text-slate-400">

              Conéctate a internet ("EN LÍNEA") para empezar a recibir viajes cercanos en el radar.

            </div>

          ) : solicitudesCercanas.length === 0 ? (

            <div className="p-3 bg-slate-800/50 rounded-xl text-center text-xs text-slate-400 animate-pulse">

              Buscando pasajeros a menos de 500 metros...

            </div>

          ) : (

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">

              {solicitudesCercanas.map((solicitud) => (

                <div key={solicitud.id} className="p-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between">

                  <div className="space-y-0.5">

                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1">

                      <User className="h-3.5 w-3.5 text-blue-400" /> {solicitud.direccion_origen}

                    </div>

                    <div className="text-[10px] text-slate-400">

                      A {solicitud.distancia_metros || 150}m de ti • <span className="text-emerald-400 font-semibold">${solicitud.precio_estimado || '6,900'} COP</span>

                    </div>

                  </div>

                  <button

                    onClick={() => onAceptarCarrera(solicitud.id)}

                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"

                  >

                    Aceptar

                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

      )}

    </div>

  );

};



export default PanelTaxista; 

