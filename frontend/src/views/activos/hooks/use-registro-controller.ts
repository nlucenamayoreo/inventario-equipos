import { useState } from 'react';
import type { EstadoSinTitular } from '../../../shared/api/client';
import type { Id, NuevoArticulo } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import { cargoPermite } from '../../../shared/domain/reglas';
import { useAccion } from '../../../shared/state/datos';
import { activosApi } from '../api/activos-api';

export const ACT_VACIO = {
  articuloId: '',
  serial: '',
  estado: 'disponible' as EstadoSinTitular,
  usuarioId: '',
  custodioId: null as Id | null,
};

/** Alta de artículos (modelo) y de activos (unidad con serial), validando perfil del cargo y cupo. */
export function useRegistroController(m: Modelo) {
  const [verArt, setVerArt] = useState(false);
  const [f, setF] = useState(ACT_VACIO);
  const accArt = useAccion();
  const acc = useAccion();

  const articulo = f.articuloId ? m.idx.articulo.get(Number(f.articuloId)) : undefined;
  const destino = f.usuarioId ? m.idx.usuario.get(Number(f.usuarioId)) : undefined;
  const noPermitido = !!(articulo && destino && !cargoPermite(m.cargoDe(destino), articulo));
  const cupo = articulo && destino ? m.cupo(destino, articulo.tipoId) : null;
  const sinCupo = !!cupo?.lleno;
  /** Sin titular y no de baja: alguien con acceso queda a cargo del resguardo. */
  const pideCustodio = !f.usuarioId && f.estado !== 'de_baja';

  const crearArticulo = async (datos: NuevoArticulo) => {
    const r = await accArt.ejecutar(() => activosApi.crearArticulo(datos));
    if (r) {
      setVerArt(false);
      setF({ ...f, articuloId: String(r.id) });
      acc.setMsg({
        texto: `Artículo ${r.codigo} creado. Ya puede registrar sus unidades con serial.`,
        error: false,
      });
    }
  };

  const guardar = async () => {
    if (!f.articuloId || !f.serial.trim())
      return acc.setMsg({ texto: 'Artículo y serial son obligatorios.', error: true });
    const r = await acc.ejecutar(
      () =>
        activosApi.crear({
          articuloId: Number(f.articuloId),
          serial: f.serial,
          estado: f.estado,
          usuarioId: f.usuarioId ? Number(f.usuarioId) : null,
          custodioId: pideCustodio ? f.custodioId : null,
        }),
      (a) =>
        `Activo ${a.serial} registrado${
          a.usuarioId
            ? ` y asignado a ${destino?.nombre}`
            : a.custodioId
              ? ` a cargo de ${m.nombreOperador(a.custodioId)}`
              : ''
        }.`,
    );
    if (r) setF({ ...ACT_VACIO, articuloId: f.articuloId, custodioId: f.custodioId });
  };

  const toggleArt = () => {
    setVerArt(!verArt);
    accArt.setMsg(null);
  };

  return {
    verArt,
    toggleArt,
    f,
    setF,
    accArt,
    acc,
    destino,
    noPermitido,
    cupo,
    sinCupo,
    pideCustodio,
    crearArticulo,
    guardar,
  };
}

export type RegistroController = ReturnType<typeof useRegistroController>;
