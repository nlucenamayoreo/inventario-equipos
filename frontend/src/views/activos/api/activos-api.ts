import { backend } from '../../../shared/api/backend';
import type { EstadoSinTitular, Opts } from '../../../shared/api/client';
import type { Id, NuevoActivo, NuevoArticulo } from '../../../shared/api/types';

export const activosApi = {
  crear: (datos: NuevoActivo) => backend.crearActivo(datos),
  crearArticulo: (datos: NuevoArticulo) => backend.crearArticulo(datos),
  liberar: (id: Id) => backend.liberarActivo(id),
  cambiarEstado: (id: Id, estado: EstadoSinTitular) => backend.cambiarEstadoActivo(id, estado),
  movimientos: (id: Id, opts?: Opts) => backend.movimientos(id, opts),
};
