import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

export const PoliticasModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <Shield className="h-6 w-6" />
          <h3 className="text-lg font-bold text-slate-900">Términos y Condiciones</h3>
        </div>

        <div className="text-xs text-slate-600 space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-lg mb-4 border border-slate-200">
          <p>
            Al continuar con el registro en la plataforma de movilidad de San Gil, aceptas compartir tu ubicación en tiempo real únicamente durante las solicitudes activas de carrera.
          </p>
          <p>
            Tus datos personales no serán comercializados con terceros y se usarán para conectar con conductores autorizados de Cootrasangil.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs flex items-center justify-center gap-1 shadow-md"
          >
            <CheckCircle className="h-4 w-4" />
            Aceptar y Registrar
          </button>
        </div>
      </div>
    </div>
  );
};