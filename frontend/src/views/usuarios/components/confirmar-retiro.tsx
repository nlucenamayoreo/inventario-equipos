import type { Usuario } from '../../../shared/api/types';
import type { FichaController } from '../hooks/use-ficha-controller';

/** Confirmación de desactivar o eliminar, indicando qué pasa con los equipos. */
export function ConfirmarRetiro({
  u,
  c,
  tipo,
}: {
  u: Usuario;
  c: FichaController;
  tipo: 'desactivar' | 'eliminar';
}) {
  const prestamo = c.prestados.length
    ? ` Los ${c.prestados.length} equipo(s) que recibió en préstamo vuelven a TI en resguardo.`
    : '';
  const detalle =
    tipo === 'desactivar'
      ? (c.enUso.length
          ? `Sus ${c.enUso.length} equipo(s) pasarán a «Pendiente de recuperación».`
          : 'No tiene equipos en uso.') +
        prestamo +
        ' Use esta opción si la cuenta no se gestiona en Google Workspace.'
      : (c.mios.length
          ? `Sus ${c.mios.length} equipo(s) se liberarán y quedarán como disponibles en inventario.`
          : 'El usuario no tiene equipos asignados.') +
        prestamo +
        ' El historial se conserva.';
  return (
    <div className="panel panel-rojo">
      <span style={{ fontWeight: 700, color: 'var(--bad)' }}>
        ¿{tipo === 'desactivar' ? 'Desactivar' : 'Eliminar'} a {u.nombre}?
      </span>
      <span style={{ fontSize: 12, color: '#5C1A1D' }}>{detalle}</span>
      <div className="fila" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-peligro"
          disabled={c.pendiente}
          onClick={tipo === 'desactivar' ? c.desactivar : c.eliminar}
        >
          Sí, {tipo === 'desactivar' ? 'desactivar' : 'eliminar'}
        </button>
        <button type="button" className="btn" onClick={c.cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
