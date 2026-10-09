import { useState } from 'react';
import type { Id, NuevoArticulo } from '../api/types';
import type { Modelo } from '../domain/modelo';
import { Campo } from './ui';

const VACIO = { tipoId: '', marcaId: '', modeloId: '', especificaciones: '', vidaUtil: '' };

/**
 * Formulario de alta de artículo: Tipo → Marca → Modelo y valores de características del tipo.
 * Es presentacional: no llama a la API, entrega los datos en `onGuardar`. Si `onGuardar`
 * resuelve un valor (p. ej. el artículo creado), el formulario se limpia.
 */
export function FormArticulo({
  m,
  pendiente,
  onGuardar,
}: {
  m: Modelo;
  pendiente?: boolean;
  onGuardar: (datos: NuevoArticulo) => void | Promise<unknown>;
}) {
  const [f, setF] = useState(VACIO);
  const [valores, setValores] = useState<Record<Id, string>>({});
  const [error, setError] = useState<string | null>(null);

  const tipoId = f.tipoId ? Number(f.tipoId) : null;
  const marcaId = f.marcaId ? Number(f.marcaId) : null;
  const conArticulo = new Set(m.articulos.map((a) => a.modeloId));
  const modelosTipo = m.modelos.filter(
    (x) => x.activo && x.tipoId === tipoId && !conArticulo.has(x.id),
  );
  const marcas = m.marcas.filter((b) => b.activo && modelosTipo.some((x) => x.marcaId === b.id));
  const modelos = modelosTipo.filter((x) => x.marcaId === marcaId);
  const caracteristicas = m.caracteristicas.filter((c) => c.activo && c.tipoId === tipoId);

  const cambiar = (k: keyof typeof VACIO) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setError(null);
    if (k === 'tipoId') {
      setF({ ...f, tipoId: v, marcaId: '', modeloId: '' });
      setValores({});
    } else if (k === 'marcaId') setF({ ...f, marcaId: v, modeloId: '' });
    else setF({ ...f, [k]: v });
  };

  const guardar = async () => {
    if (!f.modeloId) return setError('Seleccione tipo, marca y modelo del artículo.');
    const vida = f.vidaUtil.trim() ? Number(f.vidaUtil) : null;
    if (vida != null && (!Number.isInteger(vida) || vida <= 0))
      return setError('La vida útil debe ser un número entero de meses mayor que cero.');
    const r = await onGuardar({
      modeloId: Number(f.modeloId),
      especificaciones: f.especificaciones.trim() || null,
      vidaUtilMeses: vida,
      caracteristicas: caracteristicas
        .filter((c) => valores[c.id])
        .map((c) => ({ caracteristicaId: c.id, valorId: Number(valores[c.id]) })),
    });
    if (r) {
      setF(VACIO);
      setValores({});
    }
  };

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="grid-form">
        <Campo label="Tipo de equipo">
          <select className="in" value={f.tipoId} onChange={cambiar('tipoId')}>
            <option value="">Seleccione…</option>
            {m.tipos
              .filter((t) => t.activo)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Marca">
          <select className="in" value={f.marcaId} onChange={cambiar('marcaId')} disabled={!tipoId}>
            <option value="">
              {tipoId && !marcas.length ? 'Sin marcas para el tipo' : 'Seleccione…'}
            </option>
            {marcas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Modelo">
          <select
            className="in"
            value={f.modeloId}
            onChange={cambiar('modeloId')}
            disabled={!marcaId}
          >
            <option value="">Seleccione…</option>
            {modelos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {caracteristicas.map((c) => (
          <Campo key={c.id} label={`${c.nombre} (opcional)`}>
            <select
              className="in"
              value={valores[c.id] ?? ''}
              onChange={(e) => setValores({ ...valores, [c.id]: e.target.value })}
            >
              <option value="">Sin especificar</option>
              {c.valores
                .filter((v) => v.activo)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.valor}
                  </option>
                ))}
            </select>
          </Campo>
        ))}
        <Campo label="Especificaciones">
          <input
            className="in"
            value={f.especificaciones}
            onChange={cambiar('especificaciones')}
            placeholder="Detalle adicional (opcional)"
          />
        </Campo>
        <Campo label="Vida útil (meses)">
          <input
            className="in"
            type="number"
            min={1}
            step={1}
            value={f.vidaUtil}
            onChange={cambiar('vidaUtil')}
          />
        </Campo>
      </div>
      <span className="sec-nota">
        Las marcas, modelos y características se administran en Catálogos. Solo se listan modelos
        activos que aún no tienen artículo.
      </span>
      {error && (
        <span className="msg msg-err" role="alert">
          {error}
        </span>
      )}
      <div className="fila">
        <button type="button" className="btn btn-primario" onClick={guardar} disabled={pendiente}>
          Guardar artículo
        </button>
      </div>
    </div>
  );
}
