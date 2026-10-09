import { backend } from '../../../shared/api/backend';
import type { Opts } from '../../../shared/api/client';
import type { DatosInventario } from '../../../shared/domain/modelo';

export const resumenApi = {
  /** Foto del inventario: catálogos, colaboradores, activos y personas con acceso (el resumen se calcula en el navegador). */
  async cargarInventario(opts?: Opts): Promise<DatosInventario> {
    const [
      silos,
      departamentos,
      tipos,
      articulos,
      cargos,
      usuarios,
      activos,
      marcas,
      modelos,
      caracteristicas,
      operadores,
    ] = await Promise.all([
      backend.silos(opts),
      backend.departamentos(opts),
      backend.tiposEquipo(opts),
      backend.articulos(opts),
      backend.cargos(opts),
      backend.usuarios(opts),
      backend.activos(opts),
      backend.marcas(opts),
      backend.modelos(opts),
      backend.caracteristicas(opts),
      backend.operadores(opts),
    ]);
    return {
      silos,
      departamentos,
      tipos,
      articulos,
      cargos,
      usuarios,
      activos,
      marcas,
      modelos,
      caracteristicas,
      operadores,
    };
  },
};
