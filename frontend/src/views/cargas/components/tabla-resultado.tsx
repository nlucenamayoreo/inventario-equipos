import type { ResultadoImportacion } from '../../../shared/api/types';
import { Pill, Tabla } from '../../../shared/components/ui';

/** Resultado por fila de una validación o carga, con la fila real del Excel. */
export function TablaResultado({
  r,
  fila,
}: {
  r: ResultadoImportacion;
  fila: (n: number) => number;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="fila" aria-live="polite">
        <Pill tono="ok" small>
          {r.validas} válidas
        </Pill>
        <Pill tono={r.errores ? 'bad' : 'neu'} small>
          {r.errores} con error
        </Pill>
        <Pill tono={r.aplicado ? 'blu' : 'neu'} small>
          {r.aplicado ? 'Carga aplicada' : 'Vista previa (sin aplicar)'}
        </Pill>
      </div>
      <div className="lista-scroll" style={{ maxHeight: 320, overflow: 'auto' }}>
        <Tabla>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Fila</th>
              <th style={{ width: 80 }}>Estado</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {r.filas.map((f) => (
              <tr key={f.fila}>
                <td className="mono">{fila(f.fila)}</td>
                <td>
                  <Pill tono={f.ok ? 'ok' : 'bad'} small>
                    {f.ok ? 'OK' : 'Error'}
                  </Pill>
                </td>
                <td>{f.detalle}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </div>
    </div>
  );
}
