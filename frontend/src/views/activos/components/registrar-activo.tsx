import type { EstadoSinTitular } from '../../../shared/api/client';
import { Aviso, Campo, ESTADO_ACTIVO, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { esVigente } from '../../../shared/domain/reglas';
import { useRegistroController } from '../hooks/use-registro-controller';

const ESTADOS_SIN_TITULAR: EstadoSinTitular[] = ['disponible', 'en_reparacion', 'de_baja'];

export function RegistrarActivo({ m }: { m: Modelo }) {
  const {
    verArt,
    toggleArt,
    art,
    setArt,
    f,
    setF,
    accArt,
    acc,
    destino,
    noPermitido,
    crearArticulo,
    guardar,
  } = useRegistroController(m);
  return (
    <Seccion
      titulo="Registrar activo"
      caja
      extra={
        <button type="button" className="btn btn-borde-acento" onClick={toggleArt}>
          {verArt ? 'Cerrar nuevo artículo' : '+ Nuevo artículo'}
        </button>
      }
    >
      {verArt && (
        <div className="panel panel-azul">
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>Nuevo artículo</span>
            <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
              Cree el modelo una sola vez; luego registre cada unidad con su serial.
            </span>
          </div>
          <div className="grid-form" style={{ gap: 10 }}>
            <Campo label="Tipo de equipo *">
              <select
                className="in"
                value={art.tipoId}
                onChange={(e) => setArt({ ...art, tipoId: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {m.tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Marca *">
              <input
                className="in"
                value={art.marca}
                onChange={(e) => setArt({ ...art, marca: e.target.value })}
              />
            </Campo>
            <Campo label="Modelo *">
              <input
                className="in"
                value={art.modelo}
                onChange={(e) => setArt({ ...art, modelo: e.target.value })}
              />
            </Campo>
            <Campo label="Especificaciones">
              <input
                className="in"
                value={art.especificaciones}
                onChange={(e) => setArt({ ...art, especificaciones: e.target.value })}
                placeholder="Ej. i5, 16 GB, 512 GB SSD"
              />
            </Campo>
            <Campo label="Vida útil (meses)">
              <input
                className="in"
                type="number"
                min={0}
                step={1}
                value={art.vida}
                onChange={(e) => setArt({ ...art, vida: e.target.value })}
              />
            </Campo>
          </div>
          <div className="fila">
            <button
              type="button"
              className="btn btn-primario"
              onClick={crearArticulo}
              disabled={accArt.pendiente}
            >
              Crear artículo
            </button>
            <Aviso msg={accArt.msg} />
          </div>
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
      </div>
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
          disabled={acc.pendiente || noPermitido}
        >
          Guardar activo
        </button>
        <Aviso msg={acc.msg} />
      </div>
    </Seccion>
  );
}
