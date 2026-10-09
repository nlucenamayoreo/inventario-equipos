import { useMemo, useState } from 'react';
import type { Activo, EstadoActivo, Usuario } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { reasignacionesApi } from '../api/reasignaciones-api';
import { usePendientes } from './use-reasignaciones-query';

const REASIGNABLES: EstadoActivo[] = ['asignado', 'en_resguardo', 'pendiente_recuperacion'];

/** Formulario de solicitud de reasignación (equipo, destino, motivo) con sus advertencias. */
export function useSolicitudController(m: Modelo, activoFijo?: number, onListo?: () => void) {
  const acc = useAccion();
  const pendientes = usePendientes();
  const [f, setF] = useState({ busca: '', activoId: '', destino: '', motivo: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const conPendiente = useMemo(
    () => new Set((pendientes.data ?? []).map((r) => r.activoId)),
    [pendientes.data],
  );
  const esReasignable = (a: Activo) => a.usuarioId != null && REASIGNABLES.includes(a.estado);

  const activoId = activoFijo ?? (f.activoId ? Number(f.activoId) : null);
  const activo = activoId != null ? m.activos.find((a) => a.id === activoId) : undefined;
  const busca = f.busca.trim().toLowerCase();
  const opcionesActivo = m.activos.filter(
    (a) =>
      esReasignable(a) &&
      !conPendiente.has(a.id) &&
      (!busca ||
        a.serial.toLowerCase().includes(busca) ||
        a.id === activoId ||
        m.etiquetaArticulo(a.articuloId).toLowerCase().includes(busca)),
  );

  const destinos = m.usuarios
    .filter(
      (u) => (u.estado === 'activo' || u.estado === 'vacaciones') && u.id !== activo?.usuarioId,
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const destino: Usuario | undefined = f.destino ? m.idx.usuario.get(Number(f.destino)) : undefined;

  /** Problemas que impiden la solicitud (equipo no reasignable o ya con solicitud pendiente). */
  const bloqueo = !activo
    ? null
    : !esReasignable(activo)
      ? 'Este equipo no tiene un titular al que se le pueda reasignar.'
      : conPendiente.has(activo.id)
        ? 'Este equipo ya tiene una solicitud de reasignación pendiente.'
        : null;

  const advertencias: string[] = [];
  if (activo && destino) {
    if (!m.puedeRecibir(destino, activo))
      advertencias.push(`El cargo de ${destino.nombre} no permite este equipo.`);
    const tipoId = m.tipoDeActivo(activo);
    const cupo = m.cupo(destino, tipoId);
    if (cupo.lleno)
      advertencias.push(
        `${destino.nombre} ya tiene ${cupo.tiene} de ${cupo.max} equipo(s) de tipo ${m.nombreTipo(tipoId)} permitidos.`,
      );
  }

  const enviar = async () => {
    if (!activo) return acc.setMsg({ texto: 'Seleccione el equipo.', error: true });
    if (bloqueo) return acc.setMsg({ texto: bloqueo, error: true });
    if (!destino) return acc.setMsg({ texto: 'Seleccione la persona destino.', error: true });
    if (!f.motivo.trim()) return acc.setMsg({ texto: 'Indique el motivo.', error: true });
    const r = await acc.ejecutar(
      () =>
        reasignacionesApi.solicitar({
          activoId: activo.id,
          usuarioDestino: destino.id,
          motivo: f.motivo.trim(),
        }),
      'Solicitud enviada. Queda pendiente de aprobación del Gerente de sistemas.',
    );
    if (r) {
      setF({ busca: '', activoId: '', destino: '', motivo: '' });
      onListo?.();
    }
  };

  return { acc, f, set, activo, opcionesActivo, destinos, bloqueo, advertencias, enviar };
}

export type SolicitudController = ReturnType<typeof useSolicitudController>;
