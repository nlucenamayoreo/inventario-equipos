import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './shared/components/layout';
import { Cargando } from './shared/components/ui';
import { useSesion } from './shared/state/datos';
import { FiltrosProvider } from './shared/state/filtros';
import { ActivosPage } from './views/activos/pages/activos-page';
import { useAuthController } from './views/auth/hooks/use-auth-controller';
import { LoginPage } from './views/auth/pages/login-page';
import { CargasPage } from './views/cargas/pages/cargas-page';
import { CatalogosPage } from './views/catalogos/pages/catalogos-page';
import { useInventarioController } from './views/resumen/hooks/use-inventario-controller';
import { ReasignacionesPage } from './views/reasignaciones/pages/reasignaciones-page';
import { ResumenPage } from './views/resumen/pages/resumen-page';
import { SeguridadPage } from './views/seguridad/pages/seguridad-page';
import { UsuariosPage } from './views/usuarios/pages/usuarios-page';

export function App() {
  const auth = useAuthController();
  if (auth.estado === 'cargando')
    return (
      <div className="app-main">
        <Cargando />
      </div>
    );
  if (auth.estado === 'anonimo') return <LoginPage />;
  return <Autenticado onSalir={auth.salir} />;
}

function Autenticado({ onSalir }: { onSalir: (() => void) | null }) {
  const sesion = useSesion();
  if (sesion.isLoading)
    return (
      <div className="app-main">
        <Cargando />
      </div>
    );
  if (sesion.error)
    return (
      <div className="app-main">
        <p className="msg msg-err" role="alert">
          {sesion.error.message}
        </p>
      </div>
    );
  return (
    <FiltrosProvider>
      <Layout onSalir={onSalir}>
        <Contenido />
      </Layout>
    </FiltrosProvider>
  );
}

function Contenido() {
  const { modelo, error } = useInventarioController();
  if (error)
    return (
      <p className="msg msg-err" role="alert">
        No se pudo cargar el inventario: {error.message}
      </p>
    );
  if (!modelo) return <Cargando />;
  return (
    <Routes>
      <Route path="/" element={<ResumenPage m={modelo} />} />
      <Route path="/usuarios" element={<UsuariosPage m={modelo} />} />
      <Route path="/usuarios/:id" element={<UsuariosPage m={modelo} />} />
      <Route path="/activos" element={<ActivosPage m={modelo} />} />
      <Route path="/catalogos" element={<CatalogosPage m={modelo} />} />
      <Route path="/reasignaciones" element={<ReasignacionesPage m={modelo} />} />
      <Route path="/cargas" element={<CargasPage m={modelo} />} />
      <Route path="/seguridad" element={<SeguridadPage m={modelo} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
