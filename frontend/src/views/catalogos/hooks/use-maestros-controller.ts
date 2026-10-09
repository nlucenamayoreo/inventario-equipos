import type { Id, NuevoArticulo } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import type { Accion } from '../../../shared/state/datos';
import { catalogosApi } from '../api/catalogos-api';

/** «16 GB, 32 GB» → ['16 GB', '32 GB'] sin vacíos ni repetidos. */
export const separarValores = (texto: string) => [
  ...new Set(
    texto
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];

/** Marcas, modelos, características por tipo y alta de artículos. */
export function useMaestrosController(m: Modelo, acc: Accion) {
  const falta = (texto: string) => {
    acc.setMsg({ texto, error: true });
    return Promise.resolve(undefined);
  };
  const nombreMarca = (id: Id) => m.marcas.find((b) => b.id === id)?.nombre ?? '—';
  const estado = (activo: boolean) => (activo ? 'activada' : 'desactivada');

  const crearMarca = (nombre: string) =>
    nombre.trim()
      ? acc.ejecutar(
          () => catalogosApi.crearMarca(nombre.trim()),
          `Marca ${nombre.trim()} agregada.`,
        )
      : falta('Indique el nombre de la marca.');
  const renombrarMarca = (id: Id, nombre: string) =>
    nombre.trim()
      ? acc.ejecutar(
          () => catalogosApi.editarMarca(id, { nombre: nombre.trim() }),
          `Marca renombrada a ${nombre.trim()}.`,
        )
      : falta('Indique el nombre de la marca.');
  const activarMarca = (id: Id, activo: boolean) =>
    acc.ejecutar(
      () => catalogosApi.editarMarca(id, { activo }),
      `Marca ${nombreMarca(id)} ${estado(activo)}.`,
    );

  const crearModelo = (datos: { marcaId: Id | null; tipoId: Id | null; nombre: string }) =>
    datos.marcaId && datos.tipoId && datos.nombre.trim()
      ? acc.ejecutar(
          () =>
            catalogosApi.crearModelo({
              marcaId: datos.marcaId!,
              tipoId: datos.tipoId!,
              nombre: datos.nombre.trim(),
            }),
          `Modelo ${nombreMarca(datos.marcaId)} ${datos.nombre.trim()} agregado.`,
        )
      : falta('Indique marca, tipo de equipo y nombre del modelo.');
  const renombrarModelo = (id: Id, nombre: string) =>
    nombre.trim()
      ? acc.ejecutar(
          () => catalogosApi.editarModelo(id, { nombre: nombre.trim() }),
          `Modelo renombrado a ${nombre.trim()}.`,
        )
      : falta('Indique el nombre del modelo.');
  const activarModelo = (id: Id, activo: boolean) =>
    acc.ejecutar(
      () => catalogosApi.editarModelo(id, { activo }),
      `Modelo ${m.modelos.find((x) => x.id === id)?.nombre ?? ''} ${estado(activo)}.`,
    );

  const crearCaracteristica = (tipoId: Id | null, nombre: string, valores: string) =>
    tipoId && nombre.trim()
      ? acc.ejecutar(
          () =>
            catalogosApi.crearCaracteristica({
              tipoId,
              nombre: nombre.trim(),
              valores: separarValores(valores),
            }),
          `Característica ${nombre.trim()} agregada a ${m.nombreTipo(tipoId)}.`,
        )
      : falta('Indique el tipo de equipo y el nombre de la característica.');
  const agregarValores = (id: Id, texto: string) => {
    const valores = separarValores(texto);
    return valores.length
      ? acc.ejecutar(
          () => catalogosApi.editarCaracteristica(id, { valores }),
          `Valores agregados: ${valores.join(', ')}.`,
        )
      : falta('Indique uno o más valores separados por coma.');
  };
  const renombrarCaracteristica = (id: Id, nombre: string) =>
    nombre.trim()
      ? acc.ejecutar(
          () => catalogosApi.editarCaracteristica(id, { nombre: nombre.trim() }),
          `Característica renombrada a ${nombre.trim()}.`,
        )
      : falta('Indique el nombre de la característica.');
  const activarCaracteristica = (id: Id, activo: boolean) =>
    acc.ejecutar(
      () => catalogosApi.editarCaracteristica(id, { activo }),
      `Característica ${m.idx.caracteristica.get(id)?.nombre ?? ''} ${estado(activo)}.`,
    );

  const crearArticulo = (datos: NuevoArticulo) =>
    acc.ejecutar(
      () => catalogosApi.crearArticulo(datos),
      (r) => `Artículo ${r.codigo} (${r.marca} ${r.modelo}) creado.`,
    );

  return {
    nombreMarca,
    crearMarca,
    renombrarMarca,
    activarMarca,
    crearModelo,
    renombrarModelo,
    activarModelo,
    crearCaracteristica,
    agregarValores,
    renombrarCaracteristica,
    activarCaracteristica,
    crearArticulo,
  };
}

export type MaestrosController = ReturnType<typeof useMaestrosController>;
