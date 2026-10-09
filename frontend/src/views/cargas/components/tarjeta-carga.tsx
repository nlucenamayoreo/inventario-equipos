import type { ReactNode } from 'react';
import { Aviso, Seccion } from '../../../shared/components/ui';
import type { CargaController } from '../hooks/use-carga-controller';
import { TablaResultado } from './tabla-resultado';

/** Tarjeta de una carga masiva: machote, archivo, validación previa y aplicación. */
export function TarjetaCarga({
  titulo,
  c,
  children,
}: {
  titulo: string;
  c: CargaController;
  children: ReactNode;
}) {
  const idArchivo = `archivo-${c.tipo}`;
  return (
    <Seccion titulo={titulo} caja>
      <div className="col" style={{ gap: 12 }}>
        {children}

        <div className="fila">
          <span className="tenue" style={{ fontWeight: 600 }}>
            1.
          </span>
          <button
            type="button"
            className="btn btn-borde-acento"
            onClick={c.descargar}
            disabled={c.ocupado === 'descarga'}
          >
            {c.ocupado === 'descarga' ? 'Generando…' : 'Descargar machote (.xlsx)'}
          </button>
          <span className="sec-nota">Incluye los catálogos vigentes en las listas desplegables.</span>
        </div>

        <div className="fila">
          <span className="tenue" style={{ fontWeight: 600 }}>
            2.
          </span>
          <label htmlFor={idArchivo} className="lb" style={{ flex: 1, minWidth: 220 }}>
            Machote lleno (.xlsx)
            <input
              id={idArchivo}
              className="in"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => c.elegir(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="fila">
          <span className="tenue" style={{ fontWeight: 600 }}>
            3.
          </span>
          <button
            type="button"
            className="btn"
            onClick={c.validar}
            disabled={!c.archivo || c.pendiente}
          >
            {c.ocupado === 'validacion' ? 'Validando…' : 'Validar'}
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={c.aplicar}
            disabled={!c.puedeAplicar || c.pendiente}
            title={
              c.puedeAplicar ? undefined : 'Valide el archivo sin errores para poder aplicar la carga.'
            }
          >
            {c.acc.pendiente ? 'Aplicando…' : 'Aplicar carga'}
          </button>
        </div>

        <Aviso msg={c.acc.msg} />
        {c.resultado && <TablaResultado r={c.resultado} fila={c.fila} />}
      </div>
    </Seccion>
  );
}
