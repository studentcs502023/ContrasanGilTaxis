// src/components/Mapa.jsx
import React from 'react';

export const Mapa = () => {
  // Retorna null si no quieres que renderice nada en el DOM
  // o un div informativo mientras integras la API
  return (
    <div className="w-full h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-dashed border-slate-300">
      <p className="text-sm font-medium">Cargando mapa de San Gil...</p>
    </div>
  );
};

export default Mapa;