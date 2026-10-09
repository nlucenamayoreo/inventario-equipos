import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Permiso } from '../api/types';
import { usePermisos, useSesion, useSyncGoogle } from '../state/datos';
import { fmtFechaHora, Pill } from './ui';

export function Logo() {
  return (
    <div className="marca-logo" aria-hidden="true">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    </div>
  );
}

type Tab = [ruta: string, etiqueta: string, visible: (puede: (p: Permiso) => boolean) => boolean];

const TABS: Tab[] = [
  ['/', 'Resumen', () => true],
  ['/usuarios', 'Usuarios', () => true],
  ['/activos', 'Activos', () => true],
  ['/reasignaciones', 'Reasignaciones', () => true],
  ['/catalogos', 'Catálogos', () => true],
  ['/cargas', 'Cargas masivas', (p) => p('usuarios.gestionar') || p('activos.registrar')],
  ['/seguridad', 'Seguridad', (p) => p('seguridad.gestionar')],
];

export function Layout({
  children,
  onSalir,
}: {
  children: ReactNode;
  onSalir?: (() => void) | null;
}) {
  const sesion = useSesion().data;
  const sync = useSyncGoogle().data;
  const puede = usePermisos();

  return (
    <>
      <header className="app-header">
        <div className="app-header-in">
          <div className="app-top">
            <div className="marca">
              <Logo />
              <div className="col" style={{ gap: 0 }}>
                <h1>Inventario de Equipos TI</h1>
                <span>Activos asignados por usuario · Grupo Mayoreo</span>
              </div>
            </div>
            <div className="app-meta">
              <span
                title={
                  sync?.ultimaCorrida && !sync.ultimaCorrida.exitoso
                    ? 'La última corrida tuvo errores'
                    : undefined
                }
              >
                Google Workspace:{' '}
                {sync?.ultimaExitosa
                  ? `sincronizado ${fmtFechaHora(sync.ultimaExitosa)}`
                  : 'sin sincronizar'}
                {sync?.ultimaCorrida && sync.ultimaCorrida.exitoso === false && (
                  <>
                    {' '}
                    ·{' '}
                    <Pill tono="bad" small>
                      última corrida con errores
                    </Pill>
                  </>
                )}
              </span>
              {sesion && (
                <span>
                  {sesion.nombre} ·{' '}
                  <Pill tono={sesion.superadmin ? 'blu' : 'neu'} small>
                    {sesion.activo ? sesion.rol : 'Acceso desactivado'}
                  </Pill>
                </span>
              )}
              {onSalir && (
                <button type="button" className="btn btn-sm" onClick={onSalir}>
                  Salir
                </button>
              )}
            </div>
          </div>
          <nav className="nav" aria-label="Secciones">
            {TABS.filter(([, , visible]) => visible(puede)).map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
