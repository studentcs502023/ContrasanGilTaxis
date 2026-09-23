import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import VistaMapa from './pages/VistaMapa';
import FormularioRegistro from './pages/RegistroForm';
import PaginaLogin from './pages/PaginaLogin'; 

// Componente para proteger la ruta del mapa si no hay sesión activa
const RutaProtegida = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta de Registro para usuarios nuevos */}
          <Route path="/registro" element={<FormularioRegistro />} />
          
          {/* Ruta de Login para iniciar sesión */}
          <Route path="/login" element={<PaginaLogin />} />

          {/* Ruta Principal / Mapa Protegida */}
          <Route 
            path="/mapa" 
            element={
              <RutaProtegida>
                <VistaMapa />
              </RutaProtegida>
            } 
          />

          {/* Ruta por defecto (si la URL no coincide, redirige al Login) */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;