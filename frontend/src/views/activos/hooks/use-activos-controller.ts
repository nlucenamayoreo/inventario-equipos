import { useState } from 'react';
import type { EstadoSinTitular } from '../../../shared/api/client';
import type { Activo, EstadoActivo, Id } from '../../../shared/api/types';
import { ESTADO_ACTIVO } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { activosApi } from '../api/activos-api';

/** Acción que deja el equipo sin titular: falta confirmar quién queda a cargo del resguardo. */
export interface Entrega {
  activo: Activo;
  /** undefined = liberar o recibir (queda disponible). */
  estado?: EstadoSinTitular;
}

/** Estados sin titular que exigen responsable del resguardo (de baja no lo lleva). */
export const conResguardo = (estado: EstadoSinTitular) => estado !== 'de_baja';

/** Filtros del listado, acciones por fila (liberar, recibir, cambiar estado, reasignar) e historial. */
export function useActivosController(m: Modelo) {
  const [fTipo, setFTipo] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoActivo>('');
  const [q, setQ] = useState('');
  const [historial, setHistorial] = useState<Activo | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [reasignar, setReasignar] = useState<Activo | null>(null);
  const accion = useAccion();

  const qq = q.trim().toLowerCase();
  const filas = m.activos
    .filter((a) => {
      const art = m.idx.articulo.get(a.articuloId);
      const hay =
        `${a.serial} ${art?.marca} ${art?.modelo} ${art?.codigo} ${m.nombreUsuario(a.usuarioId)} ${a.prestadoA ? m.nombreUsuario(a.prestadoA) : ''}`.toLowerCase();
      return (
        (!fTipo || String(art?.tipoId) === fTipo) &&
        (!fEstado || a.estado === fEstado) &&
        (!qq || hay.includes(qq))
      );
    })
    .sort(
      (x, y) =>
        m.nombreTipo(m.tipoDeActivo(x)).localeCompare(m.nombreTipo(m.tipoDeActivo(y))) ||
        x.serial.localeCompare(y.serial),
    );

  const enUso = (a: Activo) => {
    switch (a.estado) {
      case 'asignado':
        return m.nombreUsuario(a.usuarioId);
      case 'prestamo':
        return `${m.nombreUsuario(a.prestadoA)} (suplente)`;
      case 'en_resguardo':
        return `Resguardo · ${m.nombreOperador(a.custodioId)}`;
      case 'pendiente_recuperacion':
        return 'Por devolver';
      default:
        return '—';
    }
  };

  return {
    filas,
    fTipo,
    setFTipo,
    fEstado,
    setFEstado,
    q,
    setQ,
    historial,
    setHistorial,
    enUso,
    accion,
    entrega,
    setEntrega,
    reasignar,
    setReasignar,
    /** De baja no necesita responsable; los demás cambios piden confirmar quién lo resguarda. */
    cambiarEstado: (a: Activo, estado: EstadoSinTitular) =>
      conResguardo(estado)
        ? setEntrega({ activo: a, estado })
        : accion.ejecutar(
            () => activosApi.cambiarEstado(a.id, estado, null),
            `Equipo ${a.serial}: ${ESTADO_ACTIVO[estado].txt.toLowerCase()}.`,
          ),
    confirmarEntrega: async (custodioId: Id | null) => {
      if (!entrega) return;
      const { activo: a, estado } = entrega;
      const quien = custodioId != null ? m.nombreOperador(custodioId) : 'usted';
      const r = await accion.ejecutar(
        () =>
          estado
            ? activosApi.cambiarEstado(a.id, estado, custodioId)
            : activosApi.liberar(a.id, custodioId),
        estado
          ? `Equipo ${a.serial}: ${ESTADO_ACTIVO[estado].txt.toLowerCase()}, a cargo de ${quien}.`
          : `Equipo ${a.serial} ${a.estado === 'pendiente_recuperacion' ? 'recibido' : 'liberado'}; quedó disponible a cargo de ${quien}.`,
      );
      if (r) setEntrega(null);
    },
  };
}

export type ActivosController = ReturnType<typeof useActivosController>;
