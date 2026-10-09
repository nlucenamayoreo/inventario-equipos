import type { ReactNode } from 'react';
import type { AccionVacacion, EstadoActivo, EstadoUsuario, NivelDotacion } from '../api/types';
import type { Tono } from '../domain/reglas';
import type { Mensaje } from '../state/datos';

export type TonoPill = Tono | 'blu' | 'pur' | 'na';

export const ESTADO_ACTIVO: Record<EstadoActivo, { txt: string; tono: TonoPill }> = {
  asignado: { txt: 'Asignado', tono: 'blu' },
  en_resguardo: { txt: 'En resguardo', tono: 'mid' },
  prestamo: { txt: 'Préstamo', tono: 'pur' },
  disponible: { txt: 'Disponible', tono: 'ok' },
  pendiente_recuperacion: { txt: 'Pendiente de recuperación', tono: 'bad' },
  en_reparacion: { txt: 'En reparación', tono: 'mid' },
  de_baja: { txt: 'De baja', tono: 'neu' },
};

export const ESTADO_USUARIO: Record<EstadoUsuario, { txt: string; tono: TonoPill }> = {
  activo: { txt: 'Activo', tono: 'ok' },
  vacaciones: { txt: 'Vacaciones', tono: 'mid' },
  desactivado: { txt: 'Desactivado', tono: 'bad' },
  eliminado: { txt: 'Eliminado', tono: 'neu' },
};

export const NIVEL: Record<NivelDotacion, string> = {
  obligatorio: 'Obligatorio',
  permitido: 'Opcional',
  no_permitido: 'No permitido',
};

export const ACCION_VACACION: Record<AccionVacacion, string> = {
  conserva: 'Conserva sus equipos',
  resguardo: 'Entrega a TI en resguardo',
  prestamo: 'Préstamo temporal a un suplente',
};

export const MOTIVO: Record<string, string> = {
  alta: 'Alta en inventario',
  asignacion: 'Asignación',
  liberacion: 'Liberación',
  recuperacion: 'Recuperación',
  vacaciones: 'Vacaciones',
  fin_vacaciones: 'Fin de vacaciones',
  baja_usuario: 'Baja del usuario',
  desactivacion: 'Desactivación del usuario',
  sync_google: 'Sincronización Google',
  cambio_estado: 'Cambio de estado',
  reasignacion: 'Reasignación aprobada',
};

export function Pill({
  tono,
  children,
  small,
  className = '',
}: {
  tono: TonoPill;
  children: ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <span className={`pill pill-${tono}${small ? ' pill-sm' : ''} ${className}`}>{children}</span>
  );
}

export function PillEstadoActivo({ estado, small }: { estado: EstadoActivo; small?: boolean }) {
  const e = ESTADO_ACTIVO[estado];
  return (
    <Pill tono={e.tono} small={small}>
      {e.txt}
    </Pill>
  );
}

export function PillEstadoUsuario({ estado }: { estado: EstadoUsuario }) {
  const e = ESTADO_USUARIO[estado];
  return <Pill tono={e.tono}>{e.txt}</Pill>;
}

export function Aviso({ msg }: { msg: Mensaje | null }) {
  if (!msg) return null;
  return (
    <span
      className={`msg ${msg.error ? 'msg-err' : 'msg-ok'}`}
      role={msg.error ? 'alert' : 'status'}
    >
      {msg.texto}
    </span>
  );
}

export function Campo({
  label,
  children,
  className = '',
  style,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <label className={`lb ${className}`} style={style}>
      {label}
      {children}
    </label>
  );
}

export function Seccion({
  titulo,
  extra,
  children,
  caja,
  className = '',
}: {
  titulo: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  caja?: boolean;
  className?: string;
}) {
  return (
    <section className={`sec ${caja ? 'caja' : ''} ${className}`}>
      <div className="sec-head">
        <h2>{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="tabla-wrap">
      <table className="t">{children}</table>
    </div>
  );
}

export function Cargando() {
  return (
    <p className="tenue" role="status">
      Cargando…
    </p>
  );
}

export const fmtFecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const fmtFechaHora = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
