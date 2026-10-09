import { useState } from 'react';
import { Campo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { MaestrosController } from '../hooks/use-maestros-controller';
import { NombreEditable } from './nombre-editable';

export function ListaModelos({
  m,
  mc,
  puede,
  pendiente,
}: {
  m: Modelo;
  mc: MaestrosController;
  puede: boolean;
  pendiente: boolean;
}) {
  const [filtro, setFiltro] = useState({ marca: '', tipo: '' });
  const [nuevo, setNuevo] = useState({ marca: '', tipo: '', nombre: '' });
  const visibles = m.modelos.filter(
    (x) =>
      (!filtro.marca || x.marcaId === Number(filtro.marca)) &&
      (!filtro.tipo || x.tipoId === Number(filtro.tipo)),
  );

  const agregar = async () => {
    const r = await mc.crearModelo({
      marcaId: nuevo.marca ? Number(nuevo.marca) : null,
      tipoId: nuevo.tipo ? Number(nuevo.tipo) : null,
      nombre: nuevo.nombre,
    });
    if (r) setNuevo({ ...nuevo, nombre: '' });
  };

  const opcionesMarca = (soloActivas: boolean) =>
    m.marcas
      .filter((b) => !soloActivas || b.activo)
      .map((b) => (
        <option key={b.id} value={b.id}>
          {b.nombre}
        </option>
      ));
  const opcionesTipo = (soloActivos: boolean) =>
    m.tipos
      .filter((t) => !soloActivos || t.activo)
      .map((t) => (
        <option key={t.id} value={t.id}>
          {t.nombre}
        </option>
      ));

  return (
    <div className="col" style={{ minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>Modelos ({m.modelos.length})</span>
      {puede && (
        <div className="panel col" style={{ gap: 8 }}>
          <div className="grid-form" style={{ gap: 8 }}>
            <Campo label="Marca">
              <select
                className="in"
                value={nuevo.marca}
                onChange={(e) => setNuevo({ ...nuevo, marca: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {opcionesMarca(true)}
              </select>
            </Campo>
            <Campo label="Tipo de equipo">
              <select
                className="in"
                value={nuevo.tipo}
                onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
              >
                <option value="">Seleccione…</option>
                {opcionesTipo(true)}
              </select>
            </Campo>
            <Campo label="Nombre del modelo">
              <input
                className="in"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && agregar()}
              />
            </Campo>
          </div>
          <div className="fila">
            <button
              type="button"
              className="btn btn-primario"
              onClick={agregar}
              disabled={pendiente}
            >
              Agregar modelo
            </button>
          </div>
        </div>
      )}
      <div className="grid-2" style={{ gap: 8 }}>
        <Campo label="Filtrar por marca">
          <select
            className="in"
            value={filtro.marca}
            onChange={(e) => setFiltro({ ...filtro, marca: e.target.value })}
          >
            <option value="">Todas</option>
            {opcionesMarca(false)}
          </select>
        </Campo>
        <Campo label="Filtrar por tipo">
          <select
            className="in"
            value={filtro.tipo}
            onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}
          >
            <option value="">Todos</option>
            {opcionesTipo(false)}
          </select>
        </Campo>
      </div>
      {!visibles.length && <p className="tenue">No hay modelos con estos filtros.</p>}
      {visibles.map((x) => (
        <NombreEditable
          key={x.id}
          nombre={x.nombre}
          activo={x.activo}
          etiqueta="el modelo"
          puede={puede}
          pendiente={pendiente}
          detalle={
            <span className="tenue" style={{ fontSize: 12 }}>
              {mc.nombreMarca(x.marcaId)} · {m.nombreTipo(x.tipoId)}
            </span>
          }
          onRenombrar={(n) => mc.renombrarModelo(x.id, n)}
          onActivo={(a) => mc.activarModelo(x.id, a)}
        />
      ))}
    </div>
  );
}
