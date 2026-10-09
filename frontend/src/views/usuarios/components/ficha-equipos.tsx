import type { Usuario } from '../../../shared/api/types';
import { DotacionChips } from '../../../shared/components/dotacion-chips';
import { fmtFecha, Pill, PillEstadoActivo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FichaController } from '../hooks/use-ficha-controller';

/** Equipos del colaborador, préstamos recibidos, dotación del cargo y faltantes. */
export function FichaEquipos({
  m,
  u,
  c,
  puede,
}: {
  m: Modelo;
  u: Usuario;
  c: FichaController;
  puede: { asignar: boolean; reasignar: boolean };
}) {
  const cargo = m.cargoDe(u);
  const descripcion = (articuloId: number) => {
    const art = m.idx.articulo.get(articuloId);
    return `${m.nombreTipo(art?.tipoId ?? -1)} · ${art?.marca ?? ''} ${art?.modelo ?? ''}`;
  };
  return (
    <>
      <div className="col">
        <span className="subtitulo">Equipos asignados ({c.mios.length})</span>
        {c.mios.map((a) => (
          <div key={a.id} className="item">
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{descripcion(a.articuloId)}</span>
              <span style={{ fontSize: 11 }} className="tenue">
                S/N <span className="mono">{a.serial}</span> · desde {fmtFecha(a.fechaAsignacion)}
              </span>
              <div className="chips">
                {a.estado === 'prestamo' ? (
                  <Pill tono="pur" small>
                    Prestado a {m.nombreUsuario(a.prestadoA)}
                  </Pill>
                ) : (
                  <PillEstadoActivo estado={a.estado} small />
                )}
                {m.fueraDePerfil(a) && (
                  <Pill tono="pur" small>
                    Fuera del perfil del cargo
                  </Pill>
                )}
              </div>
            </div>
            <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
              {puede.reasignar && a.estado !== 'prestamo' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={c.pendiente}
                  onClick={() => c.abrir('reasignar', a)}
                >
                  Reasignar
                </button>
              )}
              {puede.asignar && (
                <button
                  type="button"
                  className="btn btn-sm btn-txt-peligro"
                  disabled={c.pendiente}
                  onClick={() => c.abrir('liberar', a)}
                >
                  {a.estado === 'pendiente_recuperacion' ? 'Recibir' : 'Liberar'}
                </button>
              )}
            </div>
          </div>
        ))}
        {!c.mios.length && (
          <span className="tenue" style={{ fontSize: 12 }}>
            Sin equipos.
          </span>
        )}
      </div>

      {c.prestados.length > 0 && (
        <div className="col">
          <span className="subtitulo">Equipos recibidos en préstamo</span>
          {c.prestados.map((a) => (
            <div key={a.id} className="item item-punteado">
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{descripcion(a.articuloId)}</span>
                <span style={{ fontSize: 11 }} className="tenue">
                  S/N <span className="mono">{a.serial}</span> · titular:{' '}
                  {m.nombreUsuario(a.usuarioId)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="col" style={{ gap: 6 }}>
        <span className="subtitulo">Dotación del cargo</span>
        {cargo ? (
          <DotacionChips m={m} cargo={cargo} />
        ) : (
          <span className="tenue">Sin cargo asignado.</span>
        )}
      </div>

      {c.vigente && (
        <div className="col" style={{ gap: 6 }}>
          <span className="subtitulo">Le falta (obligatorio por cargo)</span>
          <div className="chips">
            {c.faltan.map((t) => (
              <Pill key={t} tono="bad">
                {m.nombreTipo(t)}
              </Pill>
            ))}
            {!c.faltan.length && <Pill tono="ok">Dotación completa</Pill>}
          </div>
        </div>
      )}
    </>
  );
}
