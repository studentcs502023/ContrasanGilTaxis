import React from 'react';
import { FormLogin } from '../components/FormLogin';

export const PaginaLogin = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-4">
      {/* Encabezado limpio */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-amber-400 tracking-tight">Taxis San Gil</h1>
        <p className="text-sm text-slate-400 mt-1">Tu sesión ha expirado o requiere autenticación</p>
      </div>

      {/* Formulario de Login exclusivo */}
      <FormLogin />
    </div>
  );
};

export default PaginaLogin;