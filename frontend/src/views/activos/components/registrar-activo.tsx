import type { EstadoSinTitular } from '../../../shared/api/client';
import { CustodioSelect } from '../../../shared/components/custodio-select';
import { FormArticulo } from '../../../shared/components/form-articulo';
import { Aviso, Campo, ESTADO_ACTIVO, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { esVigente } from '../../../shared/domain/reglas';
import { usePermiso } from '../../../shared/state/datos';
import { useRegistroController } from '../hooks/use-registro-controller';

const ESTADOS_SIN_TITULAR: EstadoSinTitular[] = ['disponible', 'en_reparacion', 'de_baja'];

export function RegistrarActivo({ m }: { m: Modelo }) {
  const puedeArticulos = usePermiso('articulos.gestionar');
  const {
    verArt,
    toggleArt,
    f,
    setF,
    accArt,
    acc,
    destino,
    noPermitido,
    cupo,
    sinCupo,
    pideCustodio,
    crearArticulo,
    guardar,
  } = useRegistroController(m);
  return (
    <Seccion
      titulo="Registrar activo"
      caja
      extra={
        puedeArticulos && (
          <button type="button" className="btn btn-borde-acento" onClick={toggleArt}>
            {verArt ? 'Cerrar nuevo artículo' : '+ Nuevo artículo'}
          </button>
        )
      }
    >
      {verArt && (
        <div className="panel panel-azul">
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>Nuevo artículo</span>
            <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              Elija el modelo y sus características una sola vez; luego registre cada unidad con su
              serial.
            </span>
          </div>
          <FormArticulo m={m} pendiente={accArt.pendiente} onGuardar={crearArticulo} />
          <Aviso msg={accArt.msg} />
        </div>
      )}

      <div
        className="grid-form"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
      >
        <Campo label="Artículo *" style={{ gridColumn: 'span 2' }}>
          <select
            className="in"
            value={f.articuloId}
            onChange={(e) => setF({ ...f, articuloId: e.target.value })}
          >
            <option value="">Seleccione…</option>
            {m.articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {m.nombreTipo(a.tipoId)} · {a.marca} {a.modelo} ({a.codigo})
                {a.caracteristicas.length ? ` · ${m.caracteristicasDe(a)}` : ''}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Serial *">
          <input
            className="in"
            value={f.serial}
            onChange={(e) => setF({ ...f, serial: e.target.value })}
            placeholder="Número de serie"
          />
        </Campo>
        <Campo label="Estado">
          <select
            className="in"
            value={f.usuarioId ? 'asignado' : f.estado}
            disabled={!!f.usuarioId}
            onChange={(e) => setF({ ...f, estado: e.target.value as EstadoSinTitular })}
          >
            {f.usuarioId && <option value="asignado">Asignado</option>}
            {ESTADOS_SIN_TITULAR.map((e) => (
              <option key={e} value={e}>
                {ESTADO_ACTIVO[e].txt}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Asignar a (opcional)">
          <select
            className="in"
            value={f.usuarioId}
            onChange={(e) => setF({ ...f, usuarioId: e.target.value })}
          >
            <option value="">Sin asignar</option>
            {m.usuarios.filter(esVigente).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.codigo}) · {m.cargoDe(u)?.nombre ?? 'Sin cargo'}
              </option>
            ))}
          </select>
        </Campo>
        {pideCustodio && (
          <CustodioSelect
            m={m}
            value={f.custodioId}
            onChange={(custodioId) => setF({ ...f, custodioId })}
          />
        )}
      </div>
      {sinCupo && !noPermitido && (
        <span className="msg msg-err">
          {destino!.nombre} ya tiene {cupo!.tiene} equipo(s) de este tipo; el máximo por persona es{' '}
          {cupo!.max}.
        </span>
      )}
      {noPermitido && (
        <span className="msg msg-err">
          El cargo de {destino!.nombre} no permite este artículo. Regístrelo sin asignar o ajuste el
          perfil del cargo.
        </span>
      )}
      <div className="fila" style={{ gap: 12 }}>
        <button
          type="button"
          className="btn btn-primario btn-lg"
          onClick={guardar}
          disabled={acc.pendiente || noPermitido || sinCupo}
        >
          Guardar activo
        </button>
        <Aviso msg={acc.msg} />
      </div>
    </Seccion>
  );
}
