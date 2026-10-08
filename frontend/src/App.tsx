import { Navigate, Route, Routes } from 'react-router-dom';
import { ApiError } from './api';
import { Layout } from './components/Layout';
import { Cargando } from './components/ui';
import { ActivosPage } from './pages/ActivosPage';
import { CatalogosPage } from './pages/CatalogosPage';
import { LoginPage } from './pages/LoginPage';
import { ResumenPage } from './pages/ResumenPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { useInventario, useSesion } from './state/datos';
import { FiltrosProvider } from './state/filtros';

export function App() {
  const sesion = useSesion();
  if (sesion.isLoading) return <div className="app-main"><Cargando /></div>;
  if (sesion.error instanceof ApiError && sesion.error.status === 401) return <LoginPage />;
  if (sesion.error) return <div className="app-main"><p className="msg msg-err">{sesion.error.message}</p></div>;

  return (
    <FiltrosProvider>
      <Layout>
        <Contenido />
      </Layout>
    </FiltrosProvider>
  );
}

function Contenido() {
  const { modelo, error } = useInventario();
  if (error) return <p className="msg msg-err" role="alert">No se pudo cargar el inventario: {error.message}</p>;
  if (!modelo) return <Cargando />;
  return (
    <Routes>
      <Route path="/" element={<ResumenPage m={modelo} />} />
      <Route path="/usuarios" element={<UsuariosPage m={modelo} />} />
      <Route path="/usuarios/:id" element={<UsuariosPage m={modelo} />} />
      <Route path="/activos" element={<ActivosPage m={modelo} />} />
      <Route path="/catalogos" element={<CatalogosPage m={modelo} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
