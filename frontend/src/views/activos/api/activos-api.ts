import { backend } from '../../../shared/api/backend';
import type { EstadoSinTitular, Opts } from '../../../shared/api/client';
import type { Id, NuevoActivo, NuevoArticulo } from '../../../shared/api/types';

export const activosApi = {
  crear: (datos: NuevoActivo) => backend.crearActivo(datos),
  crearArticulo: (datos: NuevoArticulo) => backend.crearArticulo(datos),
  liberar: (id: Id, custodioId: Id | null) => backend.liberarActivo(id, custodioId),
  cambiarEstado: (id: Id, estado: EstadoSinTitular, custodioId: Id | null) =>
    backend.cambiarEstadoActivo(id, estado, custodioId),
  movimientos: (id: Id, opts?: Opts) => backend.movimientos(id, opts),
};
