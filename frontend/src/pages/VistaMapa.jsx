import React, { useState, useEffect } from 'react';
import { Award, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axiosClient from '../api/axiosClient';
import { PanelCliente } from '../components/PanelCliente';
import { PanelTaxista } from '../components/PanelTaxista';
import MapaSanGil from '../components/MapaMapLibre';
import { BotonLogout } from '../components/BotonLogout';
import { ModalHistorialTaxista } from '../components/ModalHistorialTaxista';
import { ModalCalificacion } from '../components/ModalCalificacion';

export const VistaMapa = () => {
  // Obtención del estado de autenticación
  const { isPassenger, isTaxi, user } = useAuth();

  // Definición de roles tolerante a variantes
  const esTaxista = isTaxi || user?.rol === 'TAXISTA' || user?.rol === 'CONDUCTOR';
  const esCliente = isPassenger || user?.rol === 'CLIENTE' || user?.rol === 'PASAJERO';

  // Estado para controlar la apertura del Modal de Historial (Taxista)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);

  // Estados para el Modal de Calificación (Cliente)
  const [modalCalificacionAbierto, setModalCalificacionAbierto] = useState(false);
  const [viajeACalificarId, setViajeACalificarId] = useState(null);

  // Coordenadas geográficas iniciales (San Gil, Santander)
  const [miUbicacion, setMiUbicacion] = useState({ lat: 6.5550, lng: -73.1360 });
  
  // 🟢 CORREGIDO: Declaración de estados para 'origen' y 'destino'
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);

  // Estados correspondientes al Cliente / Pasajero
  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
  const [servicioCliente, setServicioCliente] = useState(null);
  const [viajeIdActual, setViajeIdActual] = useState(null);

  // Estados correspondientes al Taxista / Conductor
  const [solicitudesCercanas, setSolicitudesCercanas] = useState([]);
  const [carreraTaxista, setCarreraTaxista] = useState(null);

  // Helper para extraer mensajes de error limpios
  const extraerMensajeError = (error, mensajePorDefecto) => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join('.') || 'campo'}: ${e.msg}`).join('\n');
    }
    return error.message || mensajePorDefecto;
  };

  // Obtener la geolocalización GPS real en tiempo real
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          const nuevaUbicacion = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
          setMiUbicacion(nuevaUbicacion);
        },
        (error) => console.log('Ubicación por defecto asignada (San Gil):', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 1. Sincronizar viaje activo previo al cargar o recargar la página (F5)
  useEffect(() => {
    if (!esCliente) return;

    const verificarViajeActivo = async () => {
      try {
        const respuesta = await axiosClient.get('/viajes/mi-viaje-activo');
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
        console.log('No hay viajes activos registrados para este usuario.');
      }
    };

    verificarViajeActivo();
  }, [esCliente]);

  // 2. Cliente: Polling continuo para actualizar el estado del viaje
  useEffect(() => {
    if (!esCliente || !viajeIdActual) return;

    const consultarEstadoViaje = async () => {
      try {
        const respuesta = await axiosClient.get(`/viajes/${viajeIdActual}`);
        const viajeData = respuesta.data;

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
        console.error('Error en el polling de consulta del viaje:', error);
      }
    };

    consultarEstadoViaje();
    const intervalo = setInterval(consultarEstadoViaje, 2500);
    return () => clearInterval(intervalo);
  }, [viajeIdActual, esCliente]);

  // 3. Taxista: Consultar periódicamente solicitudes pendientes en un radio cercano
  useEffect(() => {
    if (!esTaxista || carreraTaxista) return;

    const consultarPendientes = async () => {
      if (!miUbicacion?.lat || !miUbicacion?.lng) return;

      try {
        const respuesta = await axiosClient.get('/viajes/pendientes', {
          params: { 
            latitud: Number(miUbicacion.lat), 
            longitud: Number(miUbicacion.lng), 
            radio_metros: 5000 
          }
        });
        setSolicitudesCercanas(respuesta.data);
      } catch (error) {
        console.error('Error al consultar las carreras pendientes:', error);
      }
    };

    consultarPendientes();
    const intervalo = setInterval(consultarPendientes, 3000);
    return () => clearInterval(intervalo);
  }, [esTaxista, miUbicacion, carreraTaxista]);

  // Función: El cliente envía la solicitud de taxi
  const handleSolicitarTaxi = async (datosDestino) => {
    setCargandoSolicitud(true);
    try {
      const esEventoDeReact = datosDestino && (datosDestino.nativeEvent || datosDestino.target);
      const informacionDestino = esEventoDeReact || !datosDestino ? destino : datosDestino;

      // Usar coordenadas de origen si el usuario hizo clic en el mapa, o la ubicación GPS por defecto
      const latOrigen = origen?.lat || miUbicacion.lat;
      const lngOrigen = origen?.lng || miUbicacion.lng;

      const datosViaje = {
        barrio_origen: informacionDestino?.barrio || 'Centro',
        direccion_origen: `${latOrigen.toFixed(4)}, ${lngOrigen.toFixed(4)}`,
        latitud_origen: parseFloat(latOrigen),
        longitud_origen: parseFloat(lngOrigen),
        destino_texto: informacionDestino?.texto || informacionDestino?.destinoTexto || 'Punto de destino en San Gil',
        precio_estimado: parseFloat(informacionDestino?.precio || 6000.0),
        metodo_pago: 'EFECTIVO'
      };

      const respuesta = await axiosClient.post('/viajes/solicitar', datosViaje);
      setViajeIdActual(respuesta.data.id);
    } catch (error) {
      setCargandoSolicitud(false);
      const msg = extraerMensajeError(error, 'Error al solicitar la carrera. Intente nuevamente.');
      console.warn("Solicitud rechazada:", msg);
    }
  };

  // Función: Cancelar la solicitud activa del cliente
  const handleCancelarSolicitud = async () => {
    if (viajeIdActual) {
      try {
        await axiosClient.patch(`/viajes/${viajeIdActual}/estado`, { estado: 'CANCELADO' });
      } catch (error) {
        console.error("Error al notificar cancelación al backend:", error);
      }
    }
    setCargandoSolicitud(false);
    setViajeIdActual(null);
    setServicioCliente(null);
  };

  // Función: El taxista acepta una carrera disponible
  const handleAceptarCarrera = async (viajeId) => {
    try {
      const respuesta = await axiosClient.patch(`/viajes/${viajeId}/aceptar`);
      setCarreraTaxista(respuesta.data);
      setSolicitudesCercanas([]);
    } catch (error) {
      const msg = extraerMensajeError(error, 'La carrera ya fue tomada por otro conductor.');
      console.warn("No se pudo aceptar la carrera:", msg);
    }
  };

  // Función: Cambio de estado del viaje por parte del taxista
  const handleCambiarEstadoViaje = async (viajeId, nuevoEstado) => {
    try {
      const respuesta = await axiosClient.patch(`/viajes/${viajeId}/estado`, {
        estado: nuevoEstado,
      });

      if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CANCELADO') {
        setCarreraTaxista(null);
        setServicioCliente(null);
        setViajeIdActual(null);
      } else {
        setCarreraTaxista(respuesta.data);
      }
    } catch (error) {
      console.error('Error al cambiar el estado de la carrera:', error);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      
      {/* Botones flotantes en la esquina inferior derecha */}
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

      {/* Panel interactivo para el Cliente */}
      {esCliente && (
        <PanelCliente
          miUbicacion={miUbicacion}
          onDestinoSeleccionado={(dest) => {
            setDestino(dest);
          }}
          onSolicitarTaxi={handleSolicitarTaxi}
          cargandoSolicitud={cargandoSolicitud}
          servicioActivo={servicioCliente}
          onCancelarSolicitud={handleCancelarSolicitud}
        />
      )}

      {/* Panel interactivo para el Taxista */}
      {esTaxista && (
        <PanelTaxista
          solicitudes={solicitudesCercanas}
          onAceptarCarrera={handleAceptarCarrera}
          carreraActiva={carreraTaxista}
          onCambiarEstadoViaje={handleCambiarEstadoViaje}
        />
      )}

      {/* 🟢 CORREGIDO: Mapeo de props a MapaSanGil */}
      <MapaSanGil 
        userLat={miUbicacion.lat} 
        userLng={miUbicacion.lng} 
        origen={origen}
        destino={destino}
        mostrarRadar={esTaxista || esCliente}
        radioMetros={500}
        taxistas={solicitudesCercanas} 
        onSelectUbicacion={(coords) => {
          if (!origen) {
            setOrigen(coords);
          } else {
            setDestino(coords);
          }
        }}
      />

      {/* Modal de Historial de Calificaciones para el Taxista */}
      {esTaxista && (
        <ModalHistorialTaxista
          isOpen={modalHistorialAbierto}
          onClose={() => setModalHistorialAbierto(false)}
          taxistaId={user?.id}
        />
      )}

      {/* Modal de Calificación para el Cliente */}
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