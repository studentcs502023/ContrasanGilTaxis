import React, { useEffect, useState } from 'react';
import { Star, X, MessageSquare, Loader2, Award } from 'lucide-react';
import { calificacionesService } from '../api/calificaciones'; // <--- Importamos nuestro servicio API centralizado

export const ModalHistorialTaxista = ({ isOpen, onClose, taxistaId }) => {
  const [historial, setHistorial] = useState([]);
  const [promedio, setPromedio] = useState({ promedio_puntuacion: 0, total_calificaciones: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (isOpen && taxistaId) {
      cargarDatosHistorial();
    }
  }, [isOpen, taxistaId]);

  const cargarDatosHistorial = async () => {
    setCargando(true);
    try {
      // 1. Obtener el promedio desde el backend
      const resPromedio = await calificacionesService.getPromedioTaxista(taxistaId);
      setPromedio(resPromedio || { promedio_puntuacion: 0, total_calificaciones: 0 });

      // 2. Obtener la lista completa de calificaciones y comentarios desde el backend
      const resHistorial = await calificacionesService.getCalificacionesTaxista(taxistaId);
      setHistorial(Array.isArray(resHistorial) ? resHistorial : []);
    } catch (error) {
      console.error('Error al obtener el historial de calificaciones del backend:', error);
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl relative flex flex-col max-h-[85vh]">
        
        {/* Botón para cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <Award className="h-5 w-5" /> Historial de calificaciones
          </h3>
          <p className="text-xs text-slate-400">Opiniones y estrellas de tus servicios</p>
        </div>

        {/* Tarjeta Resumen de Promedio */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Promedio General</span>
            <span className="text-2xl font-black text-amber-400">{promedio.promedio_puntuacion} / 5</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Servicios</span>
            <span className="text-sm font-bold text-slate-200">{promedio.total_calificaciones} Reseñas</span>
          </div>
        </div>

        {/* Lista con Scroll */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2 text-amber-400" />
              <span className="text-xs">Cargando Historial...</span>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Aún no existen calificaciones registradas.
            </div>
          ) : (
            historial.map((item) => (
              <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < item.puntuacion ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {item.creado_en ? new Date(item.creado_en).toLocaleDateString() : 'Reciente'}
                  </span>
                </div>

                {/* Mapeo directo del campo 'comentario' que viene desde MariaDB */}
                {item.comentario && item.comentario.trim() !== '' ? (
                  <p className="text-xs text-slate-300 flex items-start gap-1.5 mt-1 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="italic">"{item.comentario}"</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic mt-1">Sin comentario escrito.</p>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default ModalHistorialTaxista;