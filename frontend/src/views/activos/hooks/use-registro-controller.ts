import { useState } from 'react';
import type { EstadoSinTitular } from '../../../shared/api/client';
import type { Modelo } from '../../../shared/domain/modelo';
import { cargoPermite } from '../../../shared/domain/reglas';
import { useAccion } from '../../../shared/state/datos';
import { activosApi } from '../api/activos-api';

export const ART_VACIO = { tipoId: '', marca: '', modelo: '', especificaciones: '', vida: '' };
export const ACT_VACIO = {
  articuloId: '',
  serial: '',
  estado: 'disponible' as EstadoSinTitular,
  usuarioId: '',
};

/** Alta de artículos (modelo) y de activos (unidad con serial), validando el perfil del cargo. */
export function useRegistroController(m: Modelo) {
  const [verArt, setVerArt] = useState(false);
  const [art, setArt] = useState(ART_VACIO);
  const [f, setF] = useState(ACT_VACIO);
  const accArt = useAccion();
  const acc = useAccion();

  const articulo = f.articuloId ? m.idx.articulo.get(Number(f.articuloId)) : undefined;
  const destino = f.usuarioId ? m.idx.usuario.get(Number(f.usuarioId)) : undefined;
  const noPermitido = !!(articulo && destino && !cargoPermite(m.cargoDe(destino), articulo));

  const crearArticulo = async () => {
    if (!art.tipoId || !art.marca.trim() || !art.modelo.trim())
      return accArt.setMsg({ texto: 'Tipo, marca y modelo son obligatorios.', error: true });
    const vida = art.vida.trim() === '' ? null : Number(art.vida);
    if (vida !== null && (!Number.isInteger(vida) || vida < 0))
      return accArt.setMsg({
        texto: 'La vida útil debe ser un número entero de meses.',
        error: true,
      });
    const r = await accArt.ejecutar(() =>
      activosApi.crearArticulo({
        tipoId: Number(art.tipoId),
        marca: art.marca,
        modelo: art.modelo,
        especificaciones: art.especificaciones || null,
        vidaUtilMeses: vida,
      }),
    );
    if (r) {
      setArt(ART_VACIO);
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
        }),
      (a) =>
        `Activo ${a.serial} registrado${a.usuarioId ? ` y asignado a ${destino?.nombre}` : ''}.`,
    );
    if (r) setF({ ...ACT_VACIO, articuloId: f.articuloId });
  };

  const toggleArt = () => {
    setVerArt(!verArt);
    accArt.setMsg(null);
  };

  return {
    verArt,
    toggleArt,
    art,
    setArt,
    f,
    setF,
    accArt,
    acc,
    destino,
    noPermitido,
    crearArticulo,
    guardar,
  };
}

export type RegistroController = ReturnType<typeof useRegistroController>;
