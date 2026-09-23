import React, { useState } from 'react';
import { Star, Send, Loader2, X } from 'lucide-react';
import { calificacionesService } from '../api/calificaciones'; // Importación de la API de calificaciones

export const ModalCalificacion = ({ viajeId, onCalificacionGuardada, onClose }) => {
  const [puntuacion, setPuntuacion] = useState(5);
  const [hoverPuntuacion, setHoverPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg('');

    try {
      // Uso del servicio centralizado para enviar la calificación al Backend
      await calificacionesService.crearCalificacion({
        viaje_id: viajeId,
        puntuacion: puntuacion,
        comentario: comentario.trim() || null,
      });

      // Ejecutar callback para cerrar el modal y limpiar el estado local
      if (onCalificacionGuardada) {
        onCalificacionGuardada();
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || 
        'Error al guardar la calificación. Es posible que este viaje ya haya sido calificado.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative">
        
        {/* Botón opcional para cerrar/omitir si se proporciona la propiedad onClose */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50 transition-colors"
            title="Omitir calificación"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <h3 className="text-xl font-bold text-amber-400 mb-1">¡Viaje Finalizado!</h3>
        <p className="text-xs text-slate-400 mb-4">¿Cómo estuvo tu experiencia en la carrera?</p>

        {errorMsg && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector interactivo de 5 estrellas */}
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((estrella) => (
              <button
                key={estrella}
                type="button"
                onClick={() => setPuntuacion(estrella)}
                onMouseEnter={() => setHoverPuntuacion(estrella)}
                onMouseLeave={() => setHoverPuntuacion(0)}
                className="p-1 transition-transform transform hover:scale-110 cursor-pointer"
              >
                <Star
                  className={`h-8 w-8 ${
                    estrella <= (hoverPuntuacion || puntuacion)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Campo de Comentario Opcional */}
          <textarea
            rows="3"
            placeholder="Escribe un comentario opcional sobre el servicio..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {cargando ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Enviar Calificación</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalCalificacion;