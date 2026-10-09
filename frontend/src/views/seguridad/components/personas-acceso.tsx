import { Pill, Seccion, Tabla } from '../../../shared/components/ui';
import type { SeguridadController } from '../hooks/use-seguridad-controller';
import { InvitarPersona } from './invitar-persona';

/** Personas con acceso: rol, estado e invitación de nuevas personas. */
export function PersonasAcceso({ c }: { c: SeguridadController }) {
  return (
    <Seccion titulo="Personas con acceso" caja>
      <p className="sec-nota">
        Las personas con acceso pueden ingresar a la aplicación y quedar como responsables del
        resguardo de equipos. Quien no está en esta lista solo puede consultar.
      </p>
      <InvitarPersona c={c} />
      <Tabla>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {c.operadores.map((o) => {
            const editable = c.puedeEditar(o);
            const motivo = c.esPropio(o)
              ? 'No puede cambiar su propio rol ni desactivarse.'
              : !editable
                ? 'Solo un superadministrador puede modificar a otro superadministrador.'
                : undefined;
            const opciones = c.rolesAsignables.some((r) => r.id === o.rolId)
              ? c.rolesAsignables
              : [...c.rolesAsignables, ...c.roles.filter((r) => r.id === o.rolId)];
            return (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>
                  {o.nombre}
                  {c.esPropio(o) && <span className="tenue"> (usted)</span>}
                </td>
                <td>{o.correo}</td>
                <td>
                  <select
                    className="in"
                    aria-label={`Rol de ${o.nombre}`}
                    value={o.rolId}
                    disabled={!editable || c.acc.pendiente}
                    title={motivo}
                    onChange={(e) => {
                      const rolId = Number(e.target.value);
                      const r = c.roles.find((x) => x.id === rolId);
                      c.editarOperador(
                        o,
                        { rolId },
                        `${o.nombre} ahora tiene el rol «${r?.nombre}».`,
                      );
                    }}
                  >
                    {opciones.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                        {r.activo ? '' : ' (inactivo)'}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Pill tono={o.activo ? 'ok' : 'neu'}>{o.activo ? 'Activo' : 'Inactivo'}</Pill>
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${o.activo ? 'btn-borde-peligro' : 'btn-ok'}`}
                    disabled={!editable || c.acc.pendiente}
                    title={motivo}
                    onClick={() =>
                      c.editarOperador(
                        o,
                        { activo: !o.activo },
                        `${o.nombre} ${o.activo ? 'ya no tiene acceso' : 'vuelve a tener acceso'}.`,
                      )
                    }
                  >
                    {o.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            );
          })}
          {c.operadores.length === 0 && (
            <tr>
              <td colSpan={5} className="vacio">
                No hay personas con acceso.
              </td>
            </tr>
          )}
        </tbody>
      </Tabla>
    </Seccion>
  );
}
