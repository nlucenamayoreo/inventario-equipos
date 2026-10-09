import { backend } from '../../../shared/api/backend';
import type { Opts } from '../../../shared/api/client';
import type { DatosInventario } from '../../../shared/domain/modelo';

export const resumenApi = {
  /** Foto del inventario: catálogos, colaboradores y activos (el resumen se calcula en el navegador). */
  async cargarInventario(opts?: Opts): Promise<DatosInventario> {
    const [silos, departamentos, tipos, articulos, cargos, usuarios, activos] = await Promise.all([
      backend.silos(opts),
      backend.departamentos(opts),
      backend.tiposEquipo(opts),
      backend.articulos(opts),
      backend.cargos(opts),
      backend.usuarios(opts),
      backend.activos(opts),
    ]);
    return { silos, departamentos, tipos, articulos, cargos, usuarios, activos };
  },
};
