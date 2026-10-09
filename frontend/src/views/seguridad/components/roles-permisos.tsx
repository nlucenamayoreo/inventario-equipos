import { useState } from 'react';
import { Pill, Seccion } from '../../../shared/components/ui';
import type { SeguridadController } from '../hooks/use-seguridad-controller';
import { EditorRol } from './editor-rol';
import { NuevoRol } from './nuevo-rol';

/** Lista de roles y editor del rol seleccionado (o formulario de alta). */
export function RolesPermisos({ c }: { c: SeguridadController }) {
  const [selId, setSelId] = useState<number | 'nuevo' | null>(null);
  const rol = typeof selId === 'number' ? c.roles.find((r) => r.id === selId) : c.roles[0];
  const nuevo = selId === 'nuevo';

  return (
    <Seccion
      titulo="Roles y permisos"
      caja
      extra={
        <button
          type="button"
          className="btn btn-sm btn-borde-acento"
          onClick={() => setSelId('nuevo')}
          disabled={nuevo}
        >
          Nuevo rol
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="lista-scroll" role="list" aria-label="Roles">
          {c.roles.map((r) => {
            const activo = !nuevo && rol?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="listitem"
                aria-current={activo ? 'true' : undefined}
                className={`btn cargo-btn${activo ? ' btn-borde-acento' : ''}`}
                style={{ height: 'auto', padding: '8px 12px' }}
                onClick={() => setSelId(r.id)}
              >
                <span className="fila" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>{r.nombre}</span>
                  {r.esSistema ? (
                    <Pill tono="pur" small>
                      Sistema
                    </Pill>
                  ) : (
                    <Pill tono={r.activo ? 'ok' : 'neu'} small>
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </Pill>
                  )}
                </span>
                <span className="tenue" style={{ fontSize: 12, whiteSpace: 'normal' }}>
                  {r.descripcion ? `${r.descripcion} · ` : ''}
                  {c.personasConRol(r.id)} persona(s)
                </span>
              </button>
            );
          })}
          {c.roles.length === 0 && <p className="vacio">No hay roles registrados.</p>}
        </div>
        <div>
          {nuevo ? (
            <NuevoRol c={c} onCreado={setSelId} onCancelar={() => setSelId(null)} />
          ) : rol ? (
            <EditorRol key={`${rol.id}-${rol.permisos.join()}`} rol={rol} c={c} />
          ) : null}
        </div>
      </div>
    </Seccion>
  );
}
