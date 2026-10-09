import type { Opts } from '../../../shared/api/client';
import { backend } from '../../../shared/api/backend';
import type { EstadoReasignacion, Id, NuevaReasignacion } from '../../../shared/api/types';

export const reasignacionesApi = {
  listar: (estado?: EstadoReasignacion, opts?: Opts) => backend.reasignaciones(estado, opts),
  solicitar: (datos: NuevaReasignacion) => backend.solicitarReasignacion(datos),
  aprobar: (id: Id, comentario: string | null) => backend.aprobarReasignacion(id, comentario),
  rechazar: (id: Id, comentario: string) => backend.rechazarReasignacion(id, comentario),
  cancelar: (id: Id) => backend.cancelarReasignacion(id),
};
