import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const FormularioRegistro = () => {
  const { registro, login } = useContext(AuthContext); // Importem registre i login
  const navigate = useNavigate(); //

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    contrasena: '',
    acepto_politicas: false,
  }); //

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.acepto_politicas) {
      alert('Debes aceptar las políticas de privacidad para continuar.'); //
      return;
    }

    // 1. Pas: Crear l'usuari a la base de dades
    const resRegistro = await registro(formData); //

    if (resRegistro.success) {
      // 2. Pas: Auto-login immediat amb les mateixes credencials
      const resLogin = await login(formData.telefono, formData.contrasena); //

      if (resLogin.success) {
        // 3. Pas: Redireccionar al mapa un cop la cookie s'ha guardat
        navigate('/mapa'); //
      } else {
        alert('Registro completado, pero ocurrió un error al iniciar sesión automáticamente.');
      }
    } else {
      alert(resRegistro.error || 'Error al registrar el usuario.'); //
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-800 text-white rounded-lg">
      {/* Camps del formulari */}
      <button type="submit" className="w-full bg-yellow-400 text-slate-900 font-bold py-2 rounded">
        Registrarse y Continuar al Mapa 🚕
      </button>
    </form>
  );
};

export default FormularioRegistro;