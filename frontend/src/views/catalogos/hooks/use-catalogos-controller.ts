import { useState } from 'react';
import type { NivelDotacion } from '../../../shared/api/types';
import { NIVEL } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { catalogosApi } from '../api/catalogos-api';

/** Altas de catálogos, cargo seleccionado y cambios en su perfil de dotación. */
export function useCatalogosController(m: Modelo) {
  const acc = useAccion();
  const [f, setF] = useState({ silo: '', depto: '', deptoSilo: '', tipo: '', cargo: '' });
  const [cargoSel, setCargoSel] = useState<number | null>(m.cargos[0]?.id ?? null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const agregar = async <T>(
    campos: Partial<typeof f>,
    fn: () => Promise<T>,
    ok: string | ((r: T) => string),
  ) => {
    const r = await acc.ejecutar(fn, ok);
    if (r) setF((x) => ({ ...x, ...campos }));
    return r;
  };

  const addSilo = () =>
    f.silo.trim()
      ? agregar(
          { silo: '' },
          () => catalogosApi.crearSilo(f.silo),
          `Silo ${f.silo.trim()} agregado.`,
        )
      : acc.setMsg({ texto: 'Indique el nombre del silo.', error: true });
  const addDepto = () =>
    f.depto.trim() && f.deptoSilo
      ? agregar(
          { depto: '', deptoSilo: '' },
          () => catalogosApi.crearDepartamento(f.depto, Number(f.deptoSilo)),
          `Departamento ${f.depto.trim()} agregado.`,
        )
      : acc.setMsg({ texto: 'Indique nombre y silo del departamento.', error: true });
  const addTipo = () =>
    f.tipo.trim()
      ? agregar(
          { tipo: '' },
          () => catalogosApi.crearTipoEquipo(f.tipo),
          `Tipo ${f.tipo.trim()} agregado. Quedó como «No permitido» en todos los cargos: defina en qué cargos aplica.`,
        )
      : acc.setMsg({ texto: 'Indique el tipo de equipo.', error: true });
  const addCargo = async () => {
    if (!f.cargo.trim()) return acc.setMsg({ texto: 'Indique el nombre del cargo.', error: true });
    const c = await agregar(
      { cargo: '' },
      () => catalogosApi.crearCargo(f.cargo),
      (r) => `Cargo ${r.nombre} creado con todos los equipos como opcionales. Ajuste su dotación.`,
    );
    if (c) setCargoSel(c.id);
  };

  const pc = (cargoSel != null && m.idx.cargo.get(cargoSel)) || m.cargos[0];
  const usuariosCon = (pred: (u: Modelo['usuarios'][number]) => boolean) =>
    m.usuarios.filter(pred).length;

  const cambiarDotacion = (tipoId: number, nivel: NivelDotacion, restr: number | null) => {
    if (!pc) return;
    const tipo = m.nombreTipo(tipoId);
    acc.ejecutar(
      () => catalogosApi.actualizarDotacion(pc.id, tipoId, nivel, restr),
      `Dotación de «${pc.nombre}» actualizada: ${tipo} · ${NIVEL[nivel]}.`,
    );
  };

  return {
    acc,
    f,
    set,
    addSilo,
    addDepto,
    addTipo,
    addCargo,
    pc,
    setCargoSel,
    usuariosCon,
    cambiarDotacion,
  };
}

export type CatalogosController = ReturnType<typeof useCatalogosController>;
