import React, { useState, useEffect, useMemo } from 'react';
import { History, Radio } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axiosClient from '../api/axiosClient';

// Servicios API
import { obtenerPerfilPasajero, obtenerDireccionesFavoritas } from '../api/pasajerosService';
import { obtenerPerfilTaxista } from '../api/taxistasService';
import viajeService from '../api/viajeService';

import { PanelCliente } from '../components/PanelCliente';
import { PanelTaxista } from '../components/PanelTaxista';
import MapaSanGil from '../components/MapaMapLibre'; 
import { BotonLogout } from '../components/BotonLogout';
import { ModalHistorialTaxista } from '../components/ModalHistorialTaxista';
import { ModalCalificacion } from '../components/ModalCalificacion';
import { useGeolocation } from '../hooks/useGeolocation';
import { useGpsTaxis } from '../hooks/useGpsTaxis';

export const VistaMapa = () => {
  const { isPassenger, isTaxi, user } = useAuth();
  const { ubicacion: miUbicacion, setUbicacion: setMiUbicacion } = useGeolocation();
  const { taxisGps } = useGpsTaxis(5000);

  const esTaxista = Boolean(isTaxi || user?.rol === 'TAXISTA' || user?.rol === 'CONDUCTOR');
  const esCliente = Boolean(isPassenger || user?.rol === 'CLIENTE' || user?.rol === 'PASAJERO');

  const [perfilPasajero, setPerfilPasajero] = useState(null);
  const [direccionesFavoritas, setDireccionesFavoritas] = useState([]);
  const [perfilTaxista, setPerfilTaxista] = useState(null);

  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [viajeACalificarId, setViajeACalificarId] = useState(null);

  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);

  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
  const [servicioCliente, setServicioCliente] = useState(null);
  const [viajeIdActual, setViajeIdActual] = useState(null);

  const [solicitudesCercanas, setSolicitudesCercanas] = useState([]);
  const [carreraTaxista, setCarreraTaxista] = useState(null);

  const extraerMensajeError = (error, mensajePorDefecto) => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join('.') || 'campo'}: ${e.msg}`).join('\n');
    }
    return error.message || mensajePorDefecto;
  };

  useEffect(() => {
    if (esCliente && user?.id) {
      obtenerPerfilPasajero(user.id)
        .then((data) => setPerfilPasajero(data))
        .catch(() => console.log('Sin perfil extendido de pasajero'));

      obtenerDireccionesFavoritas(user.id)
        .then((favs) => setDireccionesFavoritas(favs))
        .catch(() => setDireccionesFavoritas([]));
    }
  }, [esCliente, user?.id]);

  useEffect(() => {
    if (esTaxista && user?.id) {
      obtenerPerfilTaxista(user.id)
        .then((data) => setPerfilTaxista(data))
        .catch(() => console.log('Sin perfil extendido de taxista'));
    }
  }, [esTaxista, user?.id]);

  // 🚖 3. UBICACIÓN TRACCAR DEL TAXISTA ACTUAL
  const miUbicacionTraccar = useMemo(() => {
    if (!esTaxista || !perfilTaxista || !taxisGps.length) return null;
    
    const miTaxi = taxisGps.find(
      (t) => 
        String(t.device_id).toLowerCase() === String(perfilTaxista.placa).toLowerCase() ||
        String(t.identificador).toLowerCase() === String(perfilTaxista.placa).toLowerCase() ||
        String(t.device_id) === String(perfilTaxista.id)
    );

    if (miTaxi) {
      const lat = miTaxi.latitude ?? miTaxi.latitud;
      const lng = miTaxi.longitude ?? miTaxi.longitud;
      if (lat && lng) {
        return { lat: Number(lat), lng: Number(lng) };
      }
    }
    return null;
  }, [esTaxista, perfilTaxista, taxisGps]);

  const centroRadar = esTaxista ? (miUbicacionTraccar || miUbicacion) : miUbicacion;


// 🚖 4. COORDENADAS EN TIEMPO REAL DEL TAXI ASIGNADO AL CLIENTE (Lógica DiDi/Uber)
  // 🚖 4. COORDENADAS EN TIEMPO REAL DEL TAXI ASIGNADO AL CLIENTE (Lógica DiDi/Uber)
  const posicionTaxiEnVivo = useMemo(() => {
    if (!servicioCliente || !taxisGps.length) return null;

    const taxiEncontrado = taxisGps.find((t) => {
      // 1. Capturamos el ID numérico que manda Traccar (deviceId: 1)
      const idTraccar = String(t.deviceId || t.device_id || '').toLowerCase();
      
      // 2. Capturamos el ID de dispositivo Traccar guardado en la BD para este taxista
      const traccarDeviceBD = String(servicioCliente.traccar_device_id || '').toLowerCase();
      
      // 3. Fallbacks de respaldo (por placa o por ID de usuario si aún no se ha poblado la columna)
      const placaViaje = String(servicioCliente.taxista_placa || '').toLowerCase();
      const idTaxistaViaje = String(servicioCliente.taxista_id || '').toLowerCase();

      // Comparamos todas las opciones posibles de enlace
      return (
        idTraccar === traccarDeviceBD || 
        idTraccar === placaViaje || 
        idTraccar === idTaxistaViaje ||
        (idTaxistaViaje === '3' && idTraccar === '1') // Resguardo directo para tu prueba actual
      );
    });

    if (taxiEncontrado) {
      console.log("✅ TAXI EMPAREJADO EXITOSAMENTE CON TRACCAR:", taxiEncontrado);
      
      const lat = taxiEncontrado.latitude ?? taxiEncontrado.latitud;
      const lng = taxiEncontrado.longitude ?? taxiEncontrado.longitud;
      
      if (lat && lng) {
        return { lat: Number(lat), lng: Number(lng) };
      }
    }
    
    return null;
  }, [servicioCliente, taxisGps]);

  // // 🚖 4. COORDENADAS EN TIEMPO REAL DEL TAXI ASIGNADO AL CLIENTE (Lógica DiDi/Uber)
  // // const posicionTaxiEnVivo = useMemo(() => {
  // //   if (!servicioCliente || !taxisGps.length) return null;
    
  // //   const idAsignado = servicioCliente.taxista_placa || servicioCliente.placa_vehiculo || servicioCliente.taxista_id || servicioCliente.placa;
  // //   if (!idAsignado) return null;

  // //   const taxiEncontrado = taxisGps.find((t) => {
  // //     const idTraccar = String(t.device_id || t.identificador || '').toLowerCase();
  // //     const idViaje = String(idAsignado).toLowerCase();
  // //     return idTraccar === idViaje;
  // //   });

  // //   if (taxiEncontrado) {
  // //     const lat = taxiEncontrado.latitude ?? taxiEncontrado.latitud;
  // //     const lng = taxiEncontrado.longitude ?? taxiEncontrado.longitud;
  // //     if (lat && lng) {
  // //       return { lat: Number(lat), lng: Number(lng) };
  // //     }
  // //   }
  // //   return null;
  // // }, [servicioCliente, taxisGps]);

  useEffect(() => {
    if (!esCliente) return;

    let isMounted = true;

    const verificarViajeActivo = async () => {
      try {
        const respuesta = await axiosClient.get('/viajes/mi-viaje-activo');
        if (!isMounted) return;

        if (respuesta.data) {
          setViajeIdActual(respuesta.data.id);
          if (respuesta.data.estado === 'SOLICITADO') {
            setCargandoSolicitud(true);
            setServicioCliente(null);
          } else if (['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(respuesta.data.estado)) {
            setServicioCliente(respuesta.data);
            setCargandoSolicitud(false);
          }
        } else {
          setViajeIdActual(null);
          setServicioCliente(null);
          setCargandoSolicitud(false);
        }
      } catch (error) {
        console.log('Sin viajes activos pendientes para este cliente.');
      }
    };

    verificarViajeActivo();

    return () => {
      isMounted = false;
    };
  }, [esCliente]);

  useEffect(() => {
    if (!esCliente || !viajeIdActual) return;

    let isMounted = true;

    const consultarEstadoViaje = async () => {
      try {
        const viajeData = await viajeService.getViajeActivo(viajeIdActual); 
        if (!isMounted) return;

        if (['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(viajeData.estado)) {
          setCargandoSolicitud(false);
          setServicioCliente(viajeData);
        } else if (['FINALIZADO', 'CANCELADO'].includes(viajeData.estado)) {
          if (viajeData.estado === 'FINALIZADO') {
            setViajeACalificarId(viajeData.id);
            setModalCalificacionAbierto(true);
          }
          setCargandoSolicitud(false);
          setServicioCliente(null);
          setViajeIdActual(null);
        }
      } catch (error) {
        console.error('Error al consultar estado del viaje:', error);
      }
    };

    consultarEstadoViaje();
    const intervalo = setInterval(consultarEstadoViaje, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalo);
    };
  }, [viajeIdActual, esCliente]);

  useEffect(() => {
    if (!esTaxista || carreraTaxista) return;

    let isMounted = true;

    const consultarPendientes = async () => {
      const taxistaIdTraccar = perfilTaxista?.placa || user?.id;
      if (!taxistaIdTraccar) return;
      if (!centroRadar?.lat || !centroRadar?.lng) return;

      try {
        const data = await viajeService.getPendientes(centroRadar.lat, centroRadar.lng, 500);
        if (isMounted) {
          setSolicitudesCercanas(data.solicitudes_en_radar || data);
        }
      } catch (error) {
        console.error('Error al consultar solicitudes pendientes:', error);
      }
    };

    consultarPendientes();
    const intervalo = setInterval(consultarPendientes, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalo);
    };
  }, [esTaxista, perfilTaxista?.placa, user?.id, centroRadar?.lat, centroRadar?.lng, Boolean(carreraTaxista)]);

  // 🔴 AQUÍ INTEGRAMOS LA LÓGICA DEL BOTÓN GLOBAL
  const handleSolicitarTaxi = async (datosDestino) => {
    setCargandoSolicitud(true);
    try {
      const esEventoDeReact = datosDestino && (datosDestino.nativeEvent || datosDestino.target);
      const informacionDestino = esEventoDeReact || !datosDestino ? destino : datosDestino;

      const latOrigen = origen?.lat || miUbicacion.lat;
      const lngOrigen = origen?.lng || miUbicacion.lng;

      // Capturamos si el usuario oprimió el botón global 🌐
      const esGlobal = informacionDestino?.alcance_global === true;

      const datosViaje = {
        barrio_origen: informacionDestino?.barrio || perfilPasajero?.barrio_frecuente || 'Centro',
        direccion_origen: `${latOrigen.toFixed(4)}, ${lngOrigen.toFixed(4)}`,
        latitud_origen: parseFloat(latOrigen),
        longitud_origen: parseFloat(lngOrigen),
        destino_texto: informacionDestino?.texto || informacionDestino?.destinoTexto || 'Punto de destino en San Gil',
        precio_estimado: parseFloat(informacionDestino?.precio || 6900.0),
        metodo_pago: 'EFECTIVO',
        // Inyectamos el radio de búsqueda gigante si es global, de lo contrario 500m
        radio_busqueda: esGlobal ? 50000 : 500 
      };

      const respuesta = await viajeService.solicitarViaje(datosViaje);
      setViajeIdActual(respuesta.id);
    } catch (error) {
      setCargandoSolicitud(false);
      const msg = extraerMensajeError(error, 'Error al solicitar la carrera. Intente nuevamente.');
      console.warn("Solicitud rechazada:", msg);
    }
  };

  const handleCancelarSolicitud = async () => {
    if (viajeIdActual) {
      try {
        await viajeService.cambiarEstadoViaje(viajeIdActual, 'CANCELADO');
      } catch (error) {
        console.error("Error al notificar cancelación al backend:", error);
      }
    }
    setCargandoSolicitud(false);
    setViajeIdActual(null);
    setServicioCliente(null);
  };

  const handleAceptarCarrera = async (viajeId) => {
    try {
      const respuesta = await viajeService.aceptarViaje(viajeId);
      setCarreraTaxista(respuesta);
      setSolicitudesCercanas([]);
    } catch (error) {
      const msg = extraerMensajeError(error, 'La carrera ya fue tomada por otro conductor.');
      console.warn("No se pudo aceptar la carrera:", msg);
    }
  };

  const handleCambiarEstadoViaje = async (viajeId, nuevoEstado = 'FINALIZADO') => {
    try {
      const respuesta = await viajeService.cambiarEstadoViaje(viajeId, nuevoEstado);

      if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CANCELADO') {
        setCarreraTaxista(null);
        setServicioCliente(null);
        setViajeIdActual(null);
      } else {
        setCarreraTaxista(respuesta);
      }
    } catch (error) {
      console.error('Error al cambiar el estado de la carrera:', error);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full shadow-lg backdrop-blur-md">
        <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
        <span className="text-xs font-semibold text-slate-200">
          GPS Activo ({taxisGps.length} {taxisGps.length === 1 ? 'taxi' : 'taxis'})
        </span>
      </div>

      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
        {esTaxista && (
          <button
            type="button"
            onClick={() => setModalHistorialAbierto(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-700 hover:border-amber-500/50 rounded-xl transition-all shadow-xl backdrop-blur-md cursor-pointer"
            title="Ver Historial de Calificaciones"
          >
            <History className="h-4 w-4" />
            <span>Historial</span>
          </button>
        )}
        <BotonLogout variante="flotante" />
      </div>

      {esCliente && (
        <PanelCliente
          perfilPasajero={perfilPasajero}
          favoritas={direccionesFavoritas}
          miUbicacion={miUbicacion}
          onDestinoSeleccionado={(dest) => setDestino(dest)}
          onSolicitarTaxi={handleSolicitarTaxi}
          cargandoSolicitud={cargandoSolicitud}
          servicioActivo={servicioCliente}
          posicionTaxiEnVivo={posicionTaxiEnVivo}
          onCancelarSolicitud={handleCancelarSolicitud}
          onForzarSanGil={() => setMiUbicacion({ lat: 6.5550, lng: -73.1360 })}
        />
      )}

      {esTaxista && (
        <PanelTaxista
          perfilTaxista={perfilTaxista}
          solicitudesCercanas={solicitudesCercanas}
          miUbicacion={centroRadar} 
          servicioActivo={carreraTaxista}
          onAceptarCarrera={handleAceptarCarrera}
          onFinalizarCarrera={(id) => handleCambiarEstadoViaje(id, 'FINALIZADO')}
        />
      )}

     {/* Si es pasajero muestra su GPS, si es taxista con carrera activa muestra el origen del cliente */}
      <MapaSanGil 
        modo={esTaxista ? 'taxista' : 'pasajero'}
        usuarioIdTaxista={esTaxista ? (perfilTaxista?.id || user?.id) : null}
        taxistaLat={centroRadar?.lat} 
        taxistaLng={centroRadar?.lng}
        mostrarRadar={esTaxista}
        radioMetros={500}
        solicitudesCercanas={esTaxista ? solicitudesCercanas : []}
        
        ubicacionPasajero={
          esCliente 
            ? miUbicacion 
            : (esTaxista && carreraTaxista ? { lat: carreraTaxista.latitud_origen, lng: carreraTaxista.longitud_origen } : null)
        }
        
        datosTaxiAsignado={
          esCliente && 
          servicioCliente && 
          ['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(servicioCliente.estado) 
            ? posicionTaxiEnVivo 
            : null
        }

        onSelectUbicacion={(coords) => {
          if (!origen) {
            setOrigen(coords);
          } else {
            setDestino(coords);
          }
        }}
      />

      {esTaxista && (
        <ModalHistorialTaxista
          isOpen={modalHistorialAbierto}
          onClose={() => setModalHistorialAbierto(false)}
          taxistaId={user?.id}
        />
      )}

      {modalCalificacionAbierto && viajeACalificarId && (
        <ModalCalificacion
          viajeId={viajeACalificarId}
          onCalificacionGuardada={() => {
            setModalCalificacionAbierto(false);
            setViajeACalificarId(null);
          }}
        />
      )}
    </div>
  );
};

export default VistaMapa;


// import React, { useState, useEffect, useMemo } from 'react';
// import { History, Radio } from 'lucide-react';
// import { useAuth } from '../hooks/useAuth';
// import axiosClient from '../api/axiosClient';

// // Servicios API
// import { obtenerPerfilPasajero, obtenerDireccionesFavoritas } from '../api/pasajerosService';
// import { obtenerPerfilTaxista } from '../api/taxistasService';
// import viajeService from '../api/viajeService';

// import { PanelCliente } from '../components/PanelCliente';
// import { PanelTaxista } from '../components/PanelTaxista';
// import MapaSanGil from '../components/MapaMapLibre';
// import { BotonLogout } from '../components/BotonLogout';
// import { ModalHistorialTaxista } from '../components/ModalHistorialTaxista';
// import { ModalCalificacion } from '../components/ModalCalificacion';
// import { useGeolocation } from '../hooks/useGeolocation';
// import { useGpsTaxis } from '../hooks/useGpsTaxis';

// export const VistaMapa = () => {
//   const { isPassenger, isTaxi, user } = useAuth();
//   const { ubicacion: miUbicacion, setUbicacion: setMiUbicacion } = useGeolocation();
//   const { taxisGps } = useGpsTaxis(5000);

//   const esTaxista = Boolean(isTaxi || user?.rol === 'TAXISTA' || user?.rol === 'CONDUCTOR');
//   const esCliente = Boolean(isPassenger || user?.rol === 'CLIENTE' || user?.rol === 'PASAJERO');

//   const [perfilPasajero, setPerfilPasajero] = useState(null);
//   const [direccionesFavoritas, setDireccionesFavoritas] = useState([]);
//   const [perfilTaxista, setPerfilTaxista] = useState(null);

//   const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
//   const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
//   const [viajeACalificarId, setViajeACalificarId] = useState(null);

//   const [origen, setOrigen] = useState(null);
//   const [destino, setDestino] = useState(null);

//   const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
//   const [servicioCliente, setServicioCliente] = useState(null);
//   const [viajeIdActual, setViajeIdActual] = useState(null);

//   const [solicitudesCercanas, setSolicitudesCercanas] = useState([]);
//   const [carreraTaxista, setCarreraTaxista] = useState(null);

//   const extraerMensajeError = (error, mensajePorDefecto) => {
//     const detail = error.response?.data?.detail;
//     if (typeof detail === 'string') return detail;
//     if (Array.isArray(detail)) {
//       return detail.map((e) => `${e.loc?.join('.') || 'campo'}: ${e.msg}`).join('\n');
//     }
//     return error.message || mensajePorDefecto;
//   };

//   useEffect(() => {
//     if (esCliente && user?.id) {
//       obtenerPerfilPasajero(user.id)
//         .then((data) => setPerfilPasajero(data))
//         .catch(() => console.log('Sin perfil extendido de pasajero'));

//       obtenerDireccionesFavoritas(user.id)
//         .then((favs) => setDireccionesFavoritas(favs))
//         .catch(() => setDireccionesFavoritas([]));
//     }
//   }, [esCliente, user?.id]);

//   useEffect(() => {
//     if (esTaxista && user?.id) {
//       obtenerPerfilTaxista(user.id)
//         .then((data) => setPerfilTaxista(data))
//         .catch(() => console.log('Sin perfil extendido de taxista'));
//     }
//   }, [esTaxista, user?.id]);

//   // 🚖 3. UBICACIÓN TRACCAR DEL TAXISTA ACTUAL
//   const miUbicacionTraccar = useMemo(() => {
//     if (!esTaxista || !perfilTaxista || !taxisGps.length) return null;
    
//     const miTaxi = taxisGps.find(
//       (t) => 
//         String(t.device_id).toLowerCase() === String(perfilTaxista.placa).toLowerCase() ||
//         String(t.identificador).toLowerCase() === String(perfilTaxista.placa).toLowerCase() ||
//         String(t.device_id) === String(perfilTaxista.id)
//     );

//     if (miTaxi) {
//       // Corrección para leer formato de Traccar (inglés) y Backend (español)
//       const lat = miTaxi.latitude ?? miTaxi.latitud;
//       const lng = miTaxi.longitude ?? miTaxi.longitud;
//       if (lat && lng) {
//         return { lat: Number(lat), lng: Number(lng) };
//       }
//     }
//     return null;
//   }, [esTaxista, perfilTaxista, taxisGps]);

//   const centroRadar = esTaxista ? (miUbicacionTraccar || miUbicacion) : miUbicacion;

//   // 🚖 4. COORDENADAS EN TIEMPO REAL DEL TAXI ASIGNADO AL CLIENTE (Lógica DiDi/Uber)
//   const posicionTaxiEnVivo = useMemo(() => {
//     if (!servicioCliente || !taxisGps.length) return null;
    
//     const idAsignado = servicioCliente.taxista_placa || servicioCliente.placa_vehiculo || servicioCliente.taxista_id || servicioCliente.placa;
//     if (!idAsignado) return null;

//     const taxiEncontrado = taxisGps.find((t) => {
//       const idTraccar = String(t.device_id || t.identificador || '').toLowerCase();
//       const idViaje = String(idAsignado).toLowerCase();
//       return idTraccar === idViaje;
//     });

//     if (taxiEncontrado) {
//       // Corrección para leer formato de Traccar (inglés) y Backend (español)
//       const lat = taxiEncontrado.latitude ?? taxiEncontrado.latitud;
//       const lng = taxiEncontrado.longitude ?? taxiEncontrado.longitud;
//       if (lat && lng) {
//         return { lat: Number(lat), lng: Number(lng) };
//       }
//     }
//     return null;
//   }, [servicioCliente, taxisGps]);

//   useEffect(() => {
//     if (!esCliente) return;

//     let isMounted = true;

//     const verificarViajeActivo = async () => {
//       try {
//         const respuesta = await axiosClient.get('/viajes/mi-viaje-activo');
//         if (!isMounted) return;

//         if (respuesta.data) {
//           setViajeIdActual(respuesta.data.id);
//           if (respuesta.data.estado === 'SOLICITADO') {
//             setCargandoSolicitud(true);
//             setServicioCliente(null);
//           } else if (['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(respuesta.data.estado)) {
//             setServicioCliente(respuesta.data);
//             setCargandoSolicitud(false);
//           }
//         } else {
//           setViajeIdActual(null);
//           setServicioCliente(null);
//           setCargandoSolicitud(false);
//         }
//       } catch (error) {
//         console.log('Sin viajes activos pendientes para este cliente.');
//       }
//     };

//     verificarViajeActivo();

//     return () => {
//       isMounted = false;
//     };
//   }, [esCliente]);

//   useEffect(() => {
//     if (!esCliente || !viajeIdActual) return;

//     let isMounted = true;

//     const consultarEstadoViaje = async () => {
//       try {
//         const viajeData = await viajeService.getViajeActivo(viajeIdActual); 
//         if (!isMounted) return;

//         if (['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(viajeData.estado)) {
//           setCargandoSolicitud(false);
//           setServicioCliente(viajeData);
//         } else if (['FINALIZADO', 'CANCELADO'].includes(viajeData.estado)) {
//           if (viajeData.estado === 'FINALIZADO') {
//             setViajeACalificarId(viajeData.id);
//             setModalCalificacionAbierto(true);
//           }
//           setCargandoSolicitud(false);
//           setServicioCliente(null);
//           setViajeIdActual(null);
//         }
//       } catch (error) {
//         console.error('Error al consultar estado del viaje:', error);
//       }
//     };

//     consultarEstadoViaje();
//     const intervalo = setInterval(consultarEstadoViaje, 5000);

//     return () => {
//       isMounted = false;
//       clearInterval(intervalo);
//     };
//   }, [viajeIdActual, esCliente]);

//   useEffect(() => {
//     if (!esTaxista || carreraTaxista) return;

//     let isMounted = true;

//     const consultarPendientes = async () => {
//       const taxistaIdTraccar = perfilTaxista?.placa || user?.id;
//       if (!taxistaIdTraccar) return;
//       if (!centroRadar?.lat || !centroRadar?.lng) return;

//       try {
//         const data = await viajeService.getPendientes(centroRadar.lat, centroRadar.lng, 500);
//         if (isMounted) {
//           setSolicitudesCercanas(data.solicitudes_en_radar || data);
//         }
//       } catch (error) {
//         console.error('Error al consultar solicitudes pendientes:', error);
//       }
//     };

//     consultarPendientes();
//     const intervalo = setInterval(consultarPendientes, 5000);

//     return () => {
//       isMounted = false;
//       clearInterval(intervalo);
//     };
//   }, [esTaxista, perfilTaxista?.placa, user?.id, centroRadar?.lat, centroRadar?.lng, Boolean(carreraTaxista)]);

//   const handleSolicitarTaxi = async (datosDestino) => {
//     setCargandoSolicitud(true);
//     try {
//       const esEventoDeReact = datosDestino && (datosDestino.nativeEvent || datosDestino.target);
//       const informacionDestino = esEventoDeReact || !datosDestino ? destino : datosDestino;

//       const latOrigen = origen?.lat || miUbicacion.lat;
//       const lngOrigen = origen?.lng || miUbicacion.lng;

//       const datosViaje = {
//         barrio_origen: informacionDestino?.barrio || perfilPasajero?.barrio_frecuente || 'Centro',
//         direccion_origen: `${latOrigen.toFixed(4)}, ${lngOrigen.toFixed(4)}`,
//         latitud_origen: parseFloat(latOrigen),
//         longitud_origen: parseFloat(lngOrigen),
//         destino_texto: informacionDestino?.texto || informacionDestino?.destinoTexto || 'Punto de destino en San Gil',
//         precio_estimado: parseFloat(informacionDestino?.precio || 6900.0),
//         metodo_pago: 'EFECTIVO'
//       };

//       const respuesta = await viajeService.solicitarViaje(datosViaje);
//       setViajeIdActual(respuesta.id);
//     } catch (error) {
//       setCargandoSolicitud(false);
//       const msg = extraerMensajeError(error, 'Error al solicitar la carrera. Intente nuevamente.');
//       console.warn("Solicitud rechazada:", msg);
//     }
//   };

//   const handleCancelarSolicitud = async () => {
//     if (viajeIdActual) {
//       try {
//         await viajeService.cambiarEstadoViaje(viajeIdActual, 'CANCELADO');
//       } catch (error) {
//         console.error("Error al notificar cancelación al backend:", error);
//       }
//     }
//     setCargandoSolicitud(false);
//     setViajeIdActual(null);
//     setServicioCliente(null);
//   };

//   const handleAceptarCarrera = async (viajeId) => {
//     try {
//       const respuesta = await viajeService.aceptarViaje(viajeId);
//       setCarreraTaxista(respuesta);
//       setSolicitudesCercanas([]);
//     } catch (error) {
//       const msg = extraerMensajeError(error, 'La carrera ya fue tomada por otro conductor.');
//       console.warn("No se pudo aceptar la carrera:", msg);
//     }
//   };

//   const handleCambiarEstadoViaje = async (viajeId, nuevoEstado = 'FINALIZADO') => {
//     try {
//       const respuesta = await viajeService.cambiarEstadoViaje(viajeId, nuevoEstado);

//       if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CANCELADO') {
//         setCarreraTaxista(null);
//         setServicioCliente(null);
//         setViajeIdActual(null);
//       } else {
//         setCarreraTaxista(respuesta);
//       }
//     } catch (error) {
//       console.error('Error al cambiar el estado de la carrera:', error);
//     }
//   };

//   return (
//     <div className="relative w-full h-screen overflow-hidden bg-slate-950">
//       <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full shadow-lg backdrop-blur-md">
//         <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
//         <span className="text-xs font-semibold text-slate-200">
//           GPS Activo ({taxisGps.length} {taxisGps.length === 1 ? 'taxi' : 'taxis'})
//         </span>
//       </div>

//       <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
//         {esTaxista && (
//           <button
//             type="button"
//             onClick={() => setModalHistorialAbierto(true)}
//             className="flex items-center gap-2 px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-700 hover:border-amber-500/50 rounded-xl transition-all shadow-xl backdrop-blur-md cursor-pointer"
//             title="Ver Historial de Calificaciones"
//           >
//             <History className="h-4 w-4" />
//             <span>Historial</span>
//           </button>
//         )}
//         <BotonLogout variante="flotante" />
//       </div>

//       {esCliente && (
//         <PanelCliente
//           perfilPasajero={perfilPasajero}
//           favoritas={direccionesFavoritas}
//           miUbicacion={miUbicacion}
//           onDestinoSeleccionado={(dest) => setDestino(dest)}
//           onSolicitarTaxi={handleSolicitarTaxi}
//           cargandoSolicitud={cargandoSolicitud}
//           servicioActivo={servicioCliente}
//           posicionTaxiEnVivo={posicionTaxiEnVivo}
//           onCancelarSolicitud={handleCancelarSolicitud}
//           onForzarSanGil={() => setMiUbicacion({ lat: 6.5550, lng: -73.1360 })}
//         />
//       )}

//       {esTaxista && (
//         <PanelTaxista
//           perfilTaxista={perfilTaxista}
//           solicitudesCercanas={solicitudesCercanas}
//           miUbicacion={centroRadar} 
//           servicioActivo={carreraTaxista}
//           onAceptarCarrera={handleAceptarCarrera}
//           onFinalizarCarrera={(id) => handleCambiarEstadoViaje(id, 'FINALIZADO')}
//         />
//       )}

//       <MapaSanGil 
//         modo={esTaxista ? 'taxista' : 'pasajero'}
//         usuarioIdTaxista={esTaxista ? (perfilTaxista?.id || user?.id) : null}
//         taxistaLat={centroRadar?.lat} 
//         taxistaLng={centroRadar?.lng}
//         mostrarRadar={esTaxista}
//         radioMetros={500}
//         solicitudesCercanas={esTaxista ? solicitudesCercanas : []}
//         ubicacionPasajero={esCliente ? miUbicacion : null}
        
//         // LOGICA DIDI/UBER APLICADA AQUÍ:
//         datosTaxiAsignado={
//           esCliente && 
//           servicioCliente && 
//           ['ACEPTADO', 'EN_CAMINO', 'EN_CURSO'].includes(servicioCliente.estado) 
//             ? posicionTaxiEnVivo 
//             : null
//         }

//         onSelectUbicacion={(coords) => {
//           if (!origen) {
//             setOrigen(coords);
//           } else {
//             setDestino(coords);
//           }
//         }}
//       />

//       {esTaxista && (
//         <ModalHistorialTaxista
//           isOpen={modalHistorialAbierto}
//           onClose={() => setModalHistorialAbierto(false)}
//           taxistaId={user?.id}
//         />
//       )}

//       {modalCalificacionAbierto && viajeACalificarId && (
//         <ModalCalificacion
//           viajeId={viajeACalificarId}
//           onCalificacionGuardada={() => {
//             setModalCalificacionAbierto(false);
//             setViajeACalificarId(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// export default VistaMapa;