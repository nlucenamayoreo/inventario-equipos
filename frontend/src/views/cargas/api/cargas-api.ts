import { backend } from '../../../shared/api/backend';
import type { FilaMachote, ResultadoImportacion } from '../../../shared/api/types';
import type { TipoCarga } from './machotes';

export const cargasApi = {
  /** confirmar=false: solo valida (vista previa); confirmar=true: aplica si no hay errores (todo o nada). */
  importar: (
    tipo: TipoCarga,
    filas: FilaMachote[],
    confirmar: boolean,
  ): Promise<ResultadoImportacion> =>
    tipo === 'usuarios'
      ? backend.importarUsuarios(filas, confirmar)
      : backend.importarActivos(filas, confirmar),
};
