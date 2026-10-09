import { useState } from 'react';
import type { EstadoSinTitular } from '../../../shared/api/client';
import type { Activo, EstadoActivo } from '../../../shared/api/types';
import { ESTADO_ACTIVO } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { activosApi } from '../api/activos-api';

/** Filtros del listado, acciones por fila (liberar, recibir, cambiar estado) e historial abierto. */
export function useActivosController(m: Modelo) {
  const [fTipo, setFTipo] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoActivo>('');
  const [q, setQ] = useState('');
  const [historial, setHistorial] = useState<Activo | null>(null);
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
        return 'TI (resguardo)';
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
    liberar: (a: Activo) =>
      accion.ejecutar(
        () => activosApi.liberar(a.id),
        `Equipo ${a.serial} ${a.estado === 'pendiente_recuperacion' ? 'recuperado' : 'liberado'}; quedó disponible.`,
      ),
    cambiarEstado: (a: Activo, estado: EstadoSinTitular) =>
      accion.ejecutar(
        () => activosApi.cambiarEstado(a.id, estado),
        `Equipo ${a.serial}: ${ESTADO_ACTIVO[estado].txt.toLowerCase()}.`,
      ),
  };
}

export type ActivosController = ReturnType<typeof useActivosController>;
