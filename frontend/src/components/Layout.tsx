import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { esModoDemo, mockApi } from '../api';
import type { Rol } from '../api/types';
import { useSesion, useSyncGoogle } from '../state/datos';
import { fmtFechaHora, Pill } from './ui';

export function Logo() {
  return (
    <div className="marca-logo" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    </div>
  );
}

const TABS: [string, string][] = [['/', 'Resumen'], ['/usuarios', 'Usuarios'], ['/activos', 'Activos'], ['/catalogos', 'Catálogos']];

export function Layout({ children }: { children: ReactNode }) {
  const sesion = useSesion().data;
  const sync = useSyncGoogle().data;
  const qc = useQueryClient();

  const cambiarRol = (r: Rol) => {
    mockApi?.cambiarRol(r);
    qc.invalidateQueries();
  };
  const restablecer = () => {
    if (!window.confirm('¿Restablecer los datos de ejemplo? Se perderán los cambios hechos en esta demostración.')) return;
    mockApi?.restablecer();
    qc.invalidateQueries();
  };

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
              {esModoDemo && <Pill tono="mid">Modo demostración · datos de ejemplo</Pill>}
              <span title={sync?.ultimaCorrida && !sync.ultimaCorrida.exitoso ? 'La última corrida tuvo errores' : undefined}>
                Google Workspace: {sync?.ultimaExitosa ? `sincronizado ${fmtFechaHora(sync.ultimaExitosa)}` : 'sin sincronizar'}
                {sync?.ultimaCorrida && sync.ultimaCorrida.exitoso === false && <> · <Pill tono="bad" small>última corrida con errores</Pill></>}
              </span>
              {sesion && (
                <span>
                  {sesion.nombre} · <Pill tono={sesion.rol === 'admin_ti' ? 'blu' : 'neu'} small>{sesion.rol === 'admin_ti' ? 'Administrador TI' : 'Consulta'}</Pill>
                </span>
              )}
              {esModoDemo && sesion && (
                <>
                  <select className="in" aria-label="Rol de demostración" style={{ width: 160, height: 32 }} value={sesion.rol} onChange={(e) => cambiarRol(e.target.value as Rol)}>
                    <option value="admin_ti">Ver como admin TI</option>
                    <option value="consulta">Ver como consulta</option>
                  </select>
                  <button type="button" className="btn btn-sm" onClick={restablecer}>Restablecer datos</button>
                </>
              )}
            </div>
          </div>
          <nav className="nav" aria-label="Secciones">
            {TABS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
